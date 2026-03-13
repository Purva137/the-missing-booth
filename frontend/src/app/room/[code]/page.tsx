'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Users, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { roomApi } from '@/lib/api'
import { useRoomStore } from '@/lib/store'
import { useRoomSocket } from '@/hooks/useSocket'
import { StripUploader } from '@/components/upload/PhotoUploader'
import { GenerationPanel } from '@/components/room/GenerationPanel'
import { ResultView } from '@/components/result/ResultView'
import type { Room } from '@/types'

function getImageUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (typeof window === 'undefined') return `http://localhost:8000${url}`
  const h = window.location.hostname
  const base = h === 'localhost' || h === '127.0.0.1' ? 'http://localhost:8000' : `http://${h}:8000`
  return `${base}${url}`
}

const THEME_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  birthday:  { emoji: '🎂', label: 'Birthday',  color: '#ff91a4' },
  cafe:      { emoji: '☕', label: 'Cafe',       color: '#a0724a' },
  beach:     { emoji: '🏖️', label: 'Beach',      color: '#4ab6e8' },
  night_out: { emoji: '🌙', label: 'Night Out',  color: '#7c4dbd' },
  garden:    { emoji: '🌸', label: 'Garden',     color: '#7ab86a' },
  y2k:       { emoji: '✨', label: 'Y2K',        color: '#c49bef' },
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string || '').toUpperCase()

  const {
    currentRoom: room,
    setRoom,
    myMemberId,
    myName,
    removeMember,
    updateMemberPhoto,
    setRoomStatus,
    setGenerationProgress,
    setStripImage,
    generationProgress,
    generationStatus,
  } = useRoomStore()

  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const { connected } = useRoomSocket({
    room_code: code,
    member_id: myMemberId || '',
    member_name: myName || '',
    onRoomUpdate: setRoom,
    onMemberLeft: removeMember,
    onPhotoUploaded: (data) => updateMemberPhoto(data.member_id, data.photo_url, data.slot_index),
    onGenerationStarted: () => setRoomStatus('generating'),
    onGenerationProgress: (data) => setGenerationProgress(data.progress, data.status),
    onGenerationComplete: (data) => setStripImage(data.image_url),
    onGenerationError: (data) => toast.error(`Failed: ${data.message}`),
  })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await roomApi.get(code)
        setRoom(data)
      } catch {
        toast.error('Room not found')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [code])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-6xl mb-4 animate-film-roll">🎞️</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--film-dark)' }}>Loading your booth...</p>
      </motion.div>
    </div>
  )

  if (!room) return null
  if (room.status === 'done' && room.strip_image) return <ResultView room={room} />

  const isSolo      = room.mode === 'solo'
  const myMember    = room.members.find(m => m.id === myMemberId)
  const myPhotos    = myMember?.photos || []
  const isGenerating = room.status === 'generating'
  const themeConfig  = THEME_CONFIG[room.theme] || THEME_CONFIG.cafe

  // Squad: total uploaded count
  const uploadedCount = isSolo ? myPhotos.length : room.members.filter(m => m.photo_uploaded).length
  const totalCount    = isSolo ? 4 : room.members.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)', fontFamily: 'var(--font-body)' }}>
      {/* Film strip header */}
      <div className="w-full h-6 flex items-center" style={{ background: 'var(--film-dark)' }}>
        <div className="w-full" style={{
          height: 12,
          backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 5px, #3a2a10 5px, #3a2a10 23px, transparent 23px, transparent 28px)',
        }} />
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--warm-white)' }}>
        <div className="flex items-center gap-4">
          {!isGenerating && (
            <button onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: 'var(--brown)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft className="w-4 h-4" /> Leave
            </button>
          )}
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--film-dark)' }}>
            The Missing Booth
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: connected ? '#7ab86a' : '#c8372d' }} />
            <span className="text-xs font-medium" style={{ color: connected ? '#4a7a4a' : '#c8372d' }}>
              {connected ? 'Live' : 'Reconnecting'}
            </span>
          </div>
          {!isSolo && (
            <button onClick={copyCode}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono font-bold"
              style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)', borderRadius: 2, cursor: 'pointer' }}>
              {code} {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </nav>

      {/* Generating overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div key="generating"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(26,16,8,0.85)', backdropFilter: 'blur(6px)' }}>
            <div className="text-center px-8 py-10 max-w-sm"
              style={{ background: 'var(--warm-white)', border: '2px solid var(--film-dark)', boxShadow: '8px 8px 0 rgba(0,0,0,0.3)' }}>
              <div className="text-6xl mb-4 animate-film-roll">🎞️</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--film-dark)', marginBottom: '0.5rem' }}>
                Developing your film...
              </h2>
              <p className="text-sm mb-6" style={{ color: '#7a5c3a' }}>
                {generationStatus || 'This takes about 5–10 seconds'}
              </p>
              <div className="w-full h-3 overflow-hidden mb-2" style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)' }}>
                <motion.div
                  className="h-full film-progress"
                  animate={{ width: `${Math.max(generationProgress, 10)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs font-mono" style={{ color: '#9a7850' }}>{generationProgress}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Room header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--film-dark)' }}>
              {themeConfig.emoji} {isSolo ? 'Solo' : 'Squad'} Booth — {themeConfig.label}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#7a5c3a' }}>
              {isSolo
                ? `${myPhotos.length}/4 photos added · upload 2–4 for your strip`
                : `${uploadedCount}/${totalCount} photos uploaded`}
            </p>
          </div>
          {!isSolo && (
            <div className="flex items-center gap-2 px-4 py-2"
              style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)', borderRadius: 2 }}>
              <Users className="w-4 h-4" style={{ color: 'var(--brown)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--film-dark)' }}>{totalCount}/10</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Strip preview + members */}
          <div className="lg:col-span-3 space-y-5">
            {isSolo ? (
              <SoloStripPreview photos={myPhotos} theme={room.theme} />
            ) : (
              <SquadStripPreview members={room.members} theme={room.theme} />
            )}
          </div>

          {/* Right: Upload + Generate + Invite */}
          <div className="lg:col-span-2 space-y-5">
            <StripUploader
              roomCode={code}
              memberId={myMemberId || ''}
              isSolo={isSolo}
              currentPhotos={myPhotos}
            />
            <GenerationPanel room={room} />

            {!isSolo && (
              <div className="booth-card">
                <h3 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
                  💌 Invite friends
                </h3>
                <p className="text-sm mb-3" style={{ color: '#7a5c3a' }}>Share this code:</p>
                <div className="flex items-center justify-between p-3"
                  style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)', borderRadius: 2 }}>
                  <span className="room-code text-2xl">{code}</span>
                  <button onClick={copyCode} className="p-2" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown)' }}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowLeaveModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="booth-card w-full max-w-sm text-center"
              style={{ border: '2px solid var(--film-dark)', boxShadow: '8px 8px 0 rgba(0,0,0,0.3)' }}
              onClick={e => e.stopPropagation()}>
              <div className="text-4xl mb-3">🎞️</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--film-dark)', marginBottom: '0.5rem' }}>
                Leave the booth?
              </h2>
              <p className="text-sm mb-6" style={{ color: '#7a5c3a' }}>Your uploads will stay saved.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLeaveModal(false)} className="btn-booth-outline flex-1 justify-center">Stay</button>
                <button onClick={() => router.push('/')} className="btn-booth flex-1 justify-center">Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Strip preview components ──────────────────────────────────────────────────

