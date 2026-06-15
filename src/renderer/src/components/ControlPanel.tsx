import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  Volume2,
  VolumeX,
  List
} from 'lucide-react'
import { useMediaStore, PlaybackMode } from '../store/useMediaStore'

const MODES: { value: PlaybackMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatico', label: 'Automático' },
  { value: 'automatico_intervalo', label: 'Com Intervalo' },
  { value: 'loop', label: 'Loop' }
]

export default function ControlPanel() {
  const { playback, medias, play, pause, resume, stop, next, prev, setVolume, setPlaybackMode } =
    useMediaStore()

  const { currentMedia, isPlaying, isPaused, volume, mode, queue, currentIndex } = playback

  const handlePlayPause = () => {
    if (!isPlaying && !isPaused) {
      play(0)
    } else if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  const upcomingQueue = queue.slice(currentIndex + 1, currentIndex + 6)

  return (
    <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700">
      {/* Now Playing */}
      <div className="px-4 py-2 border-b border-gray-700/50">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reproduzindo agora</p>
        {currentMedia ? (
          <p className="text-sm font-medium text-indigo-300 truncate">{currentMedia.nome}</p>
        ) : (
          <p className="text-sm text-gray-600">Nenhuma mídia selecionada</p>
        )}
      </div>

      <div className="flex flex-1 gap-4 px-4 py-3 items-center">
        {/* Transport controls */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            onClick={prev}
            disabled={currentIndex <= 0}
            title="Anterior"
          >
            <SkipBack size={18} />
          </button>

          <button
            className={`p-2.5 rounded-xl transition-all ${
              isPlaying || isPaused
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : medias.length > 0
                  ? 'bg-gray-700 hover:bg-indigo-600 text-gray-200 hover:text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
            onClick={handlePlayPause}
            disabled={medias.length === 0}
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            onClick={next}
            disabled={currentIndex >= queue.length - 1 && mode !== 'loop'}
            title="Próxima"
          >
            <SkipForward size={18} />
          </button>

          <button
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            onClick={stop}
            disabled={!isPlaying && !isPaused}
            title="Parar"
          >
            <Square size={16} />
          </button>
        </div>

        <div className="w-px h-8 bg-gray-700 mx-1" />

        {/* Mode selector */}
        <div className="flex items-center gap-2">
          <Repeat size={14} className="text-gray-500" />
          <div className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setPlaybackMode(m.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === m.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-8 bg-gray-700 mx-1" />

        {/* Volume */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-indigo-500 h-1 cursor-pointer"
          />
          <span className="text-xs text-gray-500 w-8">{Math.round(volume * 100)}%</span>
        </div>

        {/* Upcoming queue */}
        {upcomingQueue.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-700 mx-1" />
            <div className="flex items-center gap-2">
              <List size={14} className="text-gray-500 shrink-0" />
              <div className="flex gap-1 overflow-hidden">
                {upcomingQueue.map((m) => (
                  <span
                    key={m.id}
                    className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded truncate max-w-[80px]"
                    title={m.nome}
                  >
                    {m.nome}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
