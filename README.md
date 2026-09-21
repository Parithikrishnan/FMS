# FMS – Financial Monitoring System

A small fraud-monitoring demo: a **Flask + PostgreSQL** backend that turns banking events into alerts and
cases, and a **plain HTML / CSS / JavaScript** frontend (no build step) that shows them.

```
backend/    Flask REST API (Flask-RESTX, SQLAlchemy) · Swagger UI at /api/docs
frontend/   Static pages: Dashboard, Transactions, Alerts
```

## How they are linked

```
                          ┌─ /        static files from  frontend/
 browser ──► nginx :80 ───┤
                          └─ /api/    proxied to Flask :5000 ──► PostgreSQL
```

- The frontend calls the API at **`/api`** (same origin, so no CORS). Every call goes through one file,
  [frontend/js/api.js](frontend/js/api.js); the base URL is set in [frontend/js/config.js](frontend/js/config.js).
- The header shows **Backend connected / offline**, checked live against `GET /api/health`.
- Data flow: the banking app posts `POST /api/events` → the backend checks its fraud rule → raises an **alert**
  → opens a **case** → the frontend displays the alert and transaction. (Cases and findings live in the backend
  API only; the frontend has no Cases, Investigation or Settings pages.)

## Run it (Docker)

```bash
cd backend
docker compose up --build
```

Open **http://localhost** (set `FMS_PORT=8080` to use another port). Swagger UI: http://localhost/api/docs.
The first start creates the tables and seeds demo data: 10 transactions, of which **TXN-10045** was changed from
₹10,000 to ₹50,000 by `banktest` → **ALERT-1001** (Critical) → **CASE-1001**.

## Run it without Docker (SQLite)

```bash
# 1. backend  → http://localhost:5000
cd backend
python3.12 -m venv .venv && source .venv/bin/activate     # Python 3.12 (psycopg2-binary 2.9.9 has no 3.13 wheel)
pip install -r requirements.txt
DATABASE_URL=sqlite:///fms.db CORS_ORIGINS=http://localhost:5500 python app.py
# Or directly via uvicorn:
# DATABASE_URL=sqlite:///fms.db CORS_ORIGINS=http://localhost:5500 uvicorn app:asgi_app --host 0.0.0.0 --port 5000 --reload


# 2. frontend → http://localhost:5500
#    first set   window.FMS_API_BASE = 'http://localhost:5000/api';   in frontend/js/config.js
cd frontend && python3 -m http.server 5500
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness |
| GET | `/api/dashboard` | critical alerts, open cases, transactions today, suspicious transactions |
| GET | `/api/transactions` `/{id}` | list (`?status=`, `limit`, `offset`) · detail with modification history |
| GET | `/api/alerts` `/{id}` | list (`?status=`, `severity=`, `transaction_id=`) · detail |
| GET | `/api/cases` `/{id}` | list (`?status=`, `transaction_id=`) · detail with alert, transaction, findings |
| POST | `/api/cases/{id}/findings` | record a finding `{title, description?, status?}` |
| POST | `/api/events` | banking "amount modified" event → alert → case |

Full schema and a try-it console: `/api/docs`.

## Demo walkthrough

1. **Dashboard** – Critical Alerts = 1.
2. Open **ALERT-1001** on the **Alerts** page to see its description and transaction.
3. **Transactions** page: TXN-10045 modified, ₹10,000 → ₹50,000, with its audit trail.
4. To raise a new alert live, `POST /api/events` (try it in Swagger UI at `/api/docs`).

## Notes

- Added to the backend for the frontend: `POST /api/cases/{id}/findings`, and a one-line fix so a transaction's
  audit trail lists the modification before the alert it triggered.
- `frontend/` pages: `index.html` (dashboard) at the root, the rest in `frontend/html/`. Links built in JavaScript
  go through `pageHref()` in `frontend/js/components.js`.
- The light/dark theme toggle is in the header and is stored in the browser only.