function SoloStripPreview({ photos, theme }: { photos: string[]; theme: string }) {
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.cafe
  const slots = [0, 1, 2, 3]

  return (
    <div className="booth-card">
      <h2 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--film-dark)' }}>
        🎞️ Your strip preview
      </h2>
      <div className="flex justify-center">
        <div style={{
          width: 200, background: 'white', border: `4px solid ${cfg.color}`,
          boxShadow: `4px 4px 0 ${cfg.color}`, borderRadius: 2,
        }}>
          <div className="py-2 text-center text-xs font-bold tracking-widest"
            style={{ background: cfg.color, color: 'white', fontSize: '0.6rem' }}>
            THE MISSING BOOTH · {cfg.label.toUpperCase()}
          </div>
          {slots.map(i => (
            <div key={i} className="mx-2 my-2 overflow-hidden flex items-center justify-center"
              style={{ height: 100, background: 'var(--aged-paper)', border: '2px solid white', position: 'relative' }}>
              {photos[i] ? (
                <img src={getImageUrl(photos[i])} alt="" className="w-full h-full object-cover animate-develop" />
              ) : (
                <div className="text-center">
                  <div className="text-2xl opacity-30">📸</div>
                  <div className="text-xs opacity-30 mt-1">slot {i + 1}</div>
                </div>
              )}
            </div>
          ))}
          <div className="py-1 text-center text-xs" style={{ background: cfg.color, color: 'white', fontSize: '0.6rem' }}>
            ❤
          </div>
        </div>
      </div>
    </div>
  )
}

function SquadStripPreview({ members, theme }: { members: Room['members']; theme: string }) {
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.cafe

  return (
    <div className="booth-card">
      <h2 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--film-dark)' }}>
        🎞️ Squad strip preview
      </h2>
      <div className="flex justify-center">
        <div style={{
          width: 200, background: 'white', border: `4px solid ${cfg.color}`,
          boxShadow: `4px 4px 0 ${cfg.color}`, borderRadius: 2,
        }}>
          <div className="py-2 text-center text-xs font-bold tracking-widest"
            style={{ background: cfg.color, color: 'white', fontSize: '0.6rem' }}>
            THE MISSING BOOTH · {cfg.label.toUpperCase()}
          </div>
          {members.slice(0, 6).map(m => (
            <div key={m.id} className="mx-2 my-2 overflow-hidden flex items-center justify-center relative"
              style={{ height: 80, background: 'var(--aged-paper)', border: '2px solid white' }}>
              {m.photo_url ? (
                <img src={getImageUrl(m.photo_url)} alt={m.name} className="w-full h-full object-cover animate-develop" />
              ) : (
                <div className="text-center">
                  <div className="text-xl opacity-30">📸</div>
                  <div className="text-xs opacity-40 mt-0.5 truncate px-1">{m.name}</div>
                </div>
              )}
            </div>
          ))}
          {members.length > 6 && (
            <div className="text-center text-xs py-1" style={{ color: '#9a7850' }}>+{members.length - 6} more</div>
          )}
          <div className="py-1 text-center text-xs" style={{ background: cfg.color, color: 'white', fontSize: '0.6rem' }}>
            ❤
          </div>
        </div>
      </div>
    </div>
  )
}
