import os
import logging
import subprocess
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")

import socketio
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings


# ── Settings ──────────────────────────────────────────────────────────────────

class Settings(BaseSettings):
    APP_NAME: str = "The Missing Booth"
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-change-me"

    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    STORAGE_BACKEND: str = "local"
    LOCAL_UPLOAD_DIR: str = "./uploads"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_CLOUDFRONT_URL: str = ""

    REDIS_URL: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"


settings = Settings()


# ── Redis auto-start ───────────────────────────────────────────────────────────

def _ensure_redis_running():
    try:
        result = subprocess.run(['docker', 'start', 'redis'], capture_output=True, timeout=10)
        if result.returncode == 0:
            print("[Redis] Started existing Docker container 'redis'")
            return True
    except Exception:
        pass
    try:
        result = subprocess.run(
            ['docker', 'run', '-d', '-p', '6379:6379', '--name', 'redis', 'redis:alpine'],
            capture_output=True, timeout=30,
        )
        if result.returncode == 0:
            print("[Redis] Started new Docker container 'redis'")
            return True
    except Exception:
        pass
    print("[Redis] Could not auto-start — ensure Redis is running manually")
    return False


# ── Socket.io ─────────────────────────────────────────────────────────────────

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ, auth=None):
    print(f"[WS] Connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[WS] Disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    room_code = data.get("room_code", "").upper()
    member_id = data.get("member_id", "")
    name      = data.get("name", "")
    if not room_code:
        return
    await sio.enter_room(sid, room_code)
    print(f"[WS] {name} joined room {room_code}")
    await sio.emit(
        "member_joined",
        {"id": member_id, "name": name, "photo_uploaded": False,
         "photos": [], "joined_at": datetime.utcnow().isoformat()},
        room=room_code,
        skip_sid=sid,
    )


@sio.event
async def leave_room(sid, data):
    room_code = data.get("room_code", "").upper()
    member_id = data.get("member_id", "")
    if room_code:
        await sio.leave_room(sid, room_code)
        await sio.emit("member_left", member_id, room=room_code, skip_sid=sid)


@sio.event
async def start_generation(sid, data):
    room_code = data.get("room_code", "").upper()
    print(f"[WS] Generation requested for room {room_code} by {sid}")


@sio.event
async def sticker_added(sid, data):
    """Broadcast a sticker placement to all squad members."""
    room_code = data.get("room_code", "").upper()
    if not room_code:
        return
    await sio.emit(
        "sticker_added",
        {
            "sticker_id": data.get("sticker_id"),
            "emoji": data.get("emoji"),
            "x": data.get("x"),
            "y": data.get("y"),
        },
        room=room_code,
        skip_sid=sid,
    )


@sio.event
async def sticker_cleared(sid, data):
    """Broadcast sticker clear to all squad members."""
    room_code = data.get("room_code", "").upper()
    if not room_code:
        return
    await sio.emit("sticker_cleared", {}, room=room_code, skip_sid=sid)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_redis_running()
    await asyncio.sleep(1)

    from app.services.room_service import RoomService
    from app.services.storage import StorageService
    from app.services.strip_service import StripService

    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

    try:
        await redis.ping()
        print(f"[Redis] Connected OK at {settings.REDIS_URL}")
    except Exception as e:
        print(f"[Redis] ERROR: {e}")

    app.state.redis           = redis
    app.state.sio             = sio
    app.state.room_service    = RoomService(redis)
    app.state.storage_service = StorageService(settings)
    app.state.strip_service   = StripService(upload_dir=settings.LOCAL_UPLOAD_DIR)

    print(f"[App] {settings.APP_NAME} started (env={settings.APP_ENV})")
    yield

    await redis.aclose()
    print("[App] Shutdown complete")


# ── FastAPI app ───────────────────────────────────────────────────────────────

fastapi_app = FastAPI(
    title="The Missing Booth API",
    description="Virtual photobooth strip generator",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(settings.LOCAL_UPLOAD_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

from app.routers import rooms, uploads, generate
fastapi_app.include_router(rooms.router)
fastapi_app.include_router(uploads.router)
fastapi_app.include_router(generate.router)


@fastapi_app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# ── ASGI app ──────────────────────────────────────────────────────────────────

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/socket.io")
