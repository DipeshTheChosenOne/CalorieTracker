const DAILY_GOAL = 2000;
let allMeals = [];
let activeFilter = "all";
let pendingDeleteMeal = null;

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initThemeToggle();
  initHeroButton();
  initFilterControls();
  initConfirmDialog();
  setTodayDateLabel();
  loadMeals();
  loadSummary();
});

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  const update = () => {
    if (window.scrollY > 0) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggle");
  toggleBtn.addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem("chaiui-theme", isDark ? "dark" : "light");
    } catch (e) {}
  });
}

function initHeroButton() {
  const heroBtn = document.getElementById("heroLogBtn");
  heroBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const foodInput = document.getElementById("foodName");
    document.getElementById("logSection").scrollIntoView();
    setTimeout(() => foodInput.focus(), 150);
  });
}

function initFilterControls() {
  const buttons = document.querySelectorAll("#mealFilter .seg-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderMeals();
    });
  });
}

function setTodayDateLabel() {
  const el = document.getElementById("todayDateLabel");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

document.getElementById("mealForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const foodNameEl = document.getElementById("foodName");
  const caloriesEl = document.getElementById("calories");
  const mealTypeEl = document.getElementById("mealType");
  const hintEl = document.getElementById("formHint");

  const foodName = foodNameEl.value.trim();
  const calories = parseInt(caloriesEl.value, 10);
  const mealType = mealTypeEl.value;

  if (!foodName || !calories || calories < 1) {
    hintEl.textContent = "Enter a valid food name and calorie amount.";
    hintEl.className = "form-hint is-error";
    return;
  }

  try {
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        food_name: foodName,
        calories: calories,
        meal_type: mealType,
      }),
    });

    if (res.ok) {
      document.getElementById("mealForm").reset();
      hintEl.textContent = `Added "${foodName}" (${calories} kcal).`;
      hintEl.className = "form-hint is-success";
      await Promise.all([loadMeals(), loadSummary()]);
    } else {
      hintEl.textContent = "Could not save meal. Please try again.";
      hintEl.className = "form-hint is-error";
    }
  } catch (err) {
    hintEl.textContent = "Network error while saving meal.";
    hintEl.className = "form-hint is-error";
  }
});

async function loadMeals() {
  const res = await fetch("/api/meals");
  allMeals = await res.json();
  renderMeals();
}

function renderMeals() {
  const container = document.getElementById("meals");
  const countEl = document.getElementById("visibleCount");
  const nounEl = document.getElementById("visibleNoun");

  const filtered =
    activeFilter === "all"
      ? allMeals
      : allMeals.filter((m) => m.meal_type === activeFilter);

  countEl.textContent = filtered.length;
  nounEl.textContent = filtered.length === 1 ? "meal" : "meals";

  if (filtered.length === 0) {
    container.innerHTML =
      activeFilter === "all"
        ? '<p class="empty-state">No meals logged yet. Add your first meal above.</p>'
        : `<p class="empty-state">No ${escapeHtml(activeFilter)} entries logged today.</p>`;
    return;
  }

  container.innerHTML = "";
  filtered.forEach((meal) => {
    const row = document.createElement("div");
    row.className = "meal-item";

    const info = document.createElement("div");
    info.className = "meal-info";

    const title = document.createElement("h3");
    title.textContent = meal.food_name;

    const chip = document.createElement("span");
    chip.className = "meal-chip";
    chip.textContent = meal.meal_type;

    info.appendChild(title);
    info.appendChild(chip);

    const right = document.createElement("div");
    right.className = "meal-right";

    const cals = document.createElement("span");
    cals.className = "meal-calories";
    cals.textContent = `${meal.calories} kcal`;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn-delete";
    delBtn.setAttribute("aria-label", `Delete ${meal.food_name}`);
    delBtn.title = `Delete ${meal.food_name}`;
    delBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
    `;
    delBtn.addEventListener("click", () => openConfirmDialog(meal));

    right.appendChild(cals);
    right.appendChild(delBtn);

    row.appendChild(info);
    row.appendChild(right);
    container.appendChild(row);
  });
}

async function loadSummary() {
  const res = await fetch("/api/summary");
  const data = await res.json();

  const total = data.total_calories || 0;
  const count = data.meal_count || 0;
  const remaining = Math.max(0, DAILY_GOAL - total);
  const pct = Math.min(100, Math.round((total / DAILY_GOAL) * 100));

  document.getElementById("totalCalories").textContent = total.toLocaleString();
  document.getElementById("mealCount").textContent = count;
  document.getElementById("remaining").textContent = remaining.toLocaleString();
  document.getElementById("calorieProgress").style.width = `${pct}%`;
  document.getElementById("goalMeta").textContent = `${pct}% of 2,000 kcal goal`;

  const mealMeta = document.getElementById("mealMeta");
  if (count === 0) {
    mealMeta.textContent = "Ready for your first entry";
  } else if (count === 1) {
    mealMeta.textContent = "1 entry recorded today";
  } else {
    mealMeta.textContent = `${count} entries recorded today`;
  }

  const statusText = document.getElementById("statusText");
  if (total > DAILY_GOAL) {
    const over = total - DAILY_GOAL;
    statusText.textContent = `${over.toLocaleString()} kcal over daily target`;
    statusText.dataset.tone = "over";
  } else if (total >= DAILY_GOAL * 0.85) {
    statusText.textContent = "Close to daily target";
    statusText.dataset.tone = "warn";
  } else {
    statusText.textContent = "Within daily budget";
    statusText.dataset.tone = "good";
  }
}

function initConfirmDialog() {
  const overlay = document.getElementById("confirmOverlay");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  cancelBtn.addEventListener("click", closeConfirmDialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeConfirmDialog();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) {
      closeConfirmDialog();
    }
  });
  confirmBtn.addEventListener("click", async () => {
    if (!pendingDeleteMeal) return;
    const id = pendingDeleteMeal.id;
    closeConfirmDialog();
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
    if (res.ok) {
      await Promise.all([loadMeals(), loadSummary()]);
    }
  });
}

function openConfirmDialog(meal) {
  pendingDeleteMeal = meal;
  document.getElementById("confirmFoodName").textContent = meal.food_name;
  document.getElementById("confirmOverlay").hidden = false;
  // Focus starts on the safe button per ChaiUI confirm-dialog rules
  document.getElementById("cancelDeleteBtn").focus();
}

function closeConfirmDialog() {
  pendingDeleteMeal = null;
  document.getElementById("confirmOverlay").hidden = true;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
