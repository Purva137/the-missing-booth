import axios from 'axios'
import type { Room, GenerationRequest } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({ timeout: 30000 })

api.interceptors.request.use((config) => {
  config.baseURL = API_BASE
  return config
})

// Room API
export const roomApi = {
  create: async (data: {
    host_name: string
    mode: string
    theme: string
  }): Promise<{ room: Room; member_id: string }> => {
    const res = await api.post('/api/rooms', data)
    return res.data
  },

  get: async (code: string): Promise<Room> => {
    const res = await api.get(`/api/rooms/${code}`)
    return res.data
  },

  join: async (code: string, name: string): Promise<{ room: Room; member_id: string }> => {
    const res = await api.post(`/api/rooms/${code}/join`, { name })
    return res.data
  },

  updateTheme: async (code: string, theme: string): Promise<Room> => {
    const res = await api.patch(`/api/rooms/${code}/theme`, { theme })
    return res.data
  },
}

// Upload API
export const uploadApi = {
  uploadPhoto: async (
    room_code: string,
    member_id: string,
    file: File,
    slot_index: number = 0,
    onProgress?: (pct: number) => void
  ): Promise<{ photo_url: string; slot_index: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('room_code', room_code)
    formData.append('member_id', member_id)
    formData.append('slot_index', String(slot_index))

    const res = await api.post('/api/uploads/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
    return res.data
  },
}

// Generation API
export const generateApi = {
  start: async (request: GenerationRequest): Promise<{ job_id: string }> => {
    const res = await api.post('/api/generate', request)
    return res.data
  },

  retheme: async (request: {
    room_code: string
    theme: string
    custom_text?: string
  }): Promise<{ image_url: string }> => {
    const res = await api.post('/api/generate/retheme', request, { timeout: 120_000 })
    return res.data
  },

  status: async (job_id: string): Promise<{
    status: string
    progress: number
    image_url?: string
    error?: string
  }> => {
    const res = await api.get(`/api/generate/${job_id}/status`)
    return res.data
  },
}
