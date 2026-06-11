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

// Tipos mínimos do Spotify Web Playback SDK (carregado via <script>)
interface SdkTrack {
  name: string
  artists: { name: string }[]
  album: { images: { url: string }[] }
}
interface SdkState {
  paused: boolean
  position: number
  duration: number
  track_window: { current_track: SdkTrack }
}
interface SdkPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  setVolume(v: number): Promise<void>
  addListener(event: 'ready' | 'not_ready', cb: (d: { device_id: string }) => void): void
  addListener(event: 'player_state_changed', cb: (s: SdkState | null) => void): void
  addListener(event: 'authentication_error' | 'initialization_error' | 'account_error', cb: (e: { message: string }) => void): void
}
// Tipos mínimos do YouTube IFrame Player API
interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  nextVideo(): void
  previousVideo(): void
  setVolume(v: number): void
  getCurrentTime(): number
  getDuration(): number
  getVideoData(): { title?: string; author?: string }
  loadPlaylist(videoIds: string[]): void
  destroy(): void
}
interface YTPlayerEvent { target: YTPlayer; data?: number }

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void
    Spotify?: {
      Player: new (opts: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SdkPlayer
    }
    onYouTubeIframeAPIReady?: () => void
    YT?: {
      Player: new (el: string | HTMLElement, opts: {
        width?: string | number
        height?: string | number
        playerVars?: Record<string, string | number>
        events?: {
          onReady?: (e: YTPlayerEvent) => void
          onStateChange?: (e: YTPlayerEvent) => void
          onError?: (e: YTPlayerEvent) => void
        }
      }) => YTPlayer
      PlayerState: { PLAYING: number }
    }
  }
}

