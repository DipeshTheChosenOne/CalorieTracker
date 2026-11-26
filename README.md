<div align="center">

# 🥗 QuickCals

**A lightweight, privacy-focused Full-Stack Calorie & Macronutrient Tracker.**  
*Built for daily nutrition tracking with individual user workspaces and interactive day-by-day analytics.*

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Render-46E3B7?style=flat-square&logo=render)](https://quickcals.onrender.com)
[![Python](https://img.shields.io/badge/Backend-Python%20%2F%20Flask-3776AB?style=flat-square&logo=python&logoColor=white)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/Academic-BCA%20Minor%20Project-blueviolet?style=flat-square)](#academic-context)

</div>

---

## 📖 Overview

**QuickCals** is a responsive, web-based daily calorie and macronutrient logging platform designed to help individuals maintain healthy nutrition habits without intrusive ads, bloated features, or complex setups.

Unlike massive enterprise trackers that monetize personal health metrics, QuickCals focuses on speed, clarity, and ease of use:
- Multi-user authentication with individual data partitioning.
- Real-time calorie and protein budget tracking against custom daily targets.
- Interactive historical bar charts mapping every single day since account creation.
- Minimalist, high-contrast dark aesthetic engineered following the **ChaiUI** design principles.

---

## ⚡ Key Features

### 1. 🔐 User Authentication & Workspaces
- Secure user registration and login powered by **Werkzeug cryptographic salted password hashing**.
- Session-based authorization protecting all CRUD API endpoints (`@login_required_api`).
- Each user maintains an isolated workspace (`user_id` foreign key isolation) and customized daily calorie goals.

### 2. 🍲 Meal & Macronutrient Logging
- Record individual food items categorized into **Breakfast**, **Lunch**, **Dinner**, or **Snacks**.
- Track both **Energy (kcal)** and **Protein (grams)** in real time.
- Inline status tags, real-time recalculation of remaining daily allowance, and animated progress bars.

### 3. 📊 Day-by-Day Historical Calorie Chart
- Interactive day-by-day bar chart generated dynamically from the user's registration date up to today.
- Visual **Daily Goal Threshold line** to instantly spot surplus or deficit days.
- Date picker allowing retrospective meal logging and review for past dates.
- Metrics dashboard displaying **Active Days Tracked** and **Daily Average Intake**.

### 4. 🎨 Studio-Grade ChaiUI Aesthetic
- Clean, focused near-black aesthetic (`#0a0a0a`) with warm hairline borders and zero visual clutter.
- Segmented filter controls to filter meals by meal type.
- Accessible destructive actions featuring a customized confirm dialog with focus trapped on the safe choice.
- Fully responsive across mobile (375px+), tablet, and desktop screens.

---

## 🛠️ Tech Stack & Architecture

QuickCals follows a **Decoupled Client-Server RESTful Architecture**:

```
[ Frontend: HTML5 / CSS3 (ChaiUI) / Vanilla JS ]
                     │  ▲
        JSON via     │  │  Async Responses
      Fetch API      ▼  │
 [ Backend: Python / Flask REST API / WSGI Gunicorn ]
                     │  ▲
        Parameterized│  │  Relational Records
        SQL Queries  ▼  │
         [ Database: SQLite3 (calories.db) ]
```

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Interactive single-page feel, client-side data rendering, modal dialogs, responsive CSS Grid/Flexbox |
| **Backend** | Python 3, Flask | HTTP routing, REST API controllers, session validation, password encryption |
| **Database** | SQLite3 | Relational schema storing users, credentials, and meal logs with foreign key mapping |
| **Server / WSGI** | Gunicorn | Production-ready WSGI HTTP server |
| **Deployment** | Render Cloud Platform | Continuous delivery pipeline connected to GitHub branch tracking |

---

## 🗄️ Database Schema

The relational database (`calories.db`) consists of two normalized tables:

### `users` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique user identifier |
| `username` | `TEXT` | `UNIQUE NOT NULL` | Unique account login handle |
| `password_hash` | `TEXT` | `NOT NULL` | Cryptographic salted hash of the password |
| `daily_goal` | `INTEGER` | `NOT NULL DEFAULT 2000` | Target daily calorie consumption in kcal |
| `created_at` | `TEXT` | `NOT NULL` | User registration ISO date (`YYYY-MM-DD`) |

### `meals` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique record ID |
| `user_id` | `INTEGER` | `NOT NULL` | Foreign key referencing `users(id)` |
| `food_name` | `TEXT` | `NOT NULL` | Label of the meal (e.g., "Oats & Milk") |
| `calories` | `INTEGER` | `NOT NULL` | Calorie energy in kcal |
| `protein` | `INTEGER` | `NOT NULL DEFAULT 0` | Protein content in grams |
| `meal_type` | `TEXT` | `NOT NULL` | `breakfast`, `lunch`, `dinner`, or `snack` |
| `date` | `TEXT` | `NOT NULL` | Logged date (`YYYY-MM-DD`) |

---

## 🔌 API Endpoints Reference

All endpoints return JSON responses. Authentication is verified via active session cookies.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Private | Main dashboard view (redirects to `/login` if unauthenticated) |
| `GET / POST` | `/login` | Public | Account authentication & session creation |
| `GET / POST` | `/signup` | Public | New account registration with goal setup |
| `GET` | `/logout` | Public | Session termination |
| `GET` | `/api/meals?date=YYYY-MM-DD` | Private | Returns all logged meals for specified date |
| `POST` | `/api/meals` | Private | Inserts a new meal record (`food_name`, `calories`, `protein`, `meal_type`, `date`) |
| `DELETE` | `/api/meals/<id>` | Private | Deletes specific meal record owned by user |
| `GET` | `/api/summary?date=YYYY-MM-DD` | Private | Returns aggregate calories, protein, and daily goal progress |
| `GET` | `/api/history` | Private | Computes daily calorie totals from registration date to present |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Python 3.9 or higher
- Git

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DipeshTheChosenOne/CalorieTracker.git
   cd CalorieTracker
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On macOS / Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows:
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the local development server:**
   ```bash
   python app.py
   ```

5. **Open in your web browser:**
   ```
   http://127.0.0.1:5001
   ```

---

## 📂 Project Structure

```
CalorieTracker/
├── app.py                 # Core Flask application, DB migrations, and REST controllers
├── requirements.txt       # Project dependencies (Flask, Gunicorn, Werkzeug)
├── Procfile               # Cloud deployment command for WSGI runner
├── README.md              # Project documentation and architectural overview
├── templates/
│   ├── index.html         # User dashboard (Summary, Log Form, Chart, Meal List)
│   └── auth.html          # Clean ChaiUI Login / Registration views
└── static/
    ├── style.css          # ChaiUI design tokens, typography, and responsive styles
    └── script.js          # DOM controllers, Async API fetch, and Chart visualizer
```

---

## 🎓 Academic Context

- **Program:** Bachelor of Computer Applications (BCA)
- **Semester:** 5th Semester
- **Project Type:** Minor Project (Full-Stack Web Development)
- **Author:** Dipesh ([@DipeshTheChosenOne](https://github.com/DipeshTheChosenOne))
- **Live Deployment:** [https://quickcals.onrender.com](https://quickcals.onrender.com)

---

<div align="center">
  <sub>Developed with passion for clean code, responsive design, and health awareness.</sub>
</div>
