import { ImageIcon, Monitor, Power, PowerOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMediaStore } from '../store/useMediaStore'

export default function PlayerPreview() {
  const {
    playback,
    monitors,
    config,
    settings,
    isPlayerOpen,
    openPlayerWindow,
    closePlayerWindow,
    saveConfig,
    saveSettings,
    loadMonitors
  } = useMediaStore()
  const { currentMedia, playerState, isPlaying, isPaused } = playback

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    loadMonitors()
  }, [loadMonitors])

  // Idle slideshow
  const idleImages = (() => {
    const path = settings.idle_image_path
    if (!path) return []
    return [path]
  })()

  const [idleIndex, setIdleIndex] = useState(0)
  const [showMedia, setShowMedia] = useState(true)

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

  useEffect(() => {
    if ((playerState === 'PLAYING_VIDEO' || playerState === 'PAUSED_VIDEO') && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((e) => console.error('Preview video play error:', e))
      } else if (isPaused) {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, isPaused, playerState])

  const fadeClass = `transition-opacity duration-700 ${showMedia ? 'opacity-100' : 'opacity-0'}`

  const renderPreviewContent = () => {
    if (playerState === 'IDLE' || playerState === 'STOPPED' || !currentMedia) {
      const idleUrl = idleImages[idleIndex]
        ? `media:///${encodeURIComponent(idleImages[idleIndex].replace(/\\/g, '/'))}`
        : null
      return (
        <div className="w-full h-full bg-black flex items-center justify-center">
          {idleUrl ? (
            <img
              src={idleUrl}
              alt="Tela ociosa"
              className={`w-full h-full object-contain ${fadeClass}`}
            />
          ) : (
            <div className="text-gray-800 text-center">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-xs text-gray-700">Aguardando reprodução...</p>
            </div>
          )}
        </div>
      )
    }

    const mediaUrl = `media:///${encodeURIComponent(currentMedia.caminho_arquivo.replace(/\\/g, '/'))}`

    if (playerState === 'PLAYING_IMAGE' || playerState === 'PAUSED_IMAGE') {
      return (
        <img
          key={`img-${currentMedia.id}`}
          src={mediaUrl}
          alt={currentMedia.nome}
          className="w-full h-full object-contain transition-opacity duration-500 opacity-100"
        />
      )
    }

    if (playerState === 'PLAYING_VIDEO' || playerState === 'PAUSED_VIDEO') {
      return (
        <video
          key={`vid-${currentMedia.id}`}
          ref={(el) => {
            if (el && !videoRef.current) {
              videoRef.current = el
              console.log('MP4 SUPPORT:', document.createElement('video').canPlayType('video/mp4'))
            } else if (el) {
              videoRef.current = el
            }
          }}
          src={mediaUrl}
          className="w-full h-full object-contain"
          autoPlay
          muted
          preload="auto"
          playsInline
          onLoadedMetadata={() => console.log('VIDEO EVENT: loadedmetadata')}
          onLoadedData={() => console.log('VIDEO EVENT: loadeddata')}
          onCanPlay={() => console.log('VIDEO EVENT: canplay')}
          onCanPlayThrough={() => console.log('VIDEO EVENT: canplaythrough')}
          onPlay={() => console.log('VIDEO EVENT: play')}
          onPlaying={() => console.log('VIDEO EVENT: playing')}
          onPause={() => console.log('VIDEO EVENT: pause')}
          onEnded={() => console.log('VIDEO EVENT: ended')}
          onError={(e) => {
            console.log('VIDEO ERROR OBJECT', e.currentTarget.error)
            console.log('VIDEO ERROR CODE', e.currentTarget.error?.code)
            console.log('VIDEO CURRENT SRC', e.currentTarget.currentSrc)
          }}
        />
      )
    }

    if (playerState === 'PLAYING_AUDIO' || playerState === 'PAUSED_AUDIO') {
      return (
        <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-2 shadow-2xl overflow-hidden">
            <span className="text-3xl">🎵</span>
          </div>
          <p className="text-sm font-semibold text-white mb-1 text-center px-4 truncate max-w-full">
            {currentMedia.nome}
          </p>
        </div>
      )
    }

    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <p className="text-gray-600 text-xs">{playerState === 'ERROR' ? 'Erro' : 'Carregando'}</p>
      </div>
    )
  }

  const handleMonitorChange = async (monitorId: string) => {
    await saveConfig({ monitor_selecionado: monitorId })
  }

  const handleSelectIdleImage = async () => {
    const filePath = await window.api.selectIdleImage()
    if (filePath) {
      await saveSettings({ idle_image_path: filePath })
    }
  }

  const handleAoFinalizar = async (value: string) => {
    await saveSettings({
      ao_finalizar_midia: value as
        | 'proxima'
        | 'tela_ociosa'
        | 'reiniciar_midia'
        | 'reiniciar_playlist'
    })
  }

  const idleLabel = settings.idle_image_path
    ? (settings.idle_image_path.split(/[\\/]/).pop() ?? 'Imagem selecionada')
    : 'Nenhuma (tela preta)'

  return (
    <div className="flex flex-col h-full">
      {/* Top controls */}
      <div className="flex flex-col gap-2 p-3 border-b border-gray-700 shrink-0 bg-gray-950/20">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</p>
          <button
            onClick={isPlayerOpen ? closePlayerWindow : openPlayerWindow}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isPlayerOpen
                ? 'bg-red-700/55 text-red-300 hover:bg-red-700'
                : 'bg-indigo-600/55 text-indigo-300 hover:bg-indigo-600'
            }`}
            title={isPlayerOpen ? 'Fechar Player' : 'Abrir Player'}
          >
            {isPlayerOpen ? <PowerOff size={11} /> : <Power size={11} />}
            {isPlayerOpen ? 'Fechar' : 'Abrir'} Player
          </button>
        </div>

        {/* Monitor selector */}
        <div className="flex items-center gap-1.5 w-full">
          <Monitor size={12} className="text-gray-500 shrink-0" />
          <select
            className="text-xs bg-gray-800 border border-gray-600 rounded px-1.5 py-1 text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer flex-1 min-w-0"
            value={config.monitor_selecionado}
            onChange={(e) => handleMonitorChange(e.target.value)}
          >
            <option value="">Monitor padrão</option>
            {monitors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.isPrimary ? '★ ' : ''}
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
        {renderPreviewContent()}

        {/* Now-playing overlay badge */}
        {currentMedia && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
            <p className="text-xs text-gray-200 truncate">{currentMedia.nome}</p>
            <p className="text-xs text-gray-500 capitalize">{currentMedia.tipo}</p>
          </div>
        )}
      </div>

      {/* Settings panel */}
      <div className="border-t border-gray-700 p-3 shrink-0 bg-gray-950/20 space-y-2.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Configurações
        </p>

        {/* Idle image */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Tela ociosa</span>
          <button
            className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 hover:border-gray-500 transition-colors w-full text-left"
            onClick={handleSelectIdleImage}
            title="Selecionar imagem para tela ociosa"
          >
            <ImageIcon size={12} className="text-gray-500 shrink-0" />
            <span className="truncate">{idleLabel}</span>
          </button>
        </div>

        {/* Ao finalizar */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Ao finalizar mídia</span>
          <select
            className="text-xs bg-gray-800 border border-gray-600 rounded px-1.5 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer w-full"
            value={settings.ao_finalizar_midia}
            onChange={(e) => handleAoFinalizar(e.target.value)}
          >
            <option value="proxima">Próxima mídia</option>
            <option value="reiniciar_midia">Reiniciar mídia atual</option>
            <option value="reiniciar_playlist">Reiniciar playlist</option>
            <option value="tela_ociosa">Tela ociosa</option>
          </select>
        </div>
      </div>
    </div>
  )
}
