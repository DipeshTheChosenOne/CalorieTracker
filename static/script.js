const DAILY_GOAL = parseInt(document.body.dataset.dailyGoal || "2000", 10);
const TODAY_ISO = getLocalIsoDate();
let selectedDate = TODAY_ISO;
let allMeals = [];
let activeFilter = "all";
let pendingDeleteMeal = null;

function getLocalIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initThemeToggle();
  initHeroButton();
  initDateSelector();
  initFilterControls();
  initConfirmDialog();
  refreshAllData();
});

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 0);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggle");
  toggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
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

function initDateSelector() {
  const dateInput = document.getElementById("selectedDateInput");
  if (!dateInput) return;
  dateInput.value = selectedDate;
  dateInput.max = TODAY_ISO;
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    selectDate(dateInput.value);
  });
}

function selectDate(isoDate) {
  selectedDate = isoDate;
  const dateInput = document.getElementById("selectedDateInput");
  if (dateInput) dateInput.value = isoDate;
  refreshAllData();
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

function formatReadableDate(iso) {
  if (iso === TODAY_ISO) return "Today";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

async function refreshAllData() {
  updateDateLabels();
  await Promise.all([loadMeals(), loadSummary(), loadHistory()]);
}

function updateDateLabels() {
  const readable = formatReadableDate(selectedDate);
  const labelEl = document.getElementById("todayDateLabel");
  const chipEl = document.getElementById("selectedDayChip");
  const titleEl = document.getElementById("mealsSectionTitle");
  const calLabelEl = document.getElementById("summaryCaloriesLabel");

  if (labelEl) labelEl.textContent = readable;
  if (chipEl) chipEl.textContent = selectedDate === TODAY_ISO ? "today" : formatShortDate(selectedDate);
  if (titleEl) {
    titleEl.textContent = selectedDate === TODAY_ISO ? "Today's meals" : `Meals on ${readable}`;
  }
  if (calLabelEl) {
    calLabelEl.textContent = selectedDate === TODAY_ISO ? "Calories today" : `Calories (${formatShortDate(selectedDate)})`;
  }
}

document.getElementById("mealForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const foodNameEl = document.getElementById("foodName");
  const caloriesEl = document.getElementById("calories");
  const proteinEl = document.getElementById("protein");
  const mealTypeEl = document.getElementById("mealType");
  const hintEl = document.getElementById("formHint");

  const foodName = foodNameEl.value.trim();
  const calories = parseInt(caloriesEl.value, 10);
  const protein = parseInt(proteinEl ? proteinEl.value : "0", 10) || 0;
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
        protein: Math.max(0, protein),
        meal_type: mealType,
        date: selectedDate,
      }),
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (res.ok) {
      document.getElementById("mealForm").reset();
      hintEl.textContent = `Added "${foodName}" (${calories} kcal, ${Math.max(0, protein)}g protein) for ${formatReadableDate(selectedDate)}.`;
      hintEl.className = "form-hint is-success";
      await refreshAllData();
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
  const res = await fetch(`/api/meals?date=${encodeURIComponent(selectedDate)}`);
  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }
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
        ? '<p class="empty-state">No meals logged for this day yet. Add an entry above.</p>'
        : `<p class="empty-state">No ${escapeHtml(activeFilter)} entries logged for this day.</p>`;
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

    const prot = document.createElement("span");
    prot.className = "meal-protein";
    prot.textContent = `${meal.protein || 0}g protein`;

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

    right.appendChild(prot);
    right.appendChild(cals);
    right.appendChild(delBtn);

    row.appendChild(info);
    row.appendChild(right);
    container.appendChild(row);
  });
}

async function loadSummary() {
  const res = await fetch(`/api/summary?date=${encodeURIComponent(selectedDate)}`);
  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }
  const data = await res.json();

  const total = data.total_calories || 0;
  const totalProtein = data.total_protein || 0;
  const count = data.meal_count || 0;
  const goal = data.daily_goal || DAILY_GOAL;
  const remaining = Math.max(0, goal - total);
  const pct = Math.min(100, Math.round((total / goal) * 100));

  document.getElementById("totalCalories").textContent = total.toLocaleString();
  const protEl = document.getElementById("totalProtein");
  if (protEl) protEl.textContent = `${totalProtein.toLocaleString()}g`;
  document.getElementById("mealCount").textContent = count;
  document.getElementById("remaining").textContent = remaining.toLocaleString();
  document.getElementById("calorieProgress").style.width = `${pct}%`;
  document.getElementById("goalMeta").textContent = `${pct}% of ${goal.toLocaleString()} kcal goal`;

  const mealMeta = document.getElementById("mealMeta");
  if (count === 0) {
    mealMeta.textContent = "Ready for your first entry";
  } else if (count === 1) {
    mealMeta.textContent = "1 entry recorded";
  } else {
    mealMeta.textContent = `${count} entries recorded`;
  }

  const statusText = document.getElementById("statusText");
  if (total > goal) {
    const over = total - goal;
    statusText.textContent = `${over.toLocaleString()} kcal over daily target`;
    statusText.dataset.tone = "over";
  } else if (total >= goal * 0.85) {
    statusText.textContent = "Close to daily target";
    statusText.dataset.tone = "warn";
  } else {
    statusText.textContent = "Within daily budget";
    statusText.dataset.tone = "good";
  }
}

