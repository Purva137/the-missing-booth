'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { uploadApi } from '@/lib/api'
import { useRoomStore } from '@/lib/store'
import { CameraCapture } from './CameraCapture'

function getImageUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (typeof window === 'undefined') return `http://localhost:8000${url}`
  const h = window.location.hostname
  const base = h === 'localhost' || h === '127.0.0.1' ? 'http://localhost:8000' : `http://${h}:8000`
  return `${base}${url}`
}

// ── Solo uploader — 4 slots in a vertical strip layout ───────────────────────

interface StripUploaderProps {
  roomCode: string
  memberId: string
  isSolo: boolean
  currentPhotos: string[]
}

export function StripUploader({ roomCode, memberId, isSolo, currentPhotos }: StripUploaderProps) {
  const { updateMemberPhoto } = useRoomStore()
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [progress, setProgress]           = useState(0)
  const [cameraSlot, setCameraSlot]       = useState<number | null>(null)

  const uploadToSlot = async (file: File, slot: number) => {
    if (uploadingSlot !== null) return
    setUploadingSlot(slot)
    setProgress(0)
    try {
      const { photo_url } = await uploadApi.uploadPhoto(roomCode, memberId, file, slot, setProgress)
      updateMemberPhoto(memberId, photo_url, slot)
      toast.success(isSolo ? `Photo ${slot + 1} added!` : 'Photo uploaded!')
    } catch {
      toast.error('Upload failed — try again')
    } finally {
      setUploadingSlot(null)
      setProgress(0)
    }
  }

  const onCameraCapture = async (blob: Blob) => {
    if (cameraSlot === null) return
    const slot = cameraSlot
    setCameraSlot(null)
    const file = new File([blob], `camera_slot${slot}.jpg`, { type: 'image/jpeg' })
    await uploadToSlot(file, slot)
  }

  if (isSolo) {
    const filledCount = currentPhotos.filter(Boolean).length
    return (
      <>
        <div className="booth-card">
          <h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
            📸 Add your photos
          </h3>
          <p className="text-xs mb-4" style={{ color: '#9a7850' }}>Upload 2–4 photos — use camera or upload a file</p>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map(slot => (
              <SoloSlot
                key={slot}
                slot={slot}
                photoUrl={currentPhotos[slot]}
                uploading={uploadingSlot === slot}
                progress={uploadingSlot === slot ? progress : 0}
                onFile={(file) => uploadToSlot(file, slot)}
                onCamera={() => setCameraSlot(slot)}
                disabled={uploadingSlot !== null && uploadingSlot !== slot}
              />
            ))}
          </div>
          {filledCount >= 2 && (
            <p className="text-xs mt-3 text-center" style={{ color: '#7ab86a', fontWeight: 600 }}>
              ✓ {filledCount} photo{filledCount > 1 ? 's' : ''} ready{filledCount < 4 ? ` — you can add up to ${4 - filledCount} more` : ''}
            </p>
          )}
        </div>

        <AnimatePresence>
          {cameraSlot !== null && (
            <CameraCapture
              key="solo-camera"
              slot={cameraSlot}
              onCapture={onCameraCapture}
              onClose={() => setCameraSlot(null)}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // Squad: single uploader
  return <SquadSlot roomCode={roomCode} memberId={memberId} currentPhoto={currentPhotos[0]} />
}


// ── Solo slot ─────────────────────────────────────────────────────────────────
function SoloSlot({ slot, photoUrl, uploading, progress, onFile, onCamera, disabled }: {
  slot: number; photoUrl?: string; uploading: boolean; progress: number;
  onFile: (f: File) => void; onCamera: () => void; disabled: boolean;
}) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onFile(files[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled: disabled || uploading,
    noClick: true,
  })

  return (
    <div
      {...getRootProps()}
      className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        height: 130,
        background: isDragActive ? 'var(--aged-paper)' : photoUrl ? 'transparent' : 'var(--cream)',
        border: `2px dashed ${photoUrl ? 'var(--border-color)' : isDragActive ? 'var(--film-dark)' : '#c4b48a'}`,
        borderRadius: 2,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      <input {...getInputProps()} />

      {/* Photo filled state */}
      {photoUrl && !uploading && (
        <>
          <img src={getImageUrl(photoUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          {/* Hover overlay with retake/replace */}
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5"
            style={{ background: 'rgba(26,16,8,0.78)' }}>
            <button onClick={onCamera} disabled={disabled}
              style={{ background: 'var(--warm-amber)', border: 'none', borderRadius: 2, color: 'var(--film-dark)', cursor: disabled ? 'not-allowed' : 'pointer', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700 }}>
              📷 Retake
            </button>
            <button onClick={open} disabled={disabled}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, color: 'white', cursor: disabled ? 'not-allowed' : 'pointer', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700 }}>
              🖼️ Replace
            </button>
          </div>
          <div className="absolute bottom-0 right-0 px-1.5 py-0.5 text-xs font-bold"
            style={{ background: 'rgba(26,16,8,0.7)', color: 'white' }}>
            #{slot + 1} ✓
          </div>
        </>
      )}

      {/* Upload in progress */}
      {uploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: 'rgba(253,248,240,0.92)' }}>
          <div className="text-xs font-mono mb-2" style={{ color: 'var(--film-dark)' }}>Developing...</div>
          <div className="w-3/4 h-1.5 overflow-hidden" style={{ background: 'var(--border-color)' }}>
            <div className="h-full film-progress transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!photoUrl && !uploading && (
        isDragActive ? (
          <div className="text-center select-none">
            <div className="text-xl mb-1">📥</div>
            <div className="text-xs font-semibold" style={{ color: 'var(--film-dark)' }}>Drop here</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-semibold mb-0.5" style={{ color: '#9a7850' }}>Slot {slot + 1}</div>
            <div className="flex gap-1.5">
              <button
                onClick={onCamera}
                disabled={disabled}
                style={{
                  background: 'var(--film-dark)', border: 'none', borderRadius: 2, color: 'white',
                  cursor: disabled ? 'not-allowed' : 'pointer', padding: '5px 8px',
                  fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}
                title="Take a photo"
              >
                <span style={{ fontSize: '1rem' }}>📷</span>
                <span>Camera</span>
              </button>
              <button
                onClick={open}
                disabled={disabled}
                style={{
                  background: 'var(--aged-paper)', border: '1px solid var(--border-color)', borderRadius: 2,
                  color: 'var(--film-dark)', cursor: disabled ? 'not-allowed' : 'pointer', padding: '5px 8px',
                  fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}
                title="Upload a photo"
              >
                <span style={{ fontSize: '1rem' }}>🖼️</span>
                <span>Upload</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}


// ── Squad: single photo uploader ─────────────────────────────────────────────
function SquadSlot({ roomCode, memberId, currentPhoto }: {
  roomCode: string; memberId: string; currentPhoto?: string;
}) {
  const { updateMemberPhoto }     = useRoomStore()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [cameraOpen, setCameraOpen] = useState(false)

  const doUpload = async (file: File) => {
    if (uploading) return
    setUploading(true)
    setProgress(0)
    try {
      const { photo_url } = await uploadApi.uploadPhoto(roomCode, memberId, file, 0, setProgress)
      updateMemberPhoto(memberId, photo_url, 0)
      toast.success('Photo uploaded!')
    } catch {
      toast.error('Upload failed — try again')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const onCameraCapture = async (blob: Blob) => {
    setCameraOpen(false)
    const file = new File([blob], 'camera_squad.jpg', { type: 'image/jpeg' })
    await doUpload(file)
  }

  const onDrop = useCallback(async (files: File[]) => {
    if (files[0]) await doUpload(files[0])
  }, [uploading, roomCode, memberId, updateMemberPhoto])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading,
    noClick: true,
  })

  return (
    <>
      <div className="booth-card">
        <h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--film-dark)' }}>
          📸 Your photo
        </h3>
        <p className="text-xs mb-4" style={{ color: '#9a7850' }}>One shot for the squad strip</p>

        <AnimatePresence mode="wait">
          {currentPhoto && !uploading ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative overflow-hidden"
              style={{ height: 160, border: '2px solid var(--border-color)', borderRadius: 2 }}>
              <img src={getImageUrl(currentPhoto)} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 py-2 text-center text-xs font-bold"
                style={{ background: 'rgba(26,16,8,0.7)', color: '#e8973a' }}>
                ✓ Photo uploaded
              </div>
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
                style={{ background: 'rgba(26,16,8,0.75)' }}>
                <button onClick={() => setCameraOpen(true)}
                  style={{ background: 'var(--warm-amber)', border: 'none', borderRadius: 2, color: 'var(--film-dark)', cursor: 'pointer', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700 }}>
                  📷 Retake
                </button>
                <button onClick={open}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, color: 'white', cursor: 'pointer', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700 }}>
                  🖼️ Replace
                </button>
              </div>
              <div {...getRootProps()} className="absolute inset-0 pointer-events-none">
                <input {...getInputProps()} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="upload"
              className="flex flex-col items-center justify-center transition-all"
              style={{
                height: 160,
                background: isDragActive ? 'var(--aged-paper)' : 'var(--cream)',
                border: `2px dashed ${isDragActive ? 'var(--film-dark)' : '#c4b48a'}`,
                borderRadius: 2,
              }}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="text-center w-full px-6">
                  <div className="text-2xl mb-3 animate-film-roll">🎞️</div>
                  <div className="text-sm font-semibold mb-2" style={{ color: 'var(--film-dark)' }}>Uploading...</div>
                  <div className="w-full h-2 overflow-hidden" style={{ background: 'var(--border-color)' }}>
                    <div className="h-full film-progress transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : isDragActive ? (
                <div className="text-center">
                  <div className="text-3xl mb-2">📥</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--film-dark)' }}>Drop it here!</div>
                </div>
              ) : (
                <div className="text-center select-none">
                  <div className="text-3xl mb-3">📸</div>
                  <div className="flex gap-2 mb-2 justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCameraOpen(true) }}
                      style={{
                        background: 'var(--film-dark)', border: 'none', borderRadius: 2,
                        color: 'white', cursor: 'pointer', padding: '7px 16px',
                        fontSize: '0.75rem', fontWeight: 700,
                      }}
                    >
                      📷 Camera
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); open() }}
                      style={{
                        background: 'var(--aged-paper)', border: '1px solid var(--border-color)',
                        borderRadius: 2, color: 'var(--film-dark)', cursor: 'pointer',
                        padding: '7px 16px', fontSize: '0.75rem', fontWeight: 700,
                      }}
                    >
                      🖼️ Upload
                    </button>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#9a7850' }}>or drag a photo here</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {cameraOpen && (
          <CameraCapture
            key="squad-camera"
            slot={0}
            onCapture={onCameraCapture}
            onClose={() => setCameraOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
