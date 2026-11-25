# 🔥 CalorieTracker

A simple full-stack web application to track daily calorie intake.

**BCA 5th Semester — Minor Project**

## Features

- ➕ Add meals with food name, calorie count, and meal type
- 📋 View all meals logged today
- 📊 See daily calorie summary (total, count, remaining)
- 🗑️ Delete meals
- 📱 Fully responsive design (works on mobile)

## Tech Stack

| Layer      | Technology         |
|------------|--------------------|
| Frontend   | HTML, CSS, JavaScript |
| Backend    | Python, Flask      |
| Database   | SQLite             |
| Deployment | Render.com         |

## How to Run Locally

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open in browser
# http://localhost:5000
```

## API Endpoints

| Method | Endpoint            | Description            |
|--------|---------------------|------------------------|
| GET    | `/api/meals`        | Get today's meals      |
| POST   | `/api/meals`        | Add a new meal         |
| DELETE | `/api/meals/<id>`   | Delete a meal          |
| GET    | `/api/summary`      | Get today's calorie summary |

## Project Structure

```
calorie-tracker/
├── app.py                 # Flask backend + API routes
├── requirements.txt       # Python dependencies
├── Procfile               # Deployment config
├── templates/
│   └── index.html         # Main HTML page
├── static/
│   ├── style.css          # Styling
│   └── script.js          # Frontend logic
└── README.md
```

## Deployment

Deployed live on Render: _[link will be added after deploy]_
