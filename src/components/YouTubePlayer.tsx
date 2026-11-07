import { useEffect, useRef, useState } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'
import { getYoutubeId } from '@/lib/youtube'

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId?: string
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void
            onError?: (event: { data: number }) => void
          }
        },
      ) => YTPlayerInstance
      PlayerState?: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export interface YTPlayerInstance {
  getCurrentTime: () => number
  getDuration: () => number
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
}

let apiPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT && window.YT.Player) return Promise.resolve()

  if (!apiPromise) {
    apiPromise = new Promise<void>((resolve) => {
      const existing = document.getElementById('youtube-iframe-api')
      if (existing) {
        const check = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(check)
            resolve()
          }
        }, 100)
        return
      }

      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady()
        resolve()
      }

      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScript = document.getElementsByTagName('script')[0]
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(tag, firstScript)
      } else {
        document.head.appendChild(tag)
      }
    })
  }

  return apiPromise
}

interface YouTubePlayerProps {
  videoUrl: string
  title: string
  initialSeconds?: number
  onProgress?: (seconds: number) => void
  onEnded?: () => void
  className?: string
}

export function YouTubePlayer({
  videoUrl,
  title,
  initialSeconds = 0,
  onProgress,
  onEnded,
  className = '',
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const timerRef = useRef<number | null>(null)
  const isEndedRef = useRef(false)
  const videoId = getYoutubeId(videoUrl)

  const [apiReady, setApiReady] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Salva refs estáveis de callbacks para os listeners de eventos do player
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  // 1) Carrega a Iframe API do YouTube
  useEffect(() => {
    let active = true
    loadYouTubeIframeApi()
      .then(() => {
        if (active) setApiReady(true)
      })
      .catch(() => {
        if (active) setHasError(true)
      })
    return () => {
      active = false
    }
  }, [])

  // 2) Inicializa ou reconstrói o player quando o videoId ou a api mudarem
  useEffect(() => {
    if (!apiReady || !videoId || !containerRef.current || !window.YT) return

    isEndedRef.current = false
    setHasError(false)

    // Cria um div filho para o YT.Player substituir
    const elementId = `yt-player-${Math.random().toString(36).slice(2, 9)}`
    const mountEl = document.createElement('div')
    mountEl.id = elementId
    mountEl.className = 'w-full h-full'
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(mountEl)

    const start = Math.max(0, Math.floor(initialSeconds || 0))

    try {
      const player = new window.YT.Player(elementId, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          start: start > 0 ? start : undefined,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target
            if (start > 0) {
              try {
                event.target.seekTo(start, true)
              } catch {
                // ignore
              }
            }
          },
          onStateChange: (event) => {
            const state = event.data
            const ENDED = window.YT?.PlayerState?.ENDED ?? 0
            const PLAYING = window.YT?.PlayerState?.PLAYING ?? 1
            const PAUSED = window.YT?.PlayerState?.PAUSED ?? 2

            // Notifica progresso ao pausar ou dar play
            if (state === PLAYING || state === PAUSED) {
              try {
                const sec = Math.floor(event.target.getCurrentTime())
                if (sec > 0 && onProgressRef.current && !isEndedRef.current) {
                  onProgressRef.current(sec)
                }
              } catch {
                // ignore
              }
            }

            // Quando o vídeo chega ao fim
            if (state === ENDED) {
              isEndedRef.current = true
              if (onEndedRef.current) {
                onEndedRef.current()
              }
            }
          },
          onError: () => {
            setHasError(true)
          },
        },
      })
      playerRef.current = player
    } catch {
      setHasError(true)
    }

    return () => {
      // Salva último segundo antes de desmontar
      try {
        if (playerRef.current && !isEndedRef.current) {
          const sec = Math.floor(playerRef.current.getCurrentTime())
          if (sec > 0 && onProgressRef.current) {
            onProgressRef.current(sec)
          }
        }
      } catch {
        // ignore
      }
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy()
        }
      } catch {
        // ignore
      }
      playerRef.current = null
    }
  }, [apiReady, videoId, initialSeconds])

  // 3) Polling de progresso a cada 5 segundos enquanto estiver montado
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = window.setInterval(() => {
      if (!playerRef.current || isEndedRef.current) return
      try {
        const sec = Math.floor(playerRef.current.getCurrentTime())
        if (sec > 0 && onProgressRef.current) {
          onProgressRef.current(sec)
        }
      } catch {
        // ignore
      }
    }, 5000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  if (!videoId) {
    return (
      <div
        className={`grid place-items-center bg-black/80 text-white/50 p-6 text-center ${className}`}
      >
        <div>
          <AlertCircle className="mx-auto h-8 w-8 text-amber-400 mb-2" />
          <p className="text-sm font-bold text-white">Vídeo indisponível</p>
          <p className="text-xs text-white/40 mt-1">
            O link do vídeo desta aula ainda não foi configurado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-black ${className}`}>
      {/* Container onde o YT.Player monta o iframe controlado */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Fallback caso a API falhe por bloqueio de script */}
      {hasError && (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${
            initialSeconds > 0 ? `&start=${Math.floor(initialSeconds)}` : ''
          }`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}

      {!apiReady && !hasError && (
        <div className="absolute inset-0 grid place-items-center bg-brand-navy/60">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand-orange" />
        </div>
      )}
    </div>
  )
}
