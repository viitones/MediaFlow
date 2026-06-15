import { useEffect, useRef, useState } from 'react'
import { useMediaStore } from '../store/useMediaStore'

function toMediaUrl(path: string) {
  return `media:///${encodeURIComponent(path.replace(/\\/g, '/'))}`
}

export default function PlayerView() {
  const { playback, settings, handleMediaEnded } = useMediaStore()
  const { currentMedia, isPlaying, isPaused, volume, playerState } = playback

  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Idle slideshow
  const idleImages = (() => {
    const path = settings.idle_image_path
    if (!path) return []
    return [path]
  })()

  const [idleIndex, setIdleIndex] = useState(0)
  const [showMedia, setShowMedia] = useState(true)

  // Idle slideshow cycling
  useEffect(() => {
    if (playerState !== 'IDLE' || idleImages.length <= 1) return
    const interval = setInterval(() => {
      setShowMedia(false)
      setTimeout(() => {
        setIdleIndex((i) => (i + 1) % idleImages.length)
        setShowMedia(true)
      }, 600)
    }, 5000)
    return () => clearInterval(interval)
  }, [playerState, idleImages])

  // Sync video volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Play/Pause control for video/audio elements
  useEffect(() => {
    if (playerState === 'PLAYING_VIDEO' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((e) => console.error('Video play error:', e))
      } else if (isPaused) {
        videoRef.current.pause()
      }
    }
    if (playerState === 'PLAYING_AUDIO' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.error('Audio play error:', e))
      } else if (isPaused) {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, isPaused, playerState])

  // Audio progress tracking
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime)
      setAudioDuration(audioRef.current.duration || 0)
    }
  }

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0
  const fadeClass = `transition-opacity duration-700 ${showMedia ? 'opacity-100' : 'opacity-0'}`

  // --- IDLE ---
  if (playerState === 'IDLE' || playerState === 'STOPPED' || !currentMedia) {
    const idleUrl = idleImages[idleIndex] ? toMediaUrl(idleImages[idleIndex]) : null
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        {idleUrl ? (
          <img
            src={idleUrl}
            alt="Tela ociosa"
            className={`w-full h-full object-contain ${fadeClass}`}
          />
        ) : (
          <div className="text-gray-800 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-lg text-gray-700">Aguardando reprodução...</p>
          </div>
        )}
      </div>
    )
  }

  const mediaUrl = toMediaUrl(currentMedia.caminho_arquivo)

  // --- IMAGE ---
  // key on currentMedia.id ensures React unmounts and remounts when media changes
  if (playerState === 'PLAYING_IMAGE') {
    return (
      <div key={`img-${currentMedia.id}`} className="w-screen h-screen bg-black flex items-center justify-center">
        <img
          src={mediaUrl}
          alt={currentMedia.nome}
          className="w-full h-full object-contain transition-opacity duration-500 opacity-100"
        />
      </div>
    )
  }

  // --- VIDEO ---
  if (playerState === 'PLAYING_VIDEO') {
    return (
      <div key={`vid-${currentMedia.id}`} className="w-screen h-screen bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={mediaUrl}
          className="w-full h-full object-contain"
          autoPlay
          onEnded={handleMediaEnded}
          onError={() => console.error('Video load error:', mediaUrl)}
        />
      </div>
    )
  }

  // --- AUDIO ---
  if (playerState === 'PLAYING_AUDIO' || playerState === 'PAUSED') {
    return (
      <div key={`aud-${currentMedia.id}`} className="w-screen h-screen bg-gray-950 flex flex-col items-center justify-center">
        <audio
          ref={audioRef}
          src={mediaUrl}
          autoPlay
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleMediaEnded}
          onError={() => console.error('Audio load error:', mediaUrl)}
        />
        <div className="w-64 h-64 rounded-2xl bg-gray-800 flex items-center justify-center mb-8 shadow-2xl overflow-hidden">
          <span className="text-8xl">🎵</span>
        </div>
        <p className="text-2xl font-semibold text-white mb-2 text-center px-8">{currentMedia.nome}</p>
        <p className="text-gray-500 mb-8">Áudio</p>
        <div className="w-80">
          <div className="w-full h-1.5 bg-gray-700 rounded-full mb-2">
            <div
              className="h-1.5 bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(audioProgress)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Fallback for LOADING / ERROR states
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <p className="text-gray-600">{playerState === 'ERROR' ? 'Erro ao carregar mídia' : 'Carregando...'}</p>
    </div>
  )
}
