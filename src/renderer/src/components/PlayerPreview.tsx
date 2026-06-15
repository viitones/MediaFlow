import { useEffect } from 'react'
import { Monitor, ExternalLink, Power, PowerOff, ImageIcon } from 'lucide-react'
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
  const { currentMedia } = playback

  useEffect(() => {
    loadMonitors()
  }, [loadMonitors])

  const mediaUrl = currentMedia
    ? `media:///${encodeURIComponent(currentMedia.caminho_arquivo.replace(/\\/g, '/'))}`
    : null

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
    await saveSettings({ ao_finalizar_midia: value as 'proxima' | 'tela_ociosa' | 'reiniciar_midia' | 'reiniciar_playlist' })
  }

  const idleLabel = settings.idle_image_path
    ? settings.idle_image_path.split(/[\\/]/).pop() ?? 'Imagem selecionada'
    : 'Nenhuma (tela preta)'

  return (
    <div className="flex flex-col h-full">
      {/* Top controls */}
      <div className="flex flex-col gap-2 p-3 border-b border-gray-700 shrink-0 bg-gray-950/20">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</p>
          <button
            onClick={isPlayerOpen ? closePlayerWindow : openPlayerWindow}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${isPlayerOpen
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
        {!currentMedia ? (
          <div className="flex flex-col items-center text-gray-700">
            <ExternalLink size={28} className="mb-2" />
            <p className="text-xs">Nenhuma mídia reproduzindo</p>
          </div>
        ) : currentMedia.tipo === 'imagem' && mediaUrl ? (
          <img
            src={mediaUrl}
            alt={currentMedia.nome}
            className="max-w-full max-h-full object-contain"
          />
        ) : currentMedia.tipo === 'vídeo' && mediaUrl ? (
          <video
            key={mediaUrl}
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            loop={false}
            muted
          />
        ) : (
          <div className="flex flex-col items-center text-gray-500">
            <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">🎵</span>
            </div>
            <p className="text-xs text-center truncate max-w-[140px]">{currentMedia.nome}</p>
          </div>
        )}

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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configurações</p>

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
