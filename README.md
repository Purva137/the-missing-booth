# The Missing Booth 📸

A virtual photobooth app — create solo or squad photo strips with themed frames.

**Live demo:** https://the-missing-booth.vercel.app

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Socket.IO client
- **Backend:** FastAPI, Python 3.10, Redis, Pillow, python-socketio
- **Realtime:** Socket.IO (rooms, live photo sync, generation progress)

## Running Locally

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Runs on http://localhost:3000

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # then fill in values
uvicorn app.main:app --reload
```

Runs on http://localhost:8000

Redis is required. The backend will attempt to start a Docker Redis container automatically, or you can run it manually:

```bash
docker run -d -p 6379:6379 redis:alpine
```

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend HTTP base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket base URL | `ws://localhost:8000` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `APP_NAME` | Application name | `The Missing Booth` |
| `FRONTEND_URL` | Frontend origin (for CORS) | `http://localhost:3000` |

## Project Structure

```
themissingbooth/
├── frontend/          # Next.js 14 app
│   ├── src/
│   │   ├── app/       # Pages (/, /create, /join, /room/[code])
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/       # API client, store
│   └── next.config.js
└── backend/           # FastAPI app
    ├── app/
    │   ├── main.py    # App entry + Socket.IO
    │   ├── routers/   # rooms, uploads, generate
    │   └── services/  # room, storage, strip
    ├── requirements.txt
    └── Dockerfile
```
