'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, RotateCcw, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRoomSocket } from '@/hooks/useSocket'
import { useRoomStore } from '@/lib/store'
import { generateApi } from '@/lib/api'
import type { Room, StickerPlacement, ThemeType } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getImageUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

// ── Sticker palette ───────────────────────────────────────────────────────────
const STICKER_ROWS = [
  ['🌸', '⭐', '🎀', '💕', '✨', '🌈', '🎉', '💫'],
  ['🍕', '🧋', '🍓', '🍩', '🌴', '🌻', '🦋', '🐝'],
  ['🎸', '🎮', '🎨', '🪄', '💎', '👑', '🔥', '💥'],
  ['🐰', '🐱', '🦊', '🐻', '🍀', '🫧', '🫶', '🌺'],
  ['🥂', '🎊', '🎁', '🪅', '🌙', '🎯', '🤍', '🎯'],
]

// ── CSS filters ───────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'normal',  label: 'Normal',  emoji: '',   css: 'none' },
  { id: 'warm',    label: 'Warm',    emoji: '🌅',  css: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' },
  { id: 'cool',    label: 'Cool',    emoji: '🩵',  css: 'saturate(0.8) hue-rotate(30deg) brightness(1.05)' },
  { id: 'vintage', label: 'Vintage', emoji: '📷',  css: 'sepia(0.5) contrast(1.1) brightness(0.9)' },
  { id: 'bw',      label: 'B&W',     emoji: '🖤',  css: 'grayscale(1) contrast(1.1)' },
  { id: 'dreamy',  label: 'Dreamy',  emoji: '🌸',  css: 'brightness(1.1) saturate(1.3) hue-rotate(15deg)' },
]

// ── Theme config ──────────────────────────────────────────────────────────────
const THEMES: { id: ThemeType; emoji: string; label: string; color: string }[] = [
  { id: 'birthday',  emoji: '🎂', label: 'Birthday',  color: '#ff91a4' },
  { id: 'cafe',      emoji: '☕', label: 'Cafe',       color: '#a0724a' },
  { id: 'beach',     emoji: '🏖️', label: 'Beach',      color: '#4ab6e8' },
  { id: 'night_out', emoji: '🌙', label: 'Night Out',  color: '#7c4dbd' },
  { id: 'garden',    emoji: '🌸', label: 'Garden',     color: '#7ab86a' },
  { id: 'y2k',       emoji: '✨', label: 'Y2K',        color: '#c49bef' },
]

interface StickerItem extends StickerPlacement {}

