'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { roomApi } from '@/lib/api'
import { useRoomStore } from '@/lib/store'

export default function JoinPage() {
  const router = useRouter()
  const { setRoom, setMyInfo, clearRoom } = useRoomStore()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!name.trim()) { toast.error('What\'s your name?'); return }
    if (code.trim().length < 4) { toast.error('Enter your room code'); return }

    setLoading(true)
    try {
      clearRoom()
      const { room, member_id } = await roomApi.join(code.trim().toUpperCase(), name.trim())
      setRoom(room)
      setMyInfo(member_id, name.trim())
      router.push(`/room/${room.code}`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Room not found'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)', fontFamily: 'var(--font-body)' }}>
      {/* Film strip */}
      <div className="w-full h-6 flex items-center overflow-hidden" style={{ background: 'var(--film-dark)' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-5 h-3 mx-1 rounded-sm" style={{ background: '#3a2a10' }} />
        ))}
      </div>

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--brown)' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--film-dark)' }}>
          The Missing Booth
        </span>
      </nav>

      <main className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="booth-card" style={{ border: '2px solid var(--film-dark)', boxShadow: '6px 6px 0 var(--film-dark)' }}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎞️</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--film-dark)' }}>
                Join a booth
              </h1>
              <p className="text-sm mt-1" style={{ color: '#7a5c3a' }}>Enter the code your squad host shared</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--film-dark)' }}>Your name</label>
                <input
                  className="booth-input"
                  placeholder="What do they call you?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--film-dark)' }}>Room code</label>
                <input
                  className="booth-input text-center font-mono tracking-widest text-xl uppercase"
                  placeholder="ABC123"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={6}
                />
              </div>

              <motion.button
                onClick={handleJoin}
                disabled={loading || !name.trim() || code.length < 4}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="btn-red w-full justify-center py-3 mt-2"
              >
                {loading ? '🎞️ Joining...' : '📸 Join the Booth'}
              </motion.button>
            </div>
          </div>

          <p className="text-center text-sm mt-5" style={{ color: '#9a7850' }}>
            Starting a new booth?{' '}
            <Link href="/create?mode=squad" className="underline font-semibold" style={{ color: 'var(--warm-red)' }}>
              Create one →
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  )
}
