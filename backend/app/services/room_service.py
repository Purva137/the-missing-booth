import json
import logging
import random
import string
import secrets
from typing import Optional, List

log = logging.getLogger("room_service")
from datetime import datetime

from app.models.schemas import Room, Member, ThemeType, RoomMode, RoomStatus


def generate_room_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(random.choices(chars, k=length))


class RoomService:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.room_ttl = 60 * 60 * 4  # 4 hours

    def _room_key(self, code: str) -> str:
        return f"room:{code.upper()}"

    async def _save_room(self, room: Room) -> None:
        key = self._room_key(room.code)
        data = room.model_dump_json()
        await self.redis.setex(key, self.room_ttl, data)

    async def get_room(self, code: str) -> Optional[Room]:
        key = self._room_key(code)
        data = await self.redis.get(key)
        if not data:
            return None
        return Room.model_validate_json(data)

    async def create_room(
        self,
        host_name: str,
        mode: RoomMode = RoomMode.squad,
        theme: ThemeType = ThemeType.cafe,
    ) -> tuple[Room, str]:
        for _ in range(10):
            code = generate_room_code()
            if not await self.get_room(code):
                break

        host_member = Member(id=secrets.token_urlsafe(12), name=host_name)
        room = Room(
            code=code,
            host_id=host_member.id,
            mode=mode,
            members=[host_member],
            theme=theme,
        )
        await self._save_room(room)
        return room, host_member.id

    async def join_room(self, code: str, name: str) -> tuple[Room, str]:
        room = await self.get_room(code)
        if not room:
            raise ValueError("Room not found")
        if room.mode == RoomMode.solo:
            raise ValueError("Solo booth — joining not allowed")
        if len(room.members) >= 10:
            raise ValueError("Room is full (10 members max)")
        if room.status == RoomStatus.done:
            raise ValueError("Strip already developed for this room")

        member = Member(id=secrets.token_urlsafe(12), name=name)
        room.members.append(member)
        await self._save_room(room)
        return room, member.id

    async def add_member_photo(
        self, code: str, member_id: str, photo_url: str, slot_index: int = 0
    ) -> Room:
        """Add/replace a photo at slot_index for a member. Solo: up to 4 slots; Squad: slot 0 only."""
        room = await self.get_room(code)
        if not room:
            raise ValueError("Room not found")

        max_slots = 4 if room.mode == RoomMode.solo else 1
        slot_index = max(0, min(slot_index, max_slots - 1))

        for member in room.members:
            if member.id == member_id:
                # Build a fresh list copy — avoid mutating the shared Pydantic default
                photos = list(member.photos)
                log.info(f"[room_svc] before — member={member_id} slot={slot_index} photos={photos}")
                # Extend to cover the target slot with empty strings
                while len(photos) <= slot_index:
                    photos.append("")
                photos[slot_index] = photo_url
                # Remove trailing empty slots (keep internal gaps for strip ordering)
                while photos and not photos[-1]:
                    photos.pop()
                member.photos = photos
                member.photo_url = next((p for p in photos if p), None)
                member.photo_uploaded = any(photos)
                log.info(f"[room_svc] after  — member={member_id} photos={member.photos}")
                break

        await self._save_room(room)
        return room

    async def update_room_status(self, code: str, status: RoomStatus) -> Room:
        room = await self.get_room(code)
        if not room:
            raise ValueError("Room not found")
        room.status = status
        await self._save_room(room)
        return room

    async def set_strip_image(self, code: str, image_url: str) -> Room:
        room = await self.get_room(code)
        if not room:
            raise ValueError("Room not found")
        room.strip_image = image_url
        room.status = RoomStatus.done
        await self._save_room(room)
        return room

    async def set_job_id(self, code: str, job_id: str) -> None:
        room = await self.get_room(code)
        if room:
            room.generation_job_id = job_id
            await self._save_room(room)

    async def remove_member(self, code: str, member_id: str) -> Optional[Room]:
        room = await self.get_room(code)
        if not room:
            return None
        room.members = [m for m in room.members if m.id != member_id]
        await self._save_room(room)
        return room

    async def update_theme(self, code: str, theme: ThemeType) -> Room:
        room = await self.get_room(code)
        if not room:
            raise ValueError("Room not found")
        room.theme = theme
        await self._save_room(room)
        return room