export function ResultView({ room }: { room: Room }) {
  const { myMemberId, myName } = useRoomStore()
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const imgRef       = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rethemeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── State ─────────────────────────────────────────────────────────────────
  const [stripUrl, setStripUrl]             = useState(() => getImageUrl(room.strip_image))
  const [stickers, setStickers]             = useState<StickerItem[]>([])
  const [dragging, setDragging]             = useState<string | null>(null)
  const [dragOffset, setDragOffset]         = useState({ x: 0, y: 0 })
  const [imgLoaded, setImgLoaded]           = useState(false)
  const [canvasSize, setCanvasSize]         = useState({ w: 0, h: 0 })
  const [copied, setCopied]                 = useState(false)
  const [selectedSticker, setSelected]      = useState<string | null>(null)
  const [activeFilter, setActiveFilter]     = useState(FILTERS[0])
  const [activeTheme, setActiveTheme]       = useState<ThemeType>(room.theme)
  const [customText, setCustomText]         = useState('')
  const [rethemeLoading, setRethemeLoading] = useState(false)

  // ── Socket sticker sync (squad) ───────────────────────────────────────────
  const { emitStickerAdded, emitStickerCleared } = useRoomSocket({
    room_code: room.code,
    member_id: myMemberId || '',
    member_name: myName || '',
    onStickerAdded: (data) => {
      setStickers(prev => {
        if (prev.find(s => s.sticker_id === data.sticker_id)) return prev
        const canvas = canvasRef.current
        if (!canvas) return prev
        return [...prev, { ...data, x: data.x * canvas.width, y: data.y * canvas.height }]
      })
    },
    onStickerCleared: () => setStickers([]),
  })

  // ── Load image → size canvas ─────────────────────────────────────────────
  useEffect(() => {
    if (!stripUrl) return
    setImgLoaded(false)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `${stripUrl}?t=${Date.now()}`
    img.onload = () => {
      imgRef.current = img
      const maxW = Math.min(containerRef.current?.clientWidth ?? 360, 400)
      const scale = maxW / img.naturalWidth
      setCanvasSize({ w: maxW, h: img.naturalHeight * scale })
      setImgLoaded(true)
    }
  }, [stripUrl])

  // ── Draw canvas ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img || !imgLoaded) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = canvasSize.w
    canvas.height = canvasSize.h
    ctx.drawImage(img, 0, 0, canvasSize.w, canvasSize.h)
    ctx.font = `${Math.round(canvasSize.w * 0.07)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const s of stickers) ctx.fillText(s.emoji, s.x, s.y)
    if (selectedSticker) {
      const s = stickers.find(st => st.sticker_id === selectedSticker)
      if (s) {
        const r = canvasSize.w * 0.05
        ctx.strokeStyle = 'rgba(200,55,45,0.7)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(s.x - r - 4, s.y - r - 4, r * 2 + 8, r * 2 + 8)
        ctx.setLineDash([])
      }
    }
  }, [stickers, imgLoaded, canvasSize, selectedSticker])

  // ── Retheme ───────────────────────────────────────────────────────────────
  const doRetheme = useCallback(async (theme: ThemeType, text: string) => {
    console.log('[retheme] starting', { room_code: room.code, theme, custom_text: text.trim() || undefined })
    setRethemeLoading(true)
    try {
      const payload = { room_code: room.code, theme, custom_text: text.trim() || undefined }
      const result = await generateApi.retheme(payload)
      console.log('[retheme] success', result)
      // Append a fresh timestamp so the browser doesn't serve the cached result.jpg
      setStripUrl(`${getImageUrl(result.image_url)}?t=${Date.now()}`)
      setStickers([])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail ?? (err as { message?: string })?.message ?? 'Unknown error'
      console.error('[retheme] FAILED', err)
      toast.error(`Retheme failed: ${msg}`)
    } finally {
      setRethemeLoading(false)
    }
  }, [room.code])

  const handleThemeSelect = (theme: ThemeType) => {
    console.log('[retheme] theme clicked:', theme)
    setActiveTheme(theme)
    doRetheme(theme, customText)
  }

  const handleCustomTextChange = (val: string) => {
    if (val.length > 30) return
    setCustomText(val)
    if (rethemeTimer.current) clearTimeout(rethemeTimer.current)
    rethemeTimer.current = setTimeout(() => doRetheme(activeTheme, val), 700)
  }

  // ── Add sticker ───────────────────────────────────────────────────────────
  const addSticker = (emoji: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const x  = canvas.width  / 2 + (Math.random() - 0.5) * 60
    const y  = canvas.height * 0.3 + Math.random() * canvas.height * 0.4
    const placement: StickerItem = { sticker_id: id, emoji, x, y }
    setStickers(prev => [...prev, placement])
    setSelected(id)
    if (room.mode === 'squad') {
      emitStickerAdded({ sticker_id: id, emoji, x: x / canvas.width, y: y / canvas.height })
    }
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const mx     = (e.clientX - rect.left) * (canvas.width / rect.width)
    const my     = (e.clientY - rect.top)  * (canvas.height / rect.height)
    const r      = canvasSize.w * 0.05
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i]
      if (Math.abs(mx - s.x) < r + 6 && Math.abs(my - s.y) < r + 6) {
        setDragging(s.sticker_id)
        setSelected(s.sticker_id)
        setDragOffset({ x: mx - s.x, y: my - s.y })
        e.preventDefault()
        return
      }
    }
    setSelected(null)
  }
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const mx     = (e.clientX - rect.left) * (canvas.width / rect.width)
    const my     = (e.clientY - rect.top)  * (canvas.height / rect.height)
    setStickers(prev => prev.map(s =>
      s.sticker_id === dragging ? { ...s, x: mx - dragOffset.x, y: my - dragOffset.y } : s
    ))
  }
  const onCanvasMouseUp = () => setDragging(null)

  // ── Touch drag (mobile) ───────────────────────────────────────────────────
  const onCanvasTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch  = e.touches[0]
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const mx     = (touch.clientX - rect.left) * (canvas.width / rect.width)
    const my     = (touch.clientY - rect.top)  * (canvas.height / rect.height)
    const r      = canvasSize.w * 0.05
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i]
      if (Math.abs(mx - s.x) < r + 6 && Math.abs(my - s.y) < r + 6) {
        setDragging(s.sticker_id)
        setSelected(s.sticker_id)
        setDragOffset({ x: mx - s.x, y: my - s.y })
        return
      }
    }
    setSelected(null)
  }
  const onCanvasTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!dragging) return
    const touch  = e.touches[0]
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const mx     = (touch.clientX - rect.left) * (canvas.width / rect.width)
    const my     = (touch.clientY - rect.top)  * (canvas.height / rect.height)
    setStickers(prev => prev.map(s =>
      s.sticker_id === dragging ? { ...s, x: mx - dragOffset.x, y: my - dragOffset.y } : s
    ))
  }
  const onCanvasTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    setDragging(null)
  }

  const clearStickers = () => {
    setStickers([])
    setSelected(null)
    if (room.mode === 'squad') emitStickerCleared()
  }
  const deleteSelected = () => {
    if (!selectedSticker) return
    setStickers(prev => prev.filter(s => s.sticker_id !== selectedSticker))
    setSelected(null)
  }

  // ── Download (bakes filter + stickers) ───────────────────────────────────
  const download = () => {
    const srcCanvas = canvasRef.current
    if (!srcCanvas) return
    try {
      const off = document.createElement('canvas')
      off.width  = srcCanvas.width
      off.height = srcCanvas.height
      const ctx = off.getContext('2d')!
      if (activeFilter.css !== 'none') ctx.filter = activeFilter.css
      ctx.drawImage(srcCanvas, 0, 0)
      off.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url
        a.download = `missing-booth-${room.code}.jpg`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Strip downloaded!')
      }, 'image/jpeg', 0.95)
    } catch {
      window.open(stripUrl)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join`)
    setCopied(true)
    toast.success('Join link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const currentThemeCfg = THEMES.find(t => t.id === activeTheme) ?? THEMES[1]

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)', fontFamily: 'var(--font-body)' }}>
      {/* Film strip header */}
      <div className="w-full h-6" style={{
        background: 'var(--film-dark)',
        backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 5px, #3a2a10 5px, #3a2a10 23px, transparent 23px, transparent 28px)',
        backgroundPosition: '0 center',
        backgroundSize: '28px 12px',
        backgroundRepeat: 'repeat-x',
      }} />

      {/* Nav */}
      <nav className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--warm-white)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--film-dark)' }}>
          The Missing Booth
        </span>
        <Link href="/">
          <button className="btn-booth-outline text-sm px-4 py-2">Open another booth</button>
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-center mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--film-dark)' }}>
            Your strip is ready! 🎞️
          </h1>
          <p className="text-center mb-8 text-sm" style={{ color: '#7a5c3a' }}>
            Change the frame, add a message, layer stickers — then download 📸
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

          {/* ── Strip column ── */}
          <div className="flex-shrink-0" style={{ width: 'min(100vw - 2rem, 400px)' }}>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 2,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: activeFilter.id === f.id ? '2px solid var(--film-dark)' : '1px solid var(--border-color)',
                    background: activeFilter.id === f.id ? 'var(--film-dark)' : 'var(--warm-white)',
                    color: activeFilter.id === f.id ? 'white' : 'var(--film-dark)',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="relative">
              {!imgLoaded && (
                <div className="flex items-center justify-center"
                  style={{ height: 400, background: 'var(--aged-paper)', border: '2px solid var(--border-color)' }}>
                  <div className="text-4xl animate-film-roll">🎞️</div>
                </div>
              )}
              <AnimatePresence>
                {imgLoaded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                    <canvas
                      ref={canvasRef}
                      width={canvasSize.w}
                      height={canvasSize.h}
                      style={{
                        display: 'block',
                        width: '100%',
                        cursor: dragging ? 'grabbing' : 'default',
                        border: `3px solid ${currentThemeCfg.color}`,
                        boxShadow: `6px 6px 0 ${currentThemeCfg.color}55`,
                        filter: activeFilter.css !== 'none' ? activeFilter.css : undefined,
                      }}
                      onMouseDown={onCanvasMouseDown}
                      onMouseMove={onCanvasMouseMove}
                      onMouseUp={onCanvasMouseUp}
                      onMouseLeave={onCanvasMouseUp}
                      onTouchStart={onCanvasTouchStart}
                      onTouchMove={onCanvasTouchMove}
                      onTouchEnd={onCanvasTouchEnd}
                    />
                    {/* Retheme loading overlay */}
                    <AnimatePresence>
                      {rethemeLoading && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center"
                          style={{ background: 'rgba(253,248,240,0.9)', backdropFilter: 'blur(3px)' }}
                        >
                          <div className="text-4xl mb-3 animate-film-roll">🎞️</div>
                          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--film-dark)', fontWeight: 700 }}>
                            Developing…
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Download / share */}
            <div className="flex gap-3 mt-4">
              <motion.button
                onClick={download}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-red flex-1 justify-center py-3"
              >
                <Download className="w-4 h-4" /> Download
              </motion.button>
              {room.mode === 'squad' && (
                <motion.button
                  onClick={copyCode}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="btn-booth-outline px-4 py-3"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </motion.button>
              )}
            </div>
          </div>

          {/* ── Controls column ── */}
          <div className="flex-1 min-w-0 max-w-sm w-full space-y-4">

            {/* Frame selector */}
            <div className="booth-card">
              <h2 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
                🖼️ Change frame
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeSelect(t.id)}
                    disabled={rethemeLoading}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 2,
                      border: `2px solid ${activeTheme === t.id ? t.color : 'var(--border-color)'}`,
                      background: activeTheme === t.id ? `${t.color}22` : 'var(--cream)',
                      cursor: rethemeLoading ? 'not-allowed' : 'pointer',
                      opacity: rethemeLoading ? 0.6 : 1,
                      transition: 'all 0.15s',
                      textAlign: 'center' as const,
                    }}
                  >
                    <div style={{ fontSize: '1.3rem' }}>{t.emoji}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--film-dark)', marginTop: 2 }}>
                      {t.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom footer text */}
            <div className="booth-card">
              <h2 className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
                ✍️ Footer message
              </h2>
              <p className="text-xs mb-3" style={{ color: '#9a7850' }}>
                Replaces the date — updates after you stop typing
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={customText}
                  onChange={e => handleCustomTextChange(e.target.value)}
                  placeholder='e.g. "bestie era 💕" or "summer 2025"'
                  maxLength={30}
                  disabled={rethemeLoading}
                  className="booth-input w-full pr-12"
                  style={{ fontSize: '0.85rem' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9a7850', pointerEvents: 'none' }}>
                  {customText.length}/30
                </span>
              </div>
              {rethemeLoading && (
                <p className="text-xs mt-2" style={{ color: 'var(--warm-amber)' }}>⏳ Developing new strip…</p>
              )}
            </div>

            {/* Sticker panel */}
            <div className="booth-card">
              <h2 className="font-bold mb-3" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
                🌸 Add stickers
              </h2>
              <p className="text-xs mb-3" style={{ color: '#9a7850' }}>
                Click to add · drag to reposition{room.mode === 'squad' ? ' · squad sees live!' : ''}
              </p>

              {STICKER_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-0.5 mb-1 flex-wrap">
                  {row.map((emoji, ei) => (
                    <motion.button
                      key={`${ri}-${ei}`}
                      onClick={() => addSticker(emoji)}
                      whileHover={{ scale: 1.35 }} whileTap={{ scale: 0.85 }}
                      style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              ))}

              <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                {selectedSticker && (
                  <button onClick={deleteSelected} className="btn-booth-outline text-xs px-3 py-2 flex-1">
                    🗑 Delete
                  </button>
                )}
                <button onClick={clearStickers}
                  className="btn-booth-outline text-xs px-3 py-2 flex-1 flex items-center gap-1.5 justify-center">
                  <RotateCcw className="w-3 h-3" /> Clear all
                </button>
              </div>

              {stickers.length > 0 && (
                <p className="text-xs mt-2 text-center" style={{ color: '#9a7850' }}>
                  {stickers.length} sticker{stickers.length !== 1 ? 's' : ''} added
                </p>
              )}
            </div>

            <div className="p-3 text-center" style={{ background: 'var(--aged-paper)', border: '1px solid var(--border-color)', borderRadius: 2 }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--film-dark)' }}>
                💡 Filter & stickers are baked into your download
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
