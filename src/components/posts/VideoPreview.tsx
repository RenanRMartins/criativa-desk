import { useState, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Film } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface VideoPreviewProps {
  src?: string
  thumbnailUrl?: string
  title?: string
  duration?: number
  aspectRatio?: '9:16' | '1:1' | '4:5' | '16:9' | '4:3'
  className?: string
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

const ASPECT_CLASSES: Record<string, string> = {
  '9:16': 'aspect-[9/16]',
  '1:1':  'aspect-square',
  '4:5':  'aspect-[4/5]',
  '16:9': 'aspect-video',
  '4:3':  'aspect-[4/3]',
}

export function VideoPreview({
  src,
  thumbnailUrl,
  title,
  duration,
  aspectRatio = '9:16',
  className = '',
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(duration ?? 0)
  const [showControls, setShowControls] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  function togglePlay() {
    const v = videoRef.current
    if (!v || !src) return
    if (playing) { v.pause() } else { v.play() }
    setPlaying(!playing)
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    setProgress((v.currentTime / v.duration) * 100)
  }

  function handleLoadedMetadata() {
    const v = videoRef.current
    if (!v) return
    setVideoDuration(v.duration)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * v.duration
  }

  function toggleFullscreen() {
    const v = videoRef.current
    if (!v) return
    if (!fullscreen) {
      v.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setFullscreen(!fullscreen)
  }

  // No src — show placeholder
  if (!src) {
    return (
      <div
        className={`${ASPECT_CLASSES[aspectRatio]} rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3 ${className}`}
        style={{ background: 'var(--color-black-soft)' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <Film size={20} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {title ?? 'Sem vídeo'}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`${ASPECT_CLASSES[aspectRatio]} rounded-2xl overflow-hidden relative group cursor-pointer ${className}`}
      style={{ background: '#000' }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={togglePlay}
    >
      {/* Thumbnail */}
      {thumbnailUrl && !playing && (
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        playsInline
      />

      {/* Play/Pause overlay */}
      <AnimatePresence>
        {(!playing || showControls) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: playing ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)' }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            >
              {playing
                ? <Pause size={22} color="white" fill="white" />
                : <Play size={22} color="white" fill="white" />
              }
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-0 left-0 right-0 p-3"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div
              className="w-full h-1 rounded-full mb-2 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.25)' }}
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: 'var(--color-wine-light)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted }}
                  className="cursor-pointer hover:text-white transition-colors"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="cursor-pointer hover:text-white transition-colors"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
