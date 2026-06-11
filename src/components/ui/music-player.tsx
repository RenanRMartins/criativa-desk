import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue } from 'motion/react'
import {
  Music2, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ChevronDown, ExternalLink, Shuffle, Repeat, X, Headphones,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

const POS_KEY = 'music-player-pos'

function getSavedPos() {
  try {
    const s = localStorage.getItem(POS_KEY)
    if (s) return JSON.parse(s) as { x: number; y: number }
  } catch {}
  return { x: 0, y: 0 }
}

function isDemo(token: string | null) { return !token || token.startsWith('demo-token') }

type Provider = 'spotify' | 'youtube' | null

interface Track {
  title: string
  artist: string
  cover: string
  duration: number
}

interface NowPlaying {
  playing: boolean
  progressMs: number
  volume: number | null
  track: {
    title: string
    artist: string
    cover: string | null
    durationMs: number
    url: string | null
  } | null
}

const DEMO_TRACKS: Track[] = [
  { title: 'Weightless', artist: 'Marconi Union', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&q=80', duration: 228 },
  { title: 'Lo-Fi Study Beats', artist: 'Chillhop Music', cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=80&q=80', duration: 185 },
  { title: 'Brain Food', artist: 'Various Artists', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&q=80', duration: 204 },
]

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export function MusicPlayer() {
  const { token } = useAuthStore()
  const demo = isDemo(token)

  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [provider, setProvider] = useState<Provider>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [trackIdx, setTrackIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(80)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [spotifyName, setSpotifyName] = useState<string | null>(null)
  const [now, setNow] = useState<NowPlaying | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noticeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const realSpotify = !demo && provider === 'spotify' && spotifyConnected

  const saved = getSavedPos()
  const x = useMotionValue(saved.x)
  const y = useMotionValue(saved.y)

  function savePos() {
    localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() }))
  }

  const dragProps = {
    drag: true as const,
    dragMomentum: false,
    dragElastic: 0.05,
    style: { x, y },
    onDragEnd: savePos,
  }

  const track = DEMO_TRACKS[trackIdx]

  function showNotice(msg: string) {
    setNotice(msg)
    if (noticeRef.current) clearTimeout(noticeRef.current)
    noticeRef.current = setTimeout(() => setNotice(null), 4000)
  }

  // Volta do OAuth do Spotify (?music_success / ?music_error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('music_success')) {
      setOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('music_error')) {
      setOpen(true)
      showNotice('Não foi possível conectar o Spotify. Tente novamente.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Status da conexão Spotify ao abrir o player
  useEffect(() => {
    if (!open || demo) return
    api.get<{ connected: boolean; profileName: string | null }>('/music/status')
      .then(s => {
        setSpotifyConnected(s.connected)
        setSpotifyName(s.profileName)
        if (s.connected) setProvider('spotify')
      })
      .catch(() => {})
  }, [open, demo])

  // Polling da faixa atual (modo real)
  useEffect(() => {
    if (!realSpotify || !open || minimized) return
    let active = true
    const load = () =>
      api.get<NowPlaying>('/music/spotify/now-playing')
        .then(d => { if (active) setNow(d) })
        .catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => { active = false; clearInterval(id) }
  }, [realSpotify, open, minimized])

  // Avanço local do progresso entre polls (modo real)
  useEffect(() => {
    if (!realSpotify || !now?.playing) return
    const id = setInterval(() => {
      setNow(n => n?.track
        ? { ...n, progressMs: Math.min(n.progressMs + 1000, n.track.durationMs) }
        : n)
    }, 1000)
    return () => clearInterval(id)
  }, [realSpotify, now?.playing])

  // Progresso demo
  useEffect(() => {
    if (realSpotify) return
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= track.duration) {
            nextTrack()
            return 0
          }
          return p + 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, trackIdx, realSpotify])

  function nextTrack() {
    setTrackIdx(i => shuffle ? Math.floor(Math.random() * DEMO_TRACKS.length) : (i + 1) % DEMO_TRACKS.length)
    setProgress(0)
  }
  function prevTrack() {
    setTrackIdx(i => (i - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length)
    setProgress(0)
  }

  async function selectProvider(p: Exclude<Provider, null>) {
    if (p === 'youtube' || demo) { setProvider(p); return }
    if (spotifyConnected) { setProvider('spotify'); return }
    try {
      const { url } = await api.get<{ url: string }>('/music/spotify/auth-url')
      window.location.href = url
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'Spotify indisponível')
    }
  }

  async function control(action: 'play' | 'pause' | 'next' | 'previous' | 'volume', vol?: number) {
    try {
      await api.post('/music/spotify/control', { action, volume: vol })
      if (action === 'play') setNow(n => n ? { ...n, playing: true } : n)
      if (action === 'pause') setNow(n => n ? { ...n, playing: false } : n)
      if (action === 'next' || action === 'previous') {
        setTimeout(() => {
          api.get<NowPlaying>('/music/spotify/now-playing').then(setNow).catch(() => {})
        }, 600)
      }
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'Erro no controle')
    }
  }

  async function disconnectSpotify() {
    try { await api.delete('/music/spotify') } catch {}
    setSpotifyConnected(false)
    setSpotifyName(null)
    setNow(null)
    setProvider(null)
  }

  // Valores exibidos: reais (Spotify) ou demo
  const display = realSpotify
    ? {
        title: now?.track?.title ?? 'Nada tocando agora',
        artist: now?.track?.artist ?? 'Dê o play no app do Spotify',
        cover: now?.track?.cover ?? null,
        isPlaying: now?.playing ?? false,
        progressSec: Math.floor((now?.progressMs ?? 0) / 1000),
        durationSec: Math.floor((now?.track?.durationMs ?? 0) / 1000),
        link: now?.track?.url ?? 'https://open.spotify.com',
      }
    : {
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        isPlaying: playing,
        progressSec: progress,
        durationSec: track.duration,
        link: provider === 'spotify' ? 'https://open.spotify.com' : 'https://music.youtube.com',
      }

  if (!open) {
    return (
      <motion.button
        {...dragProps}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl"
        style={{
          ...dragProps.style,
          background: 'linear-gradient(135deg, #0A0608 0%, #1A0D12 100%)',
          border: '1px solid rgba(196,105,122,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(196,105,122,0.1)',
        }}
        title="Player de música"
      >
        <Music2 size={18} style={{ color: 'var(--color-wine-light)' }} />
        {display.isPlaying && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </motion.button>
    )
  }

  return (
    <motion.div
      {...dragProps}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-80 rounded-3xl overflow-hidden"
      style={{
        ...dragProps.style,
        background: 'linear-gradient(160deg, #0F0A0D 0%, #1A0D12 60%, #0F0C0E 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,105,122,0.1)',
      }}
    >
      {/* Header — drag handle */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Headphones size={14} style={{ color: 'var(--color-wine-light)' }} />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Music Player
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <ChevronDown size={14} className={minimized ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
          </button>
          <button onClick={() => { setOpen(false); setPlaying(false) }} className="p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Provider select */}
            {!provider ? (
              <div className="px-4 pb-4">
                <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Conecte sua plataforma favorita
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => selectProvider('spotify')}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all hover:scale-105"
                    style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.15)' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span className="text-xs font-medium" style={{ color: '#1DB954' }}>Spotify</span>
                  </button>
                  <button
                    onClick={() => selectProvider('youtube')}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all hover:scale-105"
                    style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.15)' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF0000">
                      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507 0-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                    </svg>
                    <span className="text-xs font-medium" style={{ color: '#FF0000' }}>YouTube Music</span>
                  </button>
                </div>
                {notice && (
                  <p className="text-xs text-center mt-3" style={{ color: '#F87171' }}>{notice}</p>
                )}
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-4">
                {/* Connected badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {realSpotify
                        ? `Spotify · ${spotifyName ?? 'conectado'}`
                        : `${provider === 'spotify' ? 'Spotify' : 'YouTube Music'} · demo`}
                    </span>
                  </div>
                  <button
                    onClick={() => realSpotify ? disconnectSpotify() : setProvider(null)}
                    className="text-xs cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {realSpotify ? 'Desconectar' : 'Trocar'}
                  </button>
                </div>

                {/* Cover + track info */}
                <div className="flex items-center gap-3">
                  {display.cover ? (
                    <img
                      src={display.cover}
                      alt={display.title}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <Music2 size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-semibold text-sm text-white truncate">{display.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{display.artist}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-1 h-1 rounded-full" style={{ background: provider === 'spotify' ? '#1DB954' : '#FF0000' }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                        {provider === 'spotify' ? 'Spotify' : 'YouTube Music'}
                      </span>
                    </div>
                  </div>
                  <a href={display.link} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div
                    className="w-full h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.1)', cursor: realSpotify ? 'default' : 'pointer' }}
                    onClick={e => {
                      if (realSpotify) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const pct = (e.clientX - rect.left) / rect.width
                      setProgress(Math.floor(pct * track.duration))
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: display.durationSec > 0 ? `${(display.progressSec / display.durationSec) * 100}%` : '0%',
                        background: provider === 'spotify' ? '#1DB954' : '#FF0000',
                      }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{formatTime(display.progressSec)}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{formatTime(display.durationSec)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!realSpotify && (
                    <button onClick={() => setShuffle(!shuffle)} className="cursor-pointer transition-colors" style={{ color: shuffle ? 'var(--color-wine-light)' : 'rgba(255,255,255,0.3)' }}>
                      <Shuffle size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => realSpotify ? control('previous') : prevTrack()}
                    className="cursor-pointer hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <SkipBack size={18} />
                  </button>
                  <button
                    onClick={() => realSpotify ? control(display.isPlaying ? 'pause' : 'play') : setPlaying(!playing)}
                    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: provider === 'spotify' ? '#1DB954' : '#FF0000',
                      boxShadow: `0 4px 16px ${provider === 'spotify' ? 'rgba(29,185,84,0.4)' : 'rgba(255,0,0,0.4)'}`,
                    }}
                  >
                    {display.isPlaying ? <Pause size={18} color="white" fill="white" /> : <Play size={18} color="white" fill="white" />}
                  </button>
                  <button
                    onClick={() => realSpotify ? control('next') : nextTrack()}
                    className="cursor-pointer hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <SkipForward size={18} />
                  </button>
                  {!realSpotify && (
                    <button onClick={() => setRepeat(!repeat)} className="cursor-pointer transition-colors" style={{ color: repeat ? 'var(--color-wine-light)' : 'rgba(255,255,255,0.3)' }}>
                      <Repeat size={14} />
                    </button>
                  )}
                </div>

                {notice && (
                  <p className="text-xs text-center" style={{ color: '#F87171' }}>{notice}</p>
                )}

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setMuted(!muted)} className="cursor-pointer transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {muted || volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                  <input
                    type="range" min={0} max={100} value={muted ? 0 : volume}
                    onChange={e => { setVolume(+e.target.value); setMuted(false) }}
                    onPointerUp={() => { if (realSpotify) control('volume', muted ? 0 : volume) }}
                    className="flex-1 h-1 rounded-full cursor-pointer accent-wine-light"
                    style={{ accentColor: 'var(--color-wine-light)' }}
                  />
                  <span className="text-xs w-6 text-right" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                    {muted ? 0 : volume}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
