import os
import sqlite3
from datetime import date, datetime, timedelta
from functools import wraps
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "quickcals-dev-secret-key-change-in-prod")
DATABASE = os.environ.get("DATABASE_PATH", "calories.db")


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            daily_goal INTEGER NOT NULL DEFAULT 2000,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL DEFAULT 0,
            food_name TEXT NOT NULL,
            calories INTEGER NOT NULL,
            protein INTEGER NOT NULL DEFAULT 0,
            meal_type TEXT NOT NULL,
            date TEXT NOT NULL
        )
    """)

    # Migrate older meals table if user_id or protein column was missing
    cols = [row["name"] for row in conn.execute("PRAGMA table_info(meals)").fetchall()]
    if "user_id" not in cols:
        conn.execute("ALTER TABLE meals ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0")
    if "protein" not in cols:
        conn.execute("ALTER TABLE meals ADD COLUMN protein INTEGER NOT NULL DEFAULT 0")

    conn.commit()
    conn.close()


def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, daily_goal, created_at FROM users WHERE id = ?",
        (uid,),
    ).fetchone()
    conn.close()
    if not user:
        # User session was orphaned or database was reset; clear invalid session
        session.clear()
        return None
    return user


def login_required_api(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ── Auth Pages ─────────────────────────────────────────

@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user():
        return redirect(url_for("index"))

    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")

        conn = get_db()
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        conn.close()

        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("index"))
        error = "Invalid username or password."

    return render_template("auth.html", mode="login", error=error)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if current_user():
        return redirect(url_for("index"))

    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        goal_raw = request.form.get("daily_goal", "2000").strip()

        if len(username) < 3 or len(username) > 24 or " " in username:
            error = "Username must be 3 to 24 characters with no spaces."
        elif len(password) < 4:
            error = "Password must be at least 4 characters."
        else:
            try:
                daily_goal = max(500, min(10000, int(goal_raw or 2000)))
            except ValueError:
                daily_goal = 2000

            today = date.today().isoformat()
            conn = get_db()
            existing = conn.execute(
                "SELECT id FROM users WHERE username = ?", (username,)
            ).fetchone()
            if existing:
                conn.close()
                error = "That username is already taken. Try another one."
            else:
                cur = conn.execute(
                    "INSERT INTO users (username, password_hash, daily_goal, created_at) VALUES (?, ?, ?, ?)",
                    (username, generate_password_hash(password), daily_goal, today),
                )
                conn.commit()
                user_id = cur.lastrowid
                conn.close()
                session["user_id"] = user_id
                session["username"] = username
                return redirect(url_for("index"))

    return render_template("auth.html", mode="signup", error=error)


@app.route("/logout", methods=["POST", "GET"])
def logout():
    session.clear()
    return redirect(url_for("login"))


# ── Main Dashboard Page ────────────────────────────────

@app.route("/")
def index():
    user = current_user()
    if not user:
        return redirect(url_for("login"))
    return render_template(
        "index.html",
        username=user["username"],
        daily_goal=user["daily_goal"],
        joined_date=user["created_at"],
    )


# ── API Endpoints ──────────────────────────────────────

@app.route("/api/meals", methods=["GET"])
@login_required_api
def get_meals():
    """Get all meals for the logged-in user on a given date (defaults to today)."""
    target_date = request.args.get("date") or date.today().isoformat()
    uid = session["user_id"]
    conn = get_db()
    meals = conn.execute(
        "SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY id DESC",
        (uid, target_date),
    ).fetchall()
    conn.close()
    return jsonify([dict(m) for m in meals])


@app.route("/api/meals", methods=["POST"])
@login_required_api
def add_meal():
    """Add a new meal for the logged-in user."""
    data = request.get_json() or {}
    food_name = str(data.get("food_name", "")).strip()
    calories = data.get("calories", 0)
    protein_raw = data.get("protein", 0)
    meal_type = str(data.get("meal_type", "snack")).strip().lower()
    target_date = str(data.get("date") or date.today().isoformat()).strip()

    if not food_name or not calories:
        return jsonify({"error": "Food name and calories are required"}), 400

    try:
        cal_int = int(calories)
        if cal_int < 1:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Calories must be a positive number"}), 400

    try:
        protein_int = max(0, int(protein_raw or 0))
    except (TypeError, ValueError):
        protein_int = 0

    if meal_type not in ("breakfast", "lunch", "dinner", "snack"):
        meal_type = "snack"

    uid = session["user_id"]
    conn = get_db()
    conn.execute(
        "INSERT INTO meals (user_id, food_name, calories, protein, meal_type, date) VALUES (?, ?, ?, ?, ?, ?)",
        (uid, food_name, cal_int, protein_int, meal_type, target_date),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Meal added!"}), 201


@app.route("/api/meals/<int:meal_id>", methods=["DELETE"])
@login_required_api
def delete_meal(meal_id):
    """Delete a meal belonging to the logged-in user."""
    uid = session["user_id"]
    conn = get_db()
    conn.execute("DELETE FROM meals WHERE id = ? AND user_id = ?", (meal_id, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Meal deleted!"})


@app.route("/api/summary", methods=["GET"])
@login_required_api
def get_summary():
    """Get calorie summary for the logged-in user on a given date."""
    target_date = request.args.get("date") or date.today().isoformat()
    uid = session["user_id"]
    conn = get_db()
    result = conn.execute(
        "SELECT COALESCE(SUM(calories), 0) as total, COALESCE(SUM(protein), 0) as total_protein FROM meals WHERE user_id = ? AND date = ?",
        (uid, target_date),
    ).fetchone()
    count = conn.execute(
        "SELECT COUNT(*) as count FROM meals WHERE user_id = ? AND date = ?",
        (uid, target_date),
    ).fetchone()
    user = conn.execute(
        "SELECT daily_goal FROM users WHERE id = ?", (uid,)
    ).fetchone()
    conn.close()
    return jsonify({
        "total_calories": result["total"],
        "total_protein": result["total_protein"],
        "meal_count": count["count"],
        "daily_goal": user["daily_goal"] if user else 2000,
        "date": target_date,
    })


@app.route("/api/history", methods=["GET"])
@login_required_api
def get_history():
    """Return day-by-day calorie totals from the user's start date through today."""
    uid = session["user_id"]
    conn = get_db()
    user = conn.execute(
        "SELECT created_at, daily_goal FROM users WHERE id = ?", (uid,)
    ).fetchone()
    rows = conn.execute(
        """
        SELECT date, COALESCE(SUM(calories), 0) as total_calories, COUNT(*) as meal_count
        FROM meals
        WHERE user_id = ?
        GROUP BY date
        ORDER BY date ASC
        """,
        (uid,),
    ).fetchall()
    conn.close()

    by_date = {
        r["date"]: {"total_calories": r["total_calories"], "meal_count": r["meal_count"]}
        for r in rows
    }

    today_dt = date.today()
    start_str = user["created_at"] if user else today_dt.isoformat()
    try:
        start_dt = datetime.strptime(start_str, "%Y-%m-%d").date()
    except ValueError:
        start_dt = today_dt

    # Include any earlier backfilled meal dates if present
    if rows:
        try:
            earliest_meal_dt = datetime.strptime(rows[0]["date"], "%Y-%m-%d").date()
            if earliest_meal_dt < start_dt:
                start_dt = earliest_meal_dt
        except ValueError:
            pass

    days = []
    cursor = start_dt
    while cursor <= today_dt:
        iso = cursor.isoformat()
        info = by_date.get(iso, {"total_calories": 0, "meal_count": 0})
        days.append({
            "date": iso,
            "total_calories": info["total_calories"],
            "meal_count": info["meal_count"],
        })
        cursor += timedelta(days=1)

    return jsonify({
        "start_date": start_dt.isoformat(),
        "daily_goal": user["daily_goal"] if user else 2000,
        "days": days,
    })


# Ensure database tables exist when run via Gunicorn in production
init_db()

# ── Run ────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5001)
