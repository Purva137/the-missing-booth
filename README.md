# 📸 The Missing Booth

> The photobooth that was always missing from every hangout.

So here's the thing — I have a girl gang of 4, and I'd already promised them I'd make something fun for us. No pressure, right? So I sat down and built this: a virtual photobooth that actually feels like a real one. Solo strips, squad strips, frames, stickers, captions — the whole deal.

It started as a "I have to make SOMETHING" project and turned into something I'm actually really proud of. Cute little app for a cute little gang. But honestly? Anyone can use it. Bring your friends, bring your situationship, bring your family at a wedding — it fits all.

**Live app → [the-missing-booth.vercel.app](https://the-missing-booth.vercel.app)**

---

## ✨ What you can do

- **Solo Booth** — just you, your camera, and a photo strip that's all yours
- **Squad Booth** — create a room, share the code, everyone joins and shoots together
- **Frame selection** — pick the vibe that matches the moment
- **Sticker addition** — because plain photos are boring
- **Custom captions** — say what you want to say
- **Real-time rooms** — your squad joins live, no waiting around

---

## 🛠 Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind, Framer Motion |
| Backend | FastAPI, Python, Socket.IO |
| Storage | Redis |
| Image processing | Pillow |
| Frontend deploy | Vercel |
| Backend deploy | Render |

---

## 🚀 Run it locally

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local  # add your backend URL
npm run dev
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # add your Redis URL etc.
uvicorn app.main:app --reload
```

---

## 🔐 Environment variables

**Frontend** (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Backend** (`backend/.env`)
```
REDIS_URL=redis://localhost:6379
APP_NAME=The Missing Booth
FRONTEND_URL=http://localhost:3000
```

---

## 💌 Why this exists

Honestly? I promised my girls I'd build them something. So I did.
But it's for everyone — any squad, any occasion, any vibe.

Made with love (and mild sleep deprivation) by [Purva](https://github.com/Purva137) 🎞️
