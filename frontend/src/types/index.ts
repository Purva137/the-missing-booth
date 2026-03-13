// Room types
export type RoomMode = 'solo' | 'squad'
export type ThemeType = 'birthday' | 'cafe' | 'beach' | 'night_out' | 'garden' | 'y2k'
export type RoomStatus = 'waiting' | 'uploading' | 'generating' | 'done' | 'error'

export interface Member {
  id: string
  name: string
  photo_url?: string
  photos: string[]
  photo_uploaded: boolean
  joined_at: string
}

export interface Room {
  code: string
  host_id: string
  mode: RoomMode
  members: Member[]
  theme: ThemeType
  status: RoomStatus
  created_at: string
  strip_image?: string
  generation_job_id?: string
}

export interface ThemeOption {
  id: ThemeType
  label: string
  emoji: string
  description: string
  borderStyle: string  // CSS gradient/color description for preview
}

// Sticker
export interface StickerPlacement {
  sticker_id: string
  emoji: string
  x: number  // 0–1 relative to canvas width
  y: number  // 0–1 relative to canvas height
}

// Socket events
export interface ServerToClientEvents {
  room_updated: (room: Room) => void
  member_joined: (member: Member) => void
  member_left: (member_id: string) => void
  photo_uploaded: (data: { member_id: string; photo_url: string; slot_index: number }) => void
  generation_started: () => void
  generation_progress: (data: { progress: number; status: string }) => void
  generation_complete: (data: { image_url: string }) => void
  generation_error: (data: { message: string }) => void
  sticker_added: (data: StickerPlacement) => void
  sticker_cleared: () => void
  error: (data: { message: string }) => void
}

export interface ClientToServerEvents {
  join_room: (data: { room_code: string; member_id: string; name: string }) => void
  leave_room: (data: { room_code: string; member_id: string }) => void
  start_generation: (data: { room_code: string }) => void
  sticker_added: (data: StickerPlacement & { room_code: string }) => void
  sticker_cleared: (data: { room_code: string }) => void
}

// API
export interface GenerationRequest {
  room_code: string
}
