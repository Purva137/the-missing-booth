'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera } from 'lucide-react'

const FILTERS = [
  { id: 'normal',  label: 'Normal',  css: 'none' },
  { id: 'warm',    label: 'Warm',    css: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' },
  { id: 'cool',    label: 'Cool',    css: 'saturate(0.8) hue-rotate(30deg) brightness(1.05)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.5) contrast(1.1) brightness(0.9)' },
  { id: 'bw',      label: 'B&W',     css: 'grayscale(1) contrast(1.1)' },
  { id: 'dreamy',  label: 'Dreamy',  css: 'brightness(1.1) saturate(1.3) hue-rotate(15deg)' },
]

interface CameraCaptureProps {
  slot: number
  onCapture: (blob: Blob) => void
  onClose: () => void
}

export function CameraCapture({ slot, onCapture, onClose }: CameraCaptureProps) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)

  const [filter,      setFilter]      = useState('normal')
  const [countdown,   setCountdown]   = useState<number | null>(null)
  const [capturing,   setCapturing]   = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const currentFilterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none'

  useEffect(() => {
    let active = true
    const startCamera = async () => {
      // getUserMedia requires HTTPS (or localhost) — show a clear message on plain HTTP
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setCameraError('Camera requires HTTPS. Use the Upload button instead 📁')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        if (active) setCameraError('Camera access denied. Please allow camera permissions.')
      }
    }
    startCamera()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const doCapture = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!

    // Mirror the capture to match the preview (selfie feel)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    if (currentFilterCss !== 'none') ctx.filter = currentFilterCss
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      if (blob) onCapture(blob)
    }, 'image/jpeg', 0.92)
  }, [currentFilterCss, onCapture])

  const startCountdown = useCallback(() => {
    if (countdown !== null || capturing || cameraError) return
    setCapturing(true)
    setCountdown(3)
    let c = 3
    const tick = setInterval(() => {
      c--
      if (c <= 0) {
        clearInterval(tick)
        setCountdown(null)
        setCapturing(false)
        doCapture()
      } else {
        setCountdown(c)
      }
    }, 1000)
  }, [countdown, capturing, cameraError, doCapture])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0a0604' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <span style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1rem', fontWeight: 700 }}>
          📷 Slot {slot + 1}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}>
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera preview */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {cameraError ? (
          <div className="text-center px-8">
            <div className="text-5xl mb-4">📵</div>
            <p style={{ color: '#e8973a', fontSize: '1rem', lineHeight: 1.5 }}>{cameraError}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              width: '100%', maxWidth: 480, height: 'auto',
              transform: 'scaleX(-1)',
              filter: currentFilterCss === 'none' ? undefined : currentFilterCss,
            }}
          />
        )}

        {/* Countdown overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span style={{
                fontSize: '9rem', fontWeight: 900, color: 'white',
                textShadow: '0 0 60px rgba(232,151,58,0.9)',
                fontFamily: 'var(--font-display)',
              }}>
                {countdown}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter strip */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              flexShrink: 0,
              padding: '5px 14px',
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === f.id ? 'var(--warm-amber)' : 'rgba(255,255,255,0.1)',
              color: filter === f.id ? 'var(--film-dark)' : 'white',
              border: filter === f.id ? '1px solid var(--warm-amber)' : '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Capture button */}
      <div className="pb-10 pt-5 flex justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <motion.button
          onClick={startCountdown}
          disabled={!!cameraError || capturing}
          whileTap={{ scale: 0.88 }}
          style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'white',
            border: '5px solid rgba(255,255,255,0.35)',
            boxShadow: '0 0 0 8px rgba(255,255,255,0.12)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!!cameraError || capturing) ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <Camera className="w-8 h-8" style={{ color: 'var(--film-dark)' }} />
        </motion.button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </motion.div>
  )
}
