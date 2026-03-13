'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents, Room, Member, StickerPlacement } from '@/types'

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8000'
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' ? 'http://localhost:8000' : `http://${h}:8000`
}

type BoothSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useSocket() {
  const socketRef = useRef<BoothSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket: BoothSocket = io(getWsUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socketRef.current = socket
    return () => { socket.disconnect() }
  }, [])

  const joinRoom  = useCallback((room_code: string, member_id: string, name: string) => {
    socketRef.current?.emit('join_room', { room_code, member_id, name })
  }, [])

  const leaveRoom = useCallback((room_code: string, member_id: string) => {
    socketRef.current?.emit('leave_room', { room_code, member_id })
  }, [])

  const startGeneration = useCallback((room_code: string) => {
    socketRef.current?.emit('start_generation', { room_code })
  }, [])

  return { socket: socketRef.current, connected, joinRoom, leaveRoom, startGeneration }
}


// ── Room-specific hook ────────────────────────────────────────────────────────

interface UseRoomSocketOptions {
  room_code: string
  member_id: string
  member_name: string
  onRoomUpdate?: (room: Room) => void
  onMemberJoined?: (member: Member) => void
  onMemberLeft?: (member_id: string) => void
  onPhotoUploaded?: (data: { member_id: string; photo_url: string; slot_index: number }) => void
  onGenerationStarted?: () => void
  onGenerationProgress?: (data: { progress: number; status: string }) => void
  onGenerationComplete?: (data: { image_url: string }) => void
  onGenerationError?: (data: { message: string }) => void
  onStickerAdded?: (data: StickerPlacement) => void
  onStickerCleared?: () => void
}

export function useRoomSocket(options: UseRoomSocketOptions) {
  const { socket, connected, joinRoom, leaveRoom, startGeneration } = useSocket()

  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })

  const emitStickerAdded = useCallback((placement: StickerPlacement) => {
    socket?.emit('sticker_added', { ...placement, room_code: options.room_code })
  }, [socket, options.room_code])

  const emitStickerCleared = useCallback(() => {
    socket?.emit('sticker_cleared', { room_code: options.room_code })
  }, [socket, options.room_code])

  useEffect(() => {
    if (!socket || !connected) return

    joinRoom(options.room_code, options.member_id, options.member_name)

    socket.on('room_updated',          (d) => optionsRef.current.onRoomUpdate?.(d))
    socket.on('member_joined',         (d) => optionsRef.current.onMemberJoined?.(d))
    socket.on('member_left',           (d) => optionsRef.current.onMemberLeft?.(d))
    socket.on('photo_uploaded',        (d) => optionsRef.current.onPhotoUploaded?.(d))
    socket.on('generation_started',    ()  => optionsRef.current.onGenerationStarted?.())
    socket.on('generation_progress',   (d) => optionsRef.current.onGenerationProgress?.(d))
    socket.on('generation_complete',   (d) => optionsRef.current.onGenerationComplete?.(d))
    socket.on('generation_error',      (d) => optionsRef.current.onGenerationError?.(d))
    socket.on('sticker_added',         (d) => optionsRef.current.onStickerAdded?.(d))
    socket.on('sticker_cleared',       ()  => optionsRef.current.onStickerCleared?.())

    return () => {
      leaveRoom(options.room_code, options.member_id)
      socket.off('room_updated')
      socket.off('member_joined')
      socket.off('member_left')
      socket.off('photo_uploaded')
      socket.off('generation_started')
      socket.off('generation_progress')
      socket.off('generation_complete')
      socket.off('generation_error')
      socket.off('sticker_added')
      socket.off('sticker_cleared')
    }
  }, [socket, connected, options.room_code])

  return { connected, startGeneration, emitStickerAdded, emitStickerCleared }
}