interface YTPlaylist {
  id: string
  title: string
  count: number
  thumb: string | null
}

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
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [sdkActive, setSdkActive] = useState(false)
  const [ytConnected, setYtConnected] = useState(false)
  const [ytName, setYtName] = useState<string | null>(null)
  const [ytPlaylists, setYtPlaylists] = useState<YTPlaylist[]>([])
  const [ytPlaylistId, setYtPlaylistId] = useState('')
  const [ytPlaying, setYtPlaying] = useState(false)
  const [ytTrack, setYtTrack] = useState<{ title: string; author: string } | null>(null)
  const [ytProgress, setYtProgress] = useState(0)
  const [ytDuration, setYtDuration] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noticeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sdkPlayerRef = useRef<SdkPlayer | null>(null)
  const ytPlayerRef = useRef<YTPlayer | null>(null)
  const ytLoadedPlaylistRef = useRef('')

  const realSpotify = !demo && provider === 'spotify' && spotifyConnected
  const realYoutube = !demo && provider === 'youtube' && ytConnected
  const realMode = realSpotify || realYoutube

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

  // Volta do OAuth (?music_success=spotify|youtube / ?music_error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('music_success')
    if (success) {
      setOpen(true)
      if (success === 'youtube') setProvider('youtube')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('music_error')) {
      setOpen(true)
      showNotice('Não foi possível conectar. Tente novamente.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Status das conexões ao abrir o player
  useEffect(() => {
    if (!open || demo) return
    api.get<{
      spotify: { connected: boolean; profileName: string | null }
      youtube: { connected: boolean; profileName: string | null }
    }>('/music/status')
      .then(s => {
        setSpotifyConnected(s.spotify.connected)
        setSpotifyName(s.spotify.profileName)
        setYtConnected(s.youtube.connected)
        setYtName(s.youtube.profileName)
        setProvider(p => p ?? (s.spotify.connected ? 'spotify' : s.youtube.connected ? 'youtube' : null))
      })
      .catch(() => {})
  }, [open, demo])

  // Web Playback SDK — o navegador vira um dispositivo Spotify (exige Premium)
  useEffect(() => {
    if (!realSpotify || sdkPlayerRef.current) return

    function init() {
      if (!window.Spotify || sdkPlayerRef.current) return
      const player = new window.Spotify.Player({
        name: 'CrIAtiva Desk',
        getOAuthToken: cb => {
          api.get<{ accessToken: string }>('/music/spotify/token')
            .then(d => cb(d.accessToken))
            .catch(() => {})
        },
        volume: 0.8,
      })
      player.addListener('ready', d => setDeviceId(d.device_id))
      player.addListener('not_ready', () => { setDeviceId(null); setSdkActive(false) })
      player.addListener('authentication_error', () =>
        showNotice('Desconecte e conecte o Spotify de novo para tocar no navegador'))
      player.addListener('account_error', () =>
        showNotice('Tocar no navegador exige Spotify Premium'))
      player.addListener('player_state_changed', state => {
        if (!state) { setSdkActive(false); return }
        setSdkActive(true)
        const t = state.track_window.current_track
        setNow({
          playing: !state.paused,
          progressMs: state.position,
          volume: null,
          track: {
            title: t.name,
            artist: t.artists.map(a => a.name).join(', '),
            cover: t.album.images.at(-1)?.url ?? null,
            durationMs: state.duration,
            url: null,
          },
        })
      })
      player.connect()
      sdkPlayerRef.current = player
    }

    if (window.Spotify) {
      init()
    } else {
      window.onSpotifyWebPlaybackSDKReady = init
      if (!document.getElementById('spotify-sdk')) {
        const s = document.createElement('script')
        s.id = 'spotify-sdk'
        s.src = 'https://sdk.scdn.co/spotify-player.js'
        s.async = true
        document.body.appendChild(s)
      }
    }
  }, [realSpotify])

  // desliga os players ao sair da página
  useEffect(() => () => {
    sdkPlayerRef.current?.disconnect()
    try { ytPlayerRef.current?.destroy() } catch {}
  }, [])

  // Playlists do YouTube ao entrar no modo real
  useEffect(() => {
    if (!realYoutube) return
    api.get<YTPlaylist[]>('/music/youtube/playlists')
      .then(pl => {
        setYtPlaylists(pl)
        setYtPlaylistId(prev => prev || (pl[0]?.id ?? ''))
      })
      .catch(() => setYtPlaylists([]))
  }, [realYoutube])

  // Player embutido do YouTube (IFrame API) na playlist escolhida.
  // Carrega por IDs de vídeo (via API autenticada) — funciona com playlists privadas.
  useEffect(() => {
    if (!realYoutube || !ytPlaylistId || !open) return
    let cancelled = false

    async function load() {
      let ids: string[] = []
      try {
        ids = await api.get<string[]>(`/music/youtube/playlist-items?playlistId=${ytPlaylistId}`)
      } catch {
        showNotice('Não foi possível carregar a playlist')
        return
      }
      if (cancelled) return
      if (ids.length === 0) { showNotice('Playlist vazia ou com vídeos indisponíveis'); return }

      function create() {
        if (!window.YT?.Player || cancelled) return
        if (ytPlayerRef.current) {
          // idempotente: só recarrega se o usuário trocou de playlist
          if (ytLoadedPlaylistRef.current !== ytPlaylistId) {
            try {
              ytPlayerRef.current.loadPlaylist(ids)
              ytLoadedPlaylistRef.current = ytPlaylistId
            } catch {}
          }
          return
        }
        const el = document.getElementById('yt-music-embed')
        if (!el) return
        ytLoadedPlaylistRef.current = ytPlaylistId
        ytPlayerRef.current = new window.YT.Player(el, {
          width: '100%',
          height: '158',
          playerVars: { playlist: ids.join(',') },
          events: {
            onReady: e => e.target.setVolume(volume),
            onStateChange: e => {
              setYtPlaying(e.data === window.YT?.PlayerState.PLAYING)
              try {
                const d = e.target.getVideoData()
                if (d?.title) setYtTrack({ title: d.title, author: d.author ?? 'YouTube' })
                setYtDuration(Math.floor(e.target.getDuration() || 0))
              } catch {}
            },
            // vídeo com embed bloqueado pela gravadora → pula para o próximo
            onError: e => { try { e.target.nextVideo() } catch {} },
          },
        })
      }

      if (window.YT?.Player) {
        create()
      } else {
        window.onYouTubeIframeAPIReady = create
        if (!document.getElementById('yt-iframe-api')) {
          const s = document.createElement('script')
          s.id = 'yt-iframe-api'
          s.src = 'https://www.youtube.com/iframe_api'
          s.async = true
          document.body.appendChild(s)
        }
      }
    }

    void load()
    return () => { cancelled = true }
    // 'minimized' fica fora das deps de propósito: minimizar não pode recarregar a playlist
  }, [realYoutube, ytPlaylistId, open])

  // destrói o player do YouTube só quando o widget fecha ou troca de provider
  // (minimizar mantém o iframe montado — a música continua)
  useEffect(() => {
    if ((!open || !realYoutube) && ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy() } catch {}
      ytPlayerRef.current = null
      ytLoadedPlaylistRef.current = ''
      setYtPlaying(false)
      setYtProgress(0)
    }
  }, [open, realYoutube])

  // progresso do YouTube (1s)
  useEffect(() => {
    if (!realYoutube) return
    const id = setInterval(() => {
      const p = ytPlayerRef.current
      if (!p) return
      try {
        setYtProgress(Math.floor(p.getCurrentTime() || 0))
        setYtDuration(Math.floor(p.getDuration() || 0))
        const d = p.getVideoData()
        if (d?.title) {
          setYtTrack(t => t?.title === d.title ? t : { title: d.title!, author: d.author ?? 'YouTube' })
        }
      } catch {}
    }, 1000)
    return () => clearInterval(id)
  }, [realYoutube])

  // Polling da faixa atual (modo real; pausa quando o SDK está tocando aqui)
  useEffect(() => {
    if (!realSpotify || !open || minimized || sdkActive) return
    let active = true
    const load = () =>
      api.get<NowPlaying>('/music/spotify/now-playing')
        .then(d => { if (active) setNow(d) })
        .catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => { active = false; clearInterval(id) }
  }, [realSpotify, open, minimized, sdkActive])

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
    if (demo) { setProvider(p); return }
    if (p === 'spotify') {
      if (spotifyConnected) { setProvider('spotify'); return }
      try {
        const { url } = await api.get<{ url: string }>('/music/spotify/auth-url')
        window.location.href = url
      } catch (e) {
        showNotice(e instanceof Error ? e.message : 'Spotify indisponível')
      }
      return
    }
    if (ytConnected) { setProvider('youtube'); return }
    try {
      const { url } = await api.get<{ url: string }>('/music/youtube/auth-url')
      window.location.href = url
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'YouTube indisponível')
    }
  }

  function ytControl(action: 'play' | 'pause' | 'next' | 'previous') {
    const p = ytPlayerRef.current
    if (!p) return
    try {
      if (action === 'play') p.playVideo()
      if (action === 'pause') p.pauseVideo()
      if (action === 'next') p.nextVideo()
      if (action === 'previous') p.previousVideo()
    } catch {}
  }

  async function disconnectYoutube() {
    try { await api.delete('/music/youtube') } catch {}
    try { ytPlayerRef.current?.destroy() } catch {}
    ytPlayerRef.current = null
    setYtConnected(false)
    setYtName(null)
    setYtTrack(null)
    setYtPlaying(false)
    setYtPlaylists([])
    setYtPlaylistId('')
    setProvider(null)
  }

  async function control(action: 'play' | 'pause' | 'next' | 'previous' | 'volume' | 'transfer', opts?: { volume?: number; deviceId?: string }) {
    try {
      await api.post('/music/spotify/control', { action, ...opts })
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

  function changeVolume(v: number) {
    if (realYoutube) {
      try { ytPlayerRef.current?.setVolume(v) } catch {}
    } else if (sdkActive && sdkPlayerRef.current) {
      void sdkPlayerRef.current.setVolume(v / 100)
    } else {
      void control('volume', { volume: v })
    }
  }

  async function disconnectSpotify() {
    try { await api.delete('/music/spotify') } catch {}
    sdkPlayerRef.current?.disconnect()
    sdkPlayerRef.current = null
    setDeviceId(null)
    setSdkActive(false)
    setSpotifyConnected(false)
    setSpotifyName(null)
    setNow(null)
    setProvider(null)
  }

  // Valores exibidos: reais (Spotify/YouTube) ou demo
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
    : realYoutube
    ? {
        title: ytTrack?.title ?? (ytPlaylists.length === 0 ? 'Carregando playlists…' : 'Dê o play no vídeo acima'),
        artist: ytTrack?.author ?? (ytName ?? 'YouTube'),
        cover: null,
        isPlaying: ytPlaying,
        progressSec: ytProgress,
        durationSec: ytDuration,
        link: 'https://music.youtube.com',
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

      {/* Embed do YouTube fora do colapso — minimizar não interrompe a música */}
      {realYoutube && ytPlaylistId && (
        <div className="px-4" style={{ height: minimized ? 0 : 'auto', overflow: 'hidden' }}>
          <div className="w-full rounded-xl overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div id="yt-music-embed" />
          </div>
        </div>
      )}

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
                        : realYoutube
                        ? `YouTube · ${ytName ?? 'conectado'}`
                        : `${provider === 'spotify' ? 'Spotify' : 'YouTube Music'} · demo`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {realMode && (
                      <button
                        onClick={() => setProvider(null)}
                        className="text-xs cursor-pointer hover:opacity-70 transition-opacity"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Trocar
                      </button>
                    )}
                    <button
                      onClick={() => realSpotify ? disconnectSpotify() : realYoutube ? disconnectYoutube() : setProvider(null)}
                      className="text-xs cursor-pointer hover:opacity-70 transition-opacity"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {realMode ? 'Desconectar' : 'Trocar'}
                    </button>
                  </div>
                </div>

                {/* YouTube: playlist + player embutido */}
                {realYoutube && (
                  <>
                    {ytPlaylists.length > 0 && (
                      <select
                        value={ytPlaylistId}
                        onChange={e => setYtPlaylistId(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl text-xs outline-none cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        {ytPlaylists.map(p => (
                          <option key={p.id} value={p.id} style={{ color: 'black' }}>
                            {p.title} ({p.count})
                          </option>
                        ))}
                      </select>
                    )}
                    {ytPlaylists.length === 0 && (
                      <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Nenhuma playlist encontrada — crie uma no YouTube e reabra o player
                      </p>
                    )}
                  </>
                )}

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
                    style={{ background: 'rgba(255,255,255,0.1)', cursor: realMode ? 'default' : 'pointer' }}
                    onClick={e => {
                      if (realMode) return
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
                  {!realMode && (
                    <button onClick={() => setShuffle(!shuffle)} className="cursor-pointer transition-colors" style={{ color: shuffle ? 'var(--color-wine-light)' : 'rgba(255,255,255,0.3)' }}>
                      <Shuffle size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => realSpotify ? control('previous') : realYoutube ? ytControl('previous') : prevTrack()}
                    className="cursor-pointer hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <SkipBack size={18} />
                  </button>
                  <button
                    onClick={() => realSpotify
                      ? control(display.isPlaying ? 'pause' : 'play')
                      : realYoutube
                      ? ytControl(display.isPlaying ? 'pause' : 'play')
                      : setPlaying(!playing)}
                    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: provider === 'spotify' ? '#1DB954' : '#FF0000',
                      boxShadow: `0 4px 16px ${provider === 'spotify' ? 'rgba(29,185,84,0.4)' : 'rgba(255,0,0,0.4)'}`,
                    }}
                  >
                    {display.isPlaying ? <Pause size={18} color="white" fill="white" /> : <Play size={18} color="white" fill="white" />}
                  </button>
                  <button
                    onClick={() => realSpotify ? control('next') : realYoutube ? ytControl('next') : nextTrack()}
                    className="cursor-pointer hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <SkipForward size={18} />
                  </button>
                  {!realMode && (
                    <button onClick={() => setRepeat(!repeat)} className="cursor-pointer transition-colors" style={{ color: repeat ? 'var(--color-wine-light)' : 'rgba(255,255,255,0.3)' }}>
                      <Repeat size={14} />
                    </button>
                  )}
                </div>

                {/* Tocar no navegador (Web Playback SDK) */}
                {realSpotify && deviceId && !sdkActive && (
                  <button
                    onClick={() => control('transfer', { deviceId })}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(30,215,96,0.12)', border: '1px solid rgba(30,215,96,0.25)', color: '#1DB954' }}
                  >
                    <Volume2 size={13} /> Tocar aqui no navegador
                  </button>
                )}
                {realSpotify && sdkActive && (
                  <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: '#1DB954' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Tocando neste navegador
                  </p>
                )}

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
                    onPointerUp={() => { if (realSpotify) changeVolume(muted ? 0 : volume) }}
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
