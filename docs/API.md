# SnapTogether API Reference

Base URL: `https://your-backend.onrender.com`

---

## REST Endpoints

### Rooms

#### `POST /api/rooms`
Create a new room.

**Request:**
```json
{
  "host_name": "Alex",
  "scene": "beach",
  "birthday_mode": false,
  "birthday_name": null
}
```

**Scene values:** `birthday_party` | `cafe` | `beach` | `graduation` | `office` | `rooftop` | `custom`

**Response:**
```json
{
  "room": {
    "code": "XK9247",
    "host_id": "member_id_here",
    "members": [...],
    "scene": "beach",
    "status": "waiting",
    "birthday_mode": false,
    "created_at": "2024-01-01T00:00:00"
  },
  "member_id": "abc123"
}
```

---

#### `GET /api/rooms/{code}`
Get room details.

---

#### `POST /api/rooms/{code}/join`
Join an existing room.

**Request:**
```json
{ "name": "Sam" }
```

**Response:** Same as create room response.

---

#### `PATCH /api/rooms/{code}/scene`
Update room scene (host only).

**Request:**
```json
{
  "scene": "custom",
  "custom_prompt": "On the moon with Earth in background, cinematic"
}
```

---

### Uploads

#### `POST /api/uploads/photo`
Upload a member's photo.

**Form data:**
- `file` — Image file (JPG/PNG/WebP, max 10MB)
- `room_code` — Room code
- `member_id` — Member ID received when joining

**Response:**
```json
{
  "photo_url": "https://cdn.example.com/rooms/XK9247/members/abc123.jpg",
  "member_id": "abc123"
}
```

---

### Generation

#### `POST /api/generate`
Start AI generation (host only recommended).

**Request:**
```json
{ "room_code": "XK9247" }
```

**Response:**
```json
{
  "job_id": "runpod-job-id-here",
  "status": "submitted"
}
```

---

#### `GET /api/generate/{job_id}/status`
Poll generation status directly.

**Response:**
```json
{
  "status": "IN_PROGRESS",
  "progress": 45,
  "image_url": null,
  "error": null
}
```

---

## WebSocket Events (Socket.io)

Connect to: `wss://your-backend.onrender.com` with path `/socket.io`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{room_code, member_id, name}` | Join a Socket.io room |
| `leave_room` | `{room_code, member_id}` | Leave a room |
| `start_generation` | `{room_code}` | Request generation start |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_updated` | `Room` object | Room state changed |
| `member_joined` | `Member` object | New member joined |
| `member_left` | `member_id: string` | Member disconnected |
| `photo_uploaded` | `{member_id, photo_url}` | A photo was uploaded |
| `generation_started` | `{}` | AI pipeline started |
| `generation_progress` | `{progress: 0-100, status: string}` | Progress update |
| `generation_complete` | `{image_url: string}` | Final image ready |
| `generation_error` | `{message: string}` | Generation failed |

---

## Room Status Flow

```
waiting → uploading → generating → done
                              ↘ error
```

- `waiting` — Room created, waiting for members/photos
- `uploading` — Members are uploading photos
- `generating` — AI pipeline running on RunPod
- `done` — Generated image available
- `error` — Generation failed
