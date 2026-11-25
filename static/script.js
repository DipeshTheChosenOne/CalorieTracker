const DAILY_GOAL = 2000;

// ── Load meals on page load ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadMeals();
  loadSummary();
});

// ── Form submit ─────────────────────────────────────
document.getElementById("mealForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const foodName = document.getElementById("foodName").value.trim();
  const calories = document.getElementById("calories").value;
  const mealType = document.getElementById("mealType").value;

  if (!foodName || !calories) return;

  const res = await fetch("/api/meals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      food_name: foodName,
      calories: parseInt(calories),
      meal_type: mealType,
    }),
  });

  if (res.ok) {
    document.getElementById("mealForm").reset();
    loadMeals();
    loadSummary();
  }
});

// ── Fetch and display meals ─────────────────────────
async function loadMeals() {
  const res = await fetch("/api/meals");
  const meals = await res.json();
  const container = document.getElementById("meals");

  if (meals.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No meals logged yet. Start adding!</p>';
    return;
  }

  const mealTypeEmoji = {
    breakfast: "🌅",
    lunch: "☀️",
    dinner: "🌙",
    snack: "🍿",
  };

  container.innerHTML = meals
    .map(
      (meal) => `
        <div class="meal-item">
            <div class="meal-info">
                <h3>${meal.food_name}</h3>
                <span>${mealTypeEmoji[meal.meal_type] || ""} ${meal.meal_type}</span>
            </div>
            <span class="meal-calories">${meal.calories} cal</span>
            <button class="delete-btn" onclick="deleteMeal(${meal.id})">✕</button>
        </div>
    `
    )
    .join("");
}

// ── Fetch and display summary ───────────────────────
async function loadSummary() {
  const res = await fetch("/api/summary");
  const data = await res.json();

  document.getElementById("totalCalories").textContent = data.total_calories;
  document.getElementById("mealCount").textContent = data.meal_count;

  const remaining = Math.max(0, DAILY_GOAL - data.total_calories);
  document.getElementById("remaining").textContent = remaining;
}

// ── Delete a meal ───────────────────────────────────
async function deleteMeal(id) {
  const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
  if (res.ok) {
    loadMeals();
    loadSummary();
  }
}
