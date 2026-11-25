# QuickCals (CalorieTracker)

A minimal full-stack web application to track daily calorie intake, styled with the ChaiUI design system (`https://ui.chaicode.com`).

**BCA 5th Semester, Minor Project**

## Live Demo

- **Live URL:** https://quickcals.onrender.com

## Features

- Add meals with food name, calorie count, and meal type (Breakfast, Lunch, Dinner, Snack)
- View daily summary cards (calories today with progress bar, meals logged, remaining budget)
- Filter today's meals by type using a segmented control
- Delete entries safely with an accessible confirmation dialog
- Dark mode default with persistent light/dark theme toggle
- Responsive layout across desktop and mobile screens

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | HTML5, CSS3 (ChaiUI tokens), Vanilla JS |
| Backend    | Python, Flask                      |
| Database   | SQLite                             |
| Deployment | Render.com (Gunicorn)              |

## How to Run Locally

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open in browser
# http://localhost:5001
```

## API Endpoints

| Method | Endpoint          | Description                 |
|--------|-------------------|-----------------------------|
| GET    | `/api/meals`      | Get today's meals           |
| POST   | `/api/meals`      | Add a new meal              |
| DELETE | `/api/meals/<id>` | Delete a meal               |
| GET    | `/api/summary`    | Get today's calorie summary |

## Project Structure

```
calorie-tracker/
├── app.py                 # Flask backend + SQLite API routes
├── requirements.txt       # Python dependencies
├── Procfile               # Render deployment config
├── templates/
│   └── index.html         # Main HTML page
├── static/
│   ├── background.svg     # ChaiUI hexagon glow backdrop
│   ├── style.css          # ChaiUI tokens & responsive styles
│   └── script.js          # Frontend state, API calls & dialog
└── README.md
```
