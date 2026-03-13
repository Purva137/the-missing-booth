from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.schemas import (
    CreateRoomRequest, CreateRoomResponse,
    JoinRoomRequest, JoinRoomResponse,
    UpdateThemeRequest, Room,
)

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def get_room_service(request: Request):
    return request.app.state.room_service


@router.post("", response_model=CreateRoomResponse)
async def create_room(body: CreateRoomRequest, room_svc=Depends(get_room_service)):
    try:
        room, member_id = await room_svc.create_room(
            host_name=body.host_name,
            mode=body.mode,
            theme=body.theme,
        )
        return CreateRoomResponse(room=room, member_id=member_id)
    except Exception as e:
        raise HTTPException(500, f"Failed to create room: {e}")


@router.get("/{code}", response_model=Room)
async def get_room(code: str, room_svc=Depends(get_room_service)):
    room = await room_svc.get_room(code.upper())
    if not room:
        raise HTTPException(404, "Room not found")
    return room


@router.post("/{code}/join", response_model=JoinRoomResponse)
async def join_room(code: str, body: JoinRoomRequest, room_svc=Depends(get_room_service)):
    try:
        room, member_id = await room_svc.join_room(code.upper(), body.name)
        return JoinRoomResponse(room=room, member_id=member_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to join room: {e}")


@router.patch("/{code}/theme", response_model=Room)
async def update_theme(code: str, body: UpdateThemeRequest, room_svc=Depends(get_room_service)):
    try:
        room = await room_svc.update_theme(code.upper(), body.theme)
        return room
    except ValueError as e:
        raise HTTPException(400, str(e))
