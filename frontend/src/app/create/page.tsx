'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { roomApi } from '@/lib/api'
import { useRoomStore } from '@/lib/store'
import type { ThemeType, RoomMode } from '@/types'

const THEMES: { id: ThemeType; label: string; emoji: string; desc: string; borderColor: string; bgColor: string }[] = [
  { id: 'birthday',  label: 'Birthday',   emoji: '🎂', desc: 'Pink & gold confetti frames',  borderColor: '#ff91a4', bgColor: '#fff0f4' },
  { id: 'cafe',      label: 'Cafe',        emoji: '☕', desc: 'Warm vintage brown border',     borderColor: '#a0724a', bgColor: '#faf4eb' },
  { id: 'beach',     label: 'Beach',       emoji: '🏖️', desc: 'Blue & sandy wave frames',      borderColor: '#4ab6e8', bgColor: '#f0f8ff' },
  { id: 'night_out', label: 'Night Out',   emoji: '🌙', desc: 'Dark purple + sparkle border',  borderColor: '#7c4dbd', bgColor: '#f5f0ff' },
  { id: 'garden',    label: 'Garden',      emoji: '🌸', desc: 'Soft green with flower stamps', borderColor: '#7ab86a', bgColor: '#f0f8f0' },
  { id: 'y2k',       label: 'Y2K',         emoji: '✨', desc: 'Chrome iridescent border',      borderColor: '#c49bef', bgColor: '#f8f4ff' },
]

export default function CreatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatePageInner />
    </Suspense>
  )
}

function CreatePageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { setRoom, setMyInfo, clearRoom } = useRoomStore()

  const [step, setStep] = useState<'mode' | 'theme' | 'name'>(
    params.get('mode') ? 'theme' : 'mode'
  )
  const [mode, setMode] = useState<RoomMode>((params.get('mode') as RoomMode) || 'squad')
  const [theme, setTheme] = useState<ThemeType>((params.get('theme') as ThemeType) || 'cafe')
  const [hostName, setHostName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (params.get('mode')) {
      setMode(params.get('mode') as RoomMode)
      setStep('theme')
    }
    if (params.get('theme')) {
      setTheme(params.get('theme') as ThemeType)
    }
  }, [params])

  const handleCreate = async () => {
    if (!hostName.trim()) {
      toast.error('What\'s your name?')
      return
    }
    setLoading(true)
    try {
      clearRoom()
      const { room, member_id } = await roomApi.create({
        host_name: hostName.trim(),
        mode,
        theme,
      })
      setRoom(room)
      setMyInfo(member_id, hostName.trim())
      router.push(`/room/${room.code}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)', fontFamily: 'var(--font-body)' }}>
      {/* Film strip header */}
      <div className="w-full h-6 flex items-center overflow-hidden" style={{ background: 'var(--film-dark)' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-5 h-3 mx-1 rounded-sm" style={{ background: '#3a2a10' }} />
        ))}
      </div>

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => step === 'mode' ? router.push('/') : setStep(step === 'name' ? 'theme' : 'mode')}
          className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--brown)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--film-dark)' }}>
          The Missing Booth
        </span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl">

          <AnimatePresence mode="wait">

            {/* ── Step 1: Mode ── */}
            {step === 'mode' && (
              <motion.div key="mode"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h1 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--film-dark)' }}>
                  Open the booth
                </h1>
                <p className="mb-8 text-base" style={{ color: '#7a5c3a' }}>Solo session or with your squad?</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'solo' as RoomMode, emoji: '🎞️', title: 'Solo Booth', desc: 'Just you — upload 2 to 4 photos for your strip' },
                    { id: 'squad' as RoomMode, emoji: '👯', title: 'Squad Booth', desc: 'Friends join with a code, each adds 1 photo' },
                  ].map(opt => (
                    <motion.button
                      key={opt.id}
                      onClick={() => { setMode(opt.id); setStep('theme') }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-left p-6 booth-card"
                      style={{ border: '2px solid var(--film-dark)', cursor: 'pointer', boxShadow: '4px 4px 0 var(--film-dark)' }}
                    >
                      <div className="text-4xl mb-3">{opt.emoji}</div>
                      <div className="font-bold mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--film-dark)' }}>{opt.title}</div>
                      <div className="text-sm" style={{ color: '#7a5c3a' }}>{opt.desc}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Theme ── */}
            {step === 'theme' && (
              <motion.div key="theme"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--film-dark)' }}>
                  Pick a theme
                </h1>
                <p className="mb-8 text-base" style={{ color: '#7a5c3a' }}>
                  {mode === 'solo' ? 'Your solo strip theme:' : 'What\'s the occasion?'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                  {THEMES.map(t => (
                    <motion.button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="relative p-4 text-left"
                      style={{
                        background: theme === t.id ? t.bgColor : 'white',
                        border: `2px solid ${theme === t.id ? t.borderColor : 'var(--border-color)'}`,
                        borderRadius: 2,
                        boxShadow: theme === t.id ? `4px 4px 0 ${t.borderColor}` : '2px 2px 0 var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div className="text-3xl mb-2">{t.emoji}</div>
                      <div className="font-bold text-sm" style={{ color: 'var(--film-dark)' }}>{t.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9a7850' }}>{t.desc}</div>
                      {theme === t.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ background: t.borderColor, color: 'white' }}>✓</div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <motion.button
                  onClick={() => setStep('name')}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-booth w-full justify-center py-4 text-base"
                >
                  Continue →
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 3: Name ── */}
            {step === 'name' && (
              <motion.div key="name"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--film-dark)' }}>
                  Last step
                </h1>
                <p className="mb-8 text-base" style={{ color: '#7a5c3a' }}>What should we call you?</p>

                {/* Summary */}
                <div className="flex items-center gap-3 p-4 mb-6"
                  style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)', borderRadius: 2 }}>
                  <span className="text-2xl">{THEMES.find(t => t.id === theme)?.emoji}</span>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--film-dark)' }}>
                      {mode === 'solo' ? 'Solo' : 'Squad'} · {THEMES.find(t => t.id === theme)?.label}
                    </div>
                    <div className="text-xs" style={{ color: '#9a7850' }}>
                      {mode === 'solo' ? 'Upload 2–4 of your own photos' : 'Friends join with a room code'}
                    </div>
                  </div>
                </div>

                <input
                  className="booth-input mb-6"
                  placeholder="Your name..."
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={30}
                  autoFocus
                />

                <motion.button
                  onClick={handleCreate}
                  disabled={loading || !hostName.trim()}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-red w-full justify-center py-4 text-base"
                >
                  {loading ? '🎞️ Opening the booth...' : '📸 Open the Booth'}
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
