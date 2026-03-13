'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

const STEPS = [
  { icon: '🎭', title: 'Pick a theme', desc: 'Birthday, Beach, Garden, Night Out, Cafe, or Y2K' },
  { icon: '📸', title: 'Upload photos', desc: 'Solo: 2–4 shots of you. Squad: one per person.' },
  { icon: '🎞️', title: 'Get your strip', desc: 'A real photobooth strip, developed just for you.' },
  { icon: '🌸', title: 'Add stickers', desc: 'Drag & drop cute stickers, then download.' },
]

const THEMES = [
  { emoji: '🎂', label: 'Birthday',   color: '#ff91a4' },
  { emoji: '☕', label: 'Cafe',       color: '#a0724a' },
  { emoji: '🏖️', label: 'Beach',      color: '#4ab6e8' },
  { emoji: '🌙', label: 'Night Out',  color: '#7c4dbd' },
  { emoji: '🌸', label: 'Garden',     color: '#7ab86a' },
  { emoji: '✨', label: 'Y2K',        color: '#c49bef' },
]

// Fake strip preview frames
const PREVIEW_FRAMES = ['#f0d9c8', '#c8d9f0', '#d9f0c8', '#f0c8d9']

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)', fontFamily: 'var(--font-body)' }}>
      {/* Film strip top decoration */}
      <div className="w-full h-8 flex items-center" style={{ background: 'var(--film-dark)' }}>
        <div className="w-full" style={{
          height: 14,
          backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 5px, #3a2a10 5px, #3a2a10 23px, transparent 23px, transparent 28px)',
        }} />
      </div>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-block px-4 py-1 mb-6 text-xs font-semibold tracking-widest uppercase"
            style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)', color: 'var(--brown)' }}>
            📸 est. today — for every squad
          </div>

          <h1 className="mb-5 leading-tight" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
            fontWeight: 700,
            color: 'var(--film-dark)',
            letterSpacing: '-0.02em',
          }}>
            The Missing<br />
            <span style={{ fontStyle: 'italic', color: 'var(--warm-red)' }}>Booth</span>
          </h1>

          <p className="mb-10 max-w-xl mx-auto" style={{ fontSize: '1.2rem', color: '#5a4028', lineHeight: 1.6 }}>
            The photobooth that was always missing&nbsp;📸
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create?mode=solo">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn-booth text-lg px-8 py-4"
              >
                🎞️ Solo Booth
              </motion.button>
            </Link>
            <Link href="/create?mode=squad">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn-booth-outline text-lg px-8 py-4"
              >
                👯 Squad Booth
              </motion.button>
            </Link>
          </div>

          <p className="mt-4 text-sm" style={{ color: '#9a7850' }}>
            Already have a code?{' '}
            <Link href="/join" className="underline font-semibold" style={{ color: 'var(--warm-red)' }}>
              Join a squad booth →
            </Link>
          </p>
        </motion.div>

        {/* Strip preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-16 flex justify-center"
        >
          <div className="relative" style={{
            width: 160,
            background: 'white',
            border: '6px solid var(--film-dark)',
            borderRadius: 2,
            boxShadow: '8px 8px 0 rgba(0,0,0,0.2)',
            transform: 'rotate(-3deg)',
          }}>
            {/* Header */}
            <div className="py-2 text-center text-xs font-bold tracking-widest"
              style={{ background: 'var(--film-dark)', color: 'var(--cream)' }}>
              THE MISSING BOOTH
            </div>
            {PREVIEW_FRAMES.map((color, i) => (
              <div key={i} className="mx-2 my-2 rounded-sm" style={{ height: 80, background: color, border: '3px solid white' }} />
            ))}
            <div className="py-1 text-center text-xs" style={{ background: 'var(--film-dark)', color: '#e8973a' }}>
              ❤ today
            </div>
          </div>

          {/* Second strip, offset */}
          <div className="relative ml-4" style={{
            width: 160,
            background: 'white',
            border: '6px solid var(--film-dark)',
            borderRadius: 2,
            boxShadow: '8px 8px 0 rgba(0,0,0,0.2)',
            transform: 'rotate(2deg)',
            marginTop: 24,
          }}>
            <div className="py-2 text-center text-xs font-bold tracking-widest"
              style={{ background: 'var(--film-dark)', color: 'var(--cream)' }}>
              THE MISSING BOOTH
            </div>
            {['#f0c8d9', '#c8f0e8', '#f0e8c8', '#e8c8f0'].map((color, i) => (
              <div key={i} className="mx-2 my-2 rounded-sm" style={{ height: 80, background: color, border: '3px solid white' }} />
            ))}
            <div className="py-1 text-center text-xs" style={{ background: 'var(--film-dark)', color: '#e8973a' }}>
              ❤ today
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-center mb-12" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.2rem',
          fontWeight: 700,
          color: 'var(--film-dark)',
        }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="booth-card text-center"
            >
              <div className="text-4xl mb-3">{step.icon}</div>
              <h3 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: '#7a5c3a', lineHeight: 1.6 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Themes */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-center mb-8" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--film-dark)',
        }}>
          Pick your vibe
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {THEMES.map((t) => (
            <Link key={t.label} href={`/create?mode=solo&theme=${t.label.toLowerCase().replace(' ', '_')}`}>
              <motion.div
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-3 cursor-pointer"
                style={{
                  background: 'white',
                  border: `2px solid ${t.color}`,
                  borderRadius: 2,
                  boxShadow: `3px 3px 0 ${t.color}`,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: 'var(--film-dark)',
                }}
              >
                <span className="text-xl">{t.emoji}</span>
                {t.label}
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="booth-card" style={{ border: '2px solid var(--film-dark)' }}>
          <h2 className="mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--film-dark)' }}>
            Ready to step inside?
          </h2>
          <p className="mb-8" style={{ color: '#7a5c3a', fontSize: '1.05rem' }}>
            Solo or squad — your strip is waiting.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/create?mode=solo">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-booth px-8 py-3">
                🎞️ Solo Booth
              </motion.button>
            </Link>
            <Link href="/create?mode=squad">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-booth-outline px-8 py-3">
                👯 Squad Booth
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm" style={{ color: '#9a7850', borderTop: '1px solid var(--border-color)' }}>
        Made with 💖
      </footer>

      {/* Film strip bottom decoration */}
      <div className="w-full h-8 flex items-center overflow-hidden" style={{ background: 'var(--film-dark)' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-5 h-4 mx-1 rounded-sm" style={{ background: '#3a2a10' }} />
        ))}
      </div>
    </div>
  )
}
