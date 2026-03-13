'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { generateApi } from '@/lib/api'
import type { Room } from '@/types'

interface GenerationPanelProps {
  room: Room
}

export function GenerationPanel({ room }: GenerationPanelProps) {
  const [loading, setLoading] = useState(false)

  const isSolo = room.mode === 'solo'
  const myMember = room.members[0]

  // Determine readiness
  const totalPhotos = isSolo
    ? (myMember?.photos?.length ?? 0)
    : room.members.filter(m => m.photo_uploaded).length

  const minPhotos = 2
  const canGenerate = totalPhotos >= minPhotos && room.status !== 'generating'
  const isHost = true // GenerationPanel is only shown to host

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    try {
      await generateApi.start({ room_code: room.code })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to start'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (room.status === 'generating') return null

  return (
    <div className="booth-card" style={{ border: '2px solid var(--film-dark)', boxShadow: '4px 4px 0 var(--film-dark)' }}>
      <h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
        🎞️ Develop your strip
      </h3>
      <p className="text-xs mb-4" style={{ color: '#7a5c3a' }}>
        {isSolo
          ? `${totalPhotos}/4 photos ready${totalPhotos < minPhotos ? ` — need at least ${minPhotos}` : ''}`
          : `${totalPhotos}/${room.members.length} squad photos uploaded${totalPhotos < minPhotos ? ` — need at least ${minPhotos}` : ''}`}
      </p>

      {/* Photo count indicator */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: isSolo ? 4 : Math.min(room.members.length, 6) }).map((_, i) => (
          <div key={i} className="flex-1 h-1.5"
            style={{
              background: i < totalPhotos ? 'var(--warm-amber)' : 'var(--border-color)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      <motion.button
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        whileHover={canGenerate ? { scale: 1.02, y: -1 } : {}}
        whileTap={canGenerate ? { scale: 0.98 } : {}}
        className="btn-red w-full justify-center py-3"
      >
        {loading
          ? '🎞️ Starting...'
          : canGenerate
            ? '📸 Develop Film'
            : `Need ${minPhotos - totalPhotos} more photo${minPhotos - totalPhotos !== 1 ? 's' : ''}`}
      </motion.button>
    </div>
  )
}
