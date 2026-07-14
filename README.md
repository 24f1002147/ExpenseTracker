# Expense Tracker

A basic full-stack expense tracking application built with **Flask, SQLAlchemy,
Flask-Security-Too** on the backend and **VueJS + Axios** on the frontend.
Users can register, log in, and manage (create/read/update/delete) their personal
expenses through a token-authenticated REST API.

No optional components (Celery/Redis) are used — this is a synchronous app.

## Features

- **User authentication** — registration and login powered by Flask-Security-Too
- **Token-based authentication** — every API request after login is authorized with an
  `Authentication-Token` header (no cookies/sessions required)
- **RESTful API** — clean, resource-based endpoints for expenses
- **Full CRUD** — create, list, view, update, and delete expenses
- **Per-user data isolation** — each user only ever sees their own expenses
- **Category filtering + spend summary** endpoint
- **VueJS 3 + Axios frontend** — single-page app (login/register/dashboard) that talks
  to the API

## Tech Stack

| Layer     | Technology                                   |
|-----------|-----------------------------------------------|
| Backend   | Flask, Flask-SQLAlchemy, Flask-Security-Too, Flask-CORS |
| Database  | SQLite (default, swappable via `DATABASE_URL`) |
| Frontend  | Vue 3 (CDN build), Axios                      |

## Project Structure

```
expense-tracker/
├── backend/
│   ├── app.py            # App factory, security setup, entry point
│   ├── config.py         # App + Flask-Security configuration
│   ├── models.py         # User, Role, Expense SQLAlchemy models
│   ├── routes.py         # Expense CRUD REST API (blueprint)
│   └── requirements.txt
└── frontend/
    ├── index.html         # Entry HTML (loads Vue + Axios from CDN)
    ├── app.js             # Vue app: login/register/dashboard + API calls
    └── style.css
```

## Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# (Optional) set your own secrets instead of the dev defaults in config.py
export SECRET_KEY="change-me"
export SECURITY_PASSWORD_SALT="change-me-too"

python app.py
```

The API will start on `http://localhost:5000`.

The database (`expense_tracker.db`) and tables are created automatically on
first run — there is no separate migration step needed for this basic app.

### Frontend

The frontend has no build step — it's a static Vue 3 app loaded via CDN.

```bash
cd frontend
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser. Make sure the backend is
running on `http://localhost:5000` (see `API_BASE_URL` in `app.js` if you need
to change this).

## API Documentation

All endpoints (except `/register` and `/login`) require the header:

```
Authentication-Token: <token received at login>
```

### Auth (provided by Flask-Security-Too)

| Method | Endpoint    | Body                                             | Description                          |
|--------|-------------|---------------------------------------------------|---------------------------------------|
| POST   | `/register` | `{ "email": "", "password": "", "password_confirm": "" }` | Create a new user                    |
| POST   | `/login`    | `{ "email": "", "password": "" }`                 | Log in, returns `authentication_token`|
| GET    | `/logout`   | —                                                   | Invalidate the current session/token  |

Example login response:
```json
{
  "response": {
    "user": {
      "email": "user@example.com",
      "authentication_token": "eyJhbGciOi..."
    }
  }
}
```

### Expenses

| Method | Endpoint                | Description                                  |
|--------|--------------------------|-----------------------------------------------|
| GET    | `/api/expenses`          | List the logged-in user's expenses. Optional query params: `category`, `start`, `end` (YYYY-MM-DD) |
| GET    | `/api/expenses/<id>`     | Get a single expense                          |
| POST   | `/api/expenses`          | Create an expense                             |
| PUT    | `/api/expenses/<id>`     | Update an expense                             |
| DELETE | `/api/expenses/<id>`     | Delete an expense                             |
| GET    | `/api/expenses/summary`  | Total spend grouped by category               |

**Expense object**
```json
{
  "id": 1,
  "title": "Groceries",
  "amount": 42.50,
  "category": "Food",
  "date": "2026-07-14",
  "notes": "Weekly shop",
  "created_at": "2026-07-14T10:00:00",
  "updated_at": "2026-07-14T10:00:00"
}
```

Create/update request body only needs `title` and `amount`; `category`,
`date`, and `notes` are optional.
