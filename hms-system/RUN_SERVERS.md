# How to Run HMS Backend and Portals

## Summary of stability fixes applied

- **Database:** Safe connection close – SQLite connections are closed after each request; the shared PostgreSQL connection is never closed (avoids crashes and "connection closed" errors).
- **SocketIO:** Switched from `eventlet` to `threading` to avoid green-thread issues with DB and WhatsApp requests that could cause server crashes.
- **Startup:** `init_db()` uses a safe schema path and no longer calls undefined `_get_sqlite_conn()`; startup errors are caught and logged.
- **Production run:** `socketio.run(..., allow_unsafe_werkzeug=True)` so the server can run when `FLASK_DEBUG=0`.

## Run order

### 1. Backend (API + WebSockets)

```bash
cd hms-system/backend
python3 app.py
```

- Listens on **http://0.0.0.0:5000**
- Health: **http://localhost:5000/api/health**

### 2. Staff portal

```bash
cd hms-system/staff-portal
npm run dev
```

- **http://localhost:5174**
- Proxies `/api` to the backend

### 3. Patient portal

```bash
cd app
npm run dev
```

- **http://localhost:5173**
- Proxies `/api` to the backend

## Ports

| Service        | Port |
|----------------|------|
| Backend API    | 5000 |
| Patient portal | 5173 |
| Staff portal   | 5174 |

## Optional env (backend `.env`)

- `FLASK_DEBUG=1` – enable Flask debug/reloader (development).
- `PORT=5000` – backend port (default 5000).
- `DATABASE_URL` – if set, use PostgreSQL instead of SQLite.