async function loadHistory() {
  const res = await fetch("/api/history");
  if (res.status === 401) return;
  const data = await res.json();
  renderHistoryChart(data.days || [], data.daily_goal || DAILY_GOAL);
}

function renderHistoryChart(days, goal) {
  const chartEl = document.getElementById("calorieChart");
  const listEl = document.getElementById("historyList");
  const countEl = document.getElementById("daysTrackedCount");
  const avgEl = document.getElementById("avgCalories");

  if (!chartEl || !listEl) return;

  const totalDays = days.length;
  const loggedDays = days.filter((d) => d.meal_count > 0);
  const totalSum = loggedDays.reduce((acc, d) => acc + d.total_calories, 0);
  const avg = loggedDays.length > 0 ? Math.round(totalSum / loggedDays.length) : 0;

  if (countEl) countEl.textContent = totalDays;
  if (avgEl) avgEl.textContent = `${avg.toLocaleString()} kcal`;

  const maxCal = Math.max(goal, ...days.map((d) => d.total_calories), 500);
  const goalPct = Math.min(100, Math.round((goal / maxCal) * 100));

  chartEl.innerHTML = "";
  const goalLine = document.createElement("div");
  goalLine.className = "goal-line";
  goalLine.style.bottom = `calc(1.9rem + ${goalPct * 0.85 * 0.085}rem)`;
  const goalLabel = document.createElement("span");
  goalLabel.className = "goal-line-label";
  goalLabel.textContent = `Goal ${goal.toLocaleString()}`;
  goalLine.appendChild(goalLabel);
  chartEl.appendChild(goalLine);

  days.forEach((day) => {
    const col = document.createElement("button");
    col.type = "button";
    col.className = "bar-col" + (day.date === selectedDate ? " is-selected" : "");
    col.title = `${day.date}: ${day.total_calories} kcal (${day.meal_count} meals)`;
    col.addEventListener("click", () => selectDate(day.date));

    const val = document.createElement("span");
    val.className = "bar-value";
    val.textContent = day.total_calories > 0 ? day.total_calories : "0";

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    const hPct = day.total_calories > 0 ? Math.max(6, Math.round((day.total_calories / maxCal) * 100)) : 3;
    fill.style.height = `${hPct}%`;
    track.appendChild(fill);

    const lbl = document.createElement("span");
    lbl.className = "bar-date";
    lbl.textContent = day.date === TODAY_ISO ? "Today" : formatShortDate(day.date);

    col.appendChild(val);
    col.appendChild(track);
    col.appendChild(lbl);
    chartEl.appendChild(col);
  });

  // Render reverse-chronological day rows
  listEl.innerHTML = "";
  [...days].reverse().forEach((day) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-row" + (day.date === selectedDate ? " is-selected" : "");
    btn.addEventListener("click", () => selectDate(day.date));

    const left = document.createElement("div");
    left.className = "history-row-left";

    const dateSpan = document.createElement("span");
    dateSpan.className = "history-date";
    dateSpan.textContent = day.date === TODAY_ISO ? `${day.date} (Today)` : day.date;

    const mealsSpan = document.createElement("span");
    mealsSpan.className = "history-meals";
    mealsSpan.textContent = `${day.meal_count} ${day.meal_count === 1 ? "meal" : "meals"}`;

    left.appendChild(dateSpan);
    left.appendChild(mealsSpan);

    const right = document.createElement("div");
    right.className = "history-row-right";

    const kcalSpan = document.createElement("span");
    kcalSpan.className = "history-kcal";
    kcalSpan.textContent = `${day.total_calories.toLocaleString()} kcal`;

    const status = document.createElement("span");
    status.className = "status-text";
    if (day.total_calories === 0) {
      status.textContent = "No entries";
      status.style.color = "var(--muted-foreground)";
    } else if (day.total_calories > goal) {
      status.textContent = "Over";
      status.dataset.tone = "over";
    } else {
      status.textContent = "On track";
      status.dataset.tone = "good";
    }

    right.appendChild(kcalSpan);
    right.appendChild(status);

    btn.appendChild(left);
    btn.appendChild(right);
    listEl.appendChild(btn);
  });
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
      await refreshAllData();
    }
  });
}

function openConfirmDialog(meal) {
  pendingDeleteMeal = meal;
  document.getElementById("confirmFoodName").textContent = meal.food_name;
  document.getElementById("confirmOverlay").hidden = false;
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
