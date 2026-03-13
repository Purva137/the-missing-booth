# 📸 The Missing Booth

> The photobooth that was always missing from every hangout.

So here's the thing — I have a girl gang of 4, and I'd already promised them I'd make something fun for us. No pressure, right? So I sat down and built this: a virtual photobooth that actually feels like a real one. Solo strips, squad strips, frames, stickers, captions — the whole deal.

It started as a "I have to make SOMETHING" project and turned into something I'm actually really proud of. Also — we're 4 friends living far apart with literally zero photos together, so I built us a place where distance doesn't matter. Cute little app for a cute little gang. But anyone can use it — bring your friends, your family, whoever.

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

But there's a second reason too — we're a gang of 4 and we all live far away from each other. We don't meet often, and because of that we barely have any photos together. Like, zero. So I built us a place where distance doesn't matter and we can still have our photobooth moment, together.

It's for everyone though — any squad, any occasion, any vibe.

Made with love (and mild sleep deprivation) by [Purva](https://github.com/Purva137) 🎞️
