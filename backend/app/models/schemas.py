from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ThemeType(str, Enum):
    birthday = "birthday"
    cafe = "cafe"
    beach = "beach"
    night_out = "night_out"
    garden = "garden"
    y2k = "y2k"


class RoomMode(str, Enum):
    solo = "solo"
    squad = "squad"


class RoomStatus(str, Enum):
    waiting = "waiting"
    uploading = "uploading"
    generating = "generating"
    done = "done"
    error = "error"


class Member(BaseModel):
    id: str
    name: str
    photo_url: Optional[str] = None                          # primary / first photo
    photos: List[str] = Field(default_factory=list)          # per-slot photos (up to 4 solo, 1 squad)
    photo_uploaded: bool = False
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Room(BaseModel):
    code: str
    host_id: str
    mode: RoomMode = RoomMode.squad
    members: List[Member] = []
    theme: ThemeType = ThemeType.cafe
    status: RoomStatus = RoomStatus.waiting
    created_at: datetime = Field(default_factory=datetime.utcnow)
    strip_image: Optional[str] = None
    generation_job_id: Optional[str] = None


# ── Request / Response models ──────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    host_name: str = Field(..., min_length=1, max_length=30)
    mode: RoomMode = RoomMode.squad
    theme: ThemeType = ThemeType.cafe


class JoinRoomRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=30)


class UpdateThemeRequest(BaseModel):
    theme: ThemeType


class GenerateRequest(BaseModel):
    room_code: str
    custom_text: Optional[str] = None


class RethemeRequest(BaseModel):
    room_code: str
    theme: ThemeType
    custom_text: Optional[str] = None


class CreateRoomResponse(BaseModel):
    room: Room
    member_id: str


class JoinRoomResponse(BaseModel):
    room: Room
    member_id: str


class UploadResponse(BaseModel):
    photo_url: str
    member_id: str
    slot_index: int


class GenerateResponse(BaseModel):
    job_id: str
    status: str


class GenerationStatusResponse(BaseModel):
    status: str
    progress: int = 0
    image_url: Optional[str] = None
    error: Optional[str] = None
