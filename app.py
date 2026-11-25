from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import date

app = Flask(__name__)
DATABASE = "calories.db"


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_name TEXT NOT NULL,
            calories INTEGER NOT NULL,
            meal_type TEXT NOT NULL,
            date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# ── Pages ──────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ── API Endpoints ──────────────────────────────────────

@app.route("/api/meals", methods=["GET"])
def get_meals():
    """Get all meals for today."""
    today = date.today().isoformat()
    conn = get_db()
    meals = conn.execute(
        "SELECT * FROM meals WHERE date = ? ORDER BY id DESC", (today,)
    ).fetchall()
    conn.close()
    return jsonify([dict(m) for m in meals])


@app.route("/api/meals", methods=["POST"])
def add_meal():
    """Add a new meal."""
    data = request.get_json()
    food_name = data.get("food_name", "").strip()
    calories = data.get("calories", 0)
    meal_type = data.get("meal_type", "snack")

    if not food_name or not calories:
        return jsonify({"error": "Food name and calories are required"}), 400

    today = date.today().isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO meals (food_name, calories, meal_type, date) VALUES (?, ?, ?, ?)",
        (food_name, int(calories), meal_type, today),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Meal added!"}), 201


@app.route("/api/meals/<int:meal_id>", methods=["DELETE"])
def delete_meal(meal_id):
    """Delete a meal by ID."""
    conn = get_db()
    conn.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Meal deleted!"})


@app.route("/api/summary", methods=["GET"])
def get_summary():
    """Get calorie summary for today."""
    today = date.today().isoformat()
    conn = get_db()
    result = conn.execute(
        "SELECT COALESCE(SUM(calories), 0) as total FROM meals WHERE date = ?",
        (today,),
    ).fetchone()
    count = conn.execute(
        "SELECT COUNT(*) as count FROM meals WHERE date = ?", (today,)
    ).fetchone()
    conn.close()
    return jsonify({"total_calories": result["total"], "meal_count": count["count"]})


# Ensure database table exists when run via Gunicorn in production
init_db()

# ── Run ────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5001)
