import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, Member } from '@/types'

interface RoomStore {
  currentRoom: Room | null
  myMemberId: string | null
  myName: string | null

  setRoom: (room: Room) => void
  setMyInfo: (member_id: string, name: string) => void
  updateMember: (member: Member) => void
  updateMemberPhoto: (member_id: string, photo_url: string, slot_index?: number) => void
  removeMember: (member_id: string) => void
  setStripImage: (url: string) => void
  setRoomStatus: (status: Room['status']) => void
  clearRoom: () => void

  generationProgress: number
  generationStatus: string
  setGenerationProgress: (progress: number, status: string) => void
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      currentRoom: null,
      myMemberId: null,
      myName: null,
      generationProgress: 0,
      generationStatus: '',

      setRoom: (room) => set({ currentRoom: room }),

      setMyInfo: (member_id, name) => set({ myMemberId: member_id, myName: name }),

      updateMember: (member) => {
        const room = get().currentRoom
        if (!room) return
        set({ currentRoom: { ...room, members: room.members.map(m => m.id === member.id ? member : m) } })
      },

      updateMemberPhoto: (member_id, photo_url, slot_index = 0) => {
        const room = get().currentRoom
        if (!room) return
        const members = room.members.map(m => {
          if (m.id !== member_id) return m
          const photos = [...(m.photos || [])]
          while (photos.length <= slot_index) photos.push('')
          photos[slot_index] = photo_url
          // Trim trailing empty slots but preserve internal positions (e.g. [photo0, '', photo2])
          while (photos.length > 0 && !photos[photos.length - 1]) photos.pop()
          return { ...m, photos, photo_url: photos.find(p => !!p) ?? photo_url, photo_uploaded: true }
        })
        set({ currentRoom: { ...room, members } })
      },

      removeMember: (member_id) => {
        const room = get().currentRoom
        if (!room) return
        set({ currentRoom: { ...room, members: room.members.filter(m => m.id !== member_id) } })
      },

      setStripImage: (url) => {
        const room = get().currentRoom
        if (!room) return
        set({ currentRoom: { ...room, strip_image: url, status: 'done' } })
      },

      setRoomStatus: (status) => {
        const room = get().currentRoom
        if (!room) return
        set({ currentRoom: { ...room, status } })
      },

      clearRoom: () => set({
        currentRoom: null, myMemberId: null, myName: null,
        generationProgress: 0, generationStatus: '',
      }),

      setGenerationProgress: (progress, status) => set({ generationProgress: progress, generationStatus: status }),
    }),
    {
      name: 'themissingbooth-room',
      partialize: (state) => ({
        myMemberId: state.myMemberId,
        myName: state.myName,
        currentRoom: state.currentRoom,
      }),
    }
  )
)
