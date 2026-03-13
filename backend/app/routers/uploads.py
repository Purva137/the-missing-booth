import logging
from pathlib import Path as _Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Depends
from app.models.schemas import UploadResponse

log = logging.getLogger("uploads")

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


def get_services(request: Request):
    return request.app.state.room_service, request.app.state.storage_service, request.app.state.sio


@router.post("/photo", response_model=UploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    room_code: str = Form(...),
    member_id: str = Form(...),
    slot_index: int = Form(default=0, ge=0, le=3),
    services=Depends(get_services),
):
    room_svc, storage_svc, sio = services

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPG, PNG, WebP images are allowed")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")

    room = await room_svc.get_room(room_code.upper())
    if not room:
        raise HTTPException(404, "Room not found")

    member = next((m for m in room.members if m.id == member_id), None)
    if not member:
        raise HTTPException(404, "Member not found in room")

    ext = _Path(file.filename or f"{member_id}.jpg").suffix.lower() or ".jpg"
    slotted_filename = f"{member_id}_{slot_index}{ext}"

    log.info(f"[upload] room={room_code.upper()} member={member_id} slot={slot_index} file={slotted_filename}")

    photo_url = await storage_svc.save_upload(
        file_content=content,
        room_code=room_code.upper(),
        member_id=member_id,
        filename=slotted_filename,
    )

    log.info(f"[upload] saved → {photo_url}")

    updated_room = await room_svc.add_member_photo(room_code.upper(), member_id, photo_url, slot_index)

    my_member = next((m for m in updated_room.members if m.id == member_id), None)
    log.info(f"[upload] after save — member.photos={my_member.photos if my_member else 'NOT FOUND'}")

    await sio.emit(
        "photo_uploaded",
        {"member_id": member_id, "photo_url": photo_url, "slot_index": slot_index},
        room=room_code.upper(),
    )
    await sio.emit("room_updated", updated_room.model_dump(mode="json"), room=room_code.upper())

    return UploadResponse(photo_url=photo_url, member_id=member_id, slot_index=slot_index)
