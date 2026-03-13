import asyncio
from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from app.models.schemas import GenerateRequest, GenerateResponse, GenerationStatusResponse, RoomStatus, RoomMode, RethemeRequest

router = APIRouter(prefix="/api/generate", tags=["generation"])


def get_services(request: Request):
    return (
        request.app.state.room_service,
        request.app.state.storage_service,
        request.app.state.strip_service,
        request.app.state.sio,
    )


@router.post("", response_model=GenerateResponse)
async def start_generation(
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    services=Depends(get_services),
):
    room_svc, storage_svc, strip_svc, sio = services

    room = await room_svc.get_room(body.room_code.upper())
    if not room:
        raise HTTPException(404, "Room not found")
    if room.status == RoomStatus.generating:
        raise HTTPException(400, "Already developing your strip")

    # Collect photos (filter empty slot placeholders)
    if room.mode == RoomMode.solo:
        all_photos = [p for p in (room.members[0].photos if room.members else []) if p]
    else:
        all_photos = [m.photo_url for m in room.members if m.photo_url]

    if len(all_photos) < 2:
        raise HTTPException(400, "Need at least 2 photos to develop your strip")

    room_code = body.room_code.upper()
    await room_svc.update_room_status(room_code, RoomStatus.generating)
    await sio.emit("generation_started", {}, room=room_code)

    background_tasks.add_task(
        _run_generation,
        room_code=room_code,
        photo_urls=all_photos,
        theme=room.theme.value,
        custom_text=body.custom_text,
        room_svc=room_svc,
        storage_svc=storage_svc,
        strip_svc=strip_svc,
        sio=sio,
    )

    return GenerateResponse(job_id=room_code, status="submitted")


@router.get("/{job_id}/status", response_model=GenerationStatusResponse)
async def get_generation_status(job_id: str, services=Depends(get_services)):
    room_svc = services[0]
    room = await room_svc.get_room(job_id.upper())
    if not room:
        return GenerationStatusResponse(status="not_found", progress=0)
    if room.status == RoomStatus.done:
        return GenerationStatusResponse(status="done", progress=100, image_url=room.strip_image)
    elif room.status == RoomStatus.error:
        return GenerationStatusResponse(status="error", progress=0, error="Strip generation failed")
    elif room.status == RoomStatus.generating:
        return GenerationStatusResponse(status="processing", progress=50)
    return GenerationStatusResponse(status=room.status.value, progress=0)


@router.post("/retheme")
async def retheme_strip(body: RethemeRequest, services=Depends(get_services)):
    """Synchronously regenerate the strip with a new theme and/or custom footer text."""
    print(f"[retheme] hit — room={body.room_code.upper()} theme={body.theme} text={body.custom_text!r}")
    room_svc, storage_svc, strip_svc, sio = services

    room = await room_svc.get_room(body.room_code.upper())
    if not room:
        raise HTTPException(404, "Room not found")

    if room.mode == RoomMode.solo:
        all_photos = [p for p in (room.members[0].photos if room.members else []) if p]
    else:
        all_photos = [m.photo_url for m in room.members if m.photo_url]

    if len(all_photos) < 2:
        raise HTTPException(400, "Need at least 2 photos to develop your strip")

    # Update theme in Redis
    await room_svc.update_theme(body.room_code.upper(), body.theme)

    loop = asyncio.get_event_loop()
    img_bytes = await loop.run_in_executor(
        None,
        lambda: strip_svc.create_strip(all_photos, body.theme.value, body.custom_text),
    )

    image_url = await storage_svc.save_result(img_bytes, body.room_code.upper())
    await room_svc.set_strip_image(body.room_code.upper(), image_url)

    return {"image_url": image_url}


async def _run_generation(room_code, photo_urls, theme, custom_text, room_svc, storage_svc, strip_svc, sio):
    try:
        loop = asyncio.get_event_loop()

        await sio.emit("generation_progress",
                       {"progress": 20, "status": "Loading your photos..."},
                       room=room_code)

        img_bytes = await loop.run_in_executor(
            None,
            lambda: strip_svc.create_strip(photo_urls, theme, custom_text),
        )

        await sio.emit("generation_progress",
                       {"progress": 80, "status": "Developing your film..."},
                       room=room_code)

        image_url = await storage_svc.save_result(img_bytes, room_code)
        await room_svc.set_strip_image(room_code, image_url)

        await sio.emit("generation_complete", {"image_url": image_url}, room=room_code)

        room = await room_svc.get_room(room_code)
        if room:
            await sio.emit("room_updated", room.model_dump(mode="json"), room=room_code)

    except Exception as e:
        import traceback
        print(f"[Strip] ERROR for room {room_code}: {e}")
        traceback.print_exc()
        await room_svc.update_room_status(room_code, RoomStatus.error)
        await sio.emit("generation_error", {"message": str(e)}, room=room_code)
