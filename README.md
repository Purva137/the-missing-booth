# SnapTogether 📸

> AI-powered group photo generator — upload solo photos, get a realistic group image together.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SnapTogether                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Next.js 14  │◄──►│  FastAPI     │◄──►│   RunPod GPU     │  │
│  │  (Frontend)  │    │  (Backend)   │    │  SDXL+ControlNet │  │
│  │  GitHub Pages│    │  Render.com  │    │  IP-Adapter      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────────┘  │
│         │                  │                                    │
│         └────── Socket.io ─┘                                   │
│                 (Real-time rooms)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
snaptogether/
├── frontend/                    # Next.js 14 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── create/          # Create room
│   │   │   ├── join/            # Join room
│   │   │   └── room/[code]/     # Room page
│   │   ├── components/
│   │   │   ├── ui/              # Base UI components
│   │   │   ├── room/            # Room-specific components
│   │   │   ├── upload/          # Photo upload components
│   │   │   └── result/          # Result/export components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # API clients, utils
│   │   └── types/               # TypeScript types
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── backend/                     # FastAPI Python
│   ├── app/
│   │   ├── main.py              # App entry + Socket.io
│   │   ├── routers/
│   │   │   ├── rooms.py         # Room CRUD
│   │   │   ├── uploads.py       # Photo upload
│   │   │   └── generate.py      # AI generation
│   │   ├── services/
│   │   │   ├── room_service.py  # Room logic
│   │   │   ├── storage.py       # File storage
│   │   │   └── runpod.py        # RunPod API client
│   │   └── models/
│   │       └── schemas.py       # Pydantic models
│   ├── ai/
│   │   ├── pipeline.py          # SDXL + ControlNet pipeline
│   │   ├── face_swap.py         # FaceSwap refinement
│   │   └── runpod_handler.py    # RunPod serverless handler
│   ├── requirements.txt
│   └── Dockerfile
│
└── docs/
    ├── DEPLOYMENT.md
    └── API.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- RunPod account (GPU inference)
- Render.com account (backend hosting)

### 1. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your backend URL
npm run dev
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your RunPod API key
uvicorn app.main:app --reload
```

### 3. RunPod Deployment
See `docs/DEPLOYMENT.md` for full GPU setup instructions.

## Features
- 🏠 **Room System** — Create/join rooms with 6-digit codes
- 📸 **Multi-upload** — Up to 10 people upload photos
- 🤖 **AI Generation** — SDXL + ControlNet + IP-Adapter
- 🎭 **Scene Presets** — Birthday, café, beach, graduation, custom
- 🎂 **Birthday Mode** — Auto birthday styling + text overlay
- 📤 **Export** — Instagram post/story, download
- ⚡ **Real-time** — Socket.io live status updates
