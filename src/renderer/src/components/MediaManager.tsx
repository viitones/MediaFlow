import { useRef } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  Image,
  Video,
  Music2,
  Trash2,
  GripVertical,
  Play,
  Clock,
  FolderOpen
} from 'lucide-react'
import { useMediaStore, Media, MediaType } from '../store/useMediaStore'

// Detect media type from file extension
function detectMediaType(filePath: string): MediaType {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'imagem'
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'vídeo'
  return 'áudio'
}

// Extract duration of audio/video via a temporary HTML element using media:// protocol
function getMediaDuration(filePath: string, tipo: MediaType): Promise<number> {
  if (tipo === 'imagem') return Promise.resolve(5)
  return new Promise((resolve) => {
    const url = `media:///${encodeURIComponent(filePath.replace(/\\/g, '/'))}`
    const el = document.createElement(tipo === 'vídeo' ? 'video' : 'audio')
    el.src = url
    el.preload = 'metadata'
    const cleanup = () => el.remove()
    el.onloadedmetadata = () => {
      cleanup()
      resolve(Math.round(el.duration) || 0)
    }
    el.onerror = () => {
      cleanup()
      resolve(0)
    }
  })
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MediaIcon({ tipo }: { tipo: MediaType }) {
  if (tipo === 'vídeo') return <Video size={14} className="text-blue-400" />
  if (tipo === 'áudio') return <Music2 size={14} className="text-green-400" />
  return <Image size={14} className="text-yellow-400" />
}

function MediaThumbnail({ media }: { media: Media }) {
  const url = `media:///${encodeURIComponent(media.caminho_arquivo.replace(/\\/g, '/'))}`

  if (media.tipo === 'imagem') {
    return (
      <img
        src={url}
        alt={media.nome}
        className="w-12 h-12 object-cover rounded"
        onError={(e) => {
          ; (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  if (media.tipo === 'vídeo') {
    return (
      <div className="w-12 h-12 bg-blue-900/40 rounded flex items-center justify-center">
        <Video size={20} className="text-blue-400" />
      </div>
    )
  }
  return (
    <div className="w-12 h-12 bg-green-900/40 rounded flex items-center justify-center">
      <Music2 size={20} className="text-green-400" />
    </div>
  )
}

export default function MediaManager() {
  const { activePlaylist, medias, saveMedia, deleteMedia, updateMediaOrder, selectMedia } =
    useMediaStore()

  // Guard duplicate clicks
  const addingRef = useRef(false)

  const handleAddMedia = async () => {
    if (addingRef.current || !activePlaylist) return
    addingRef.current = true

    try {
      const filePaths = await window.api.selectMediaFiles()
      if (!filePaths || filePaths.length === 0) return

      for (const filePath of filePaths) {
        const tipo = detectMediaType(filePath)
        const duracao = await getMediaDuration(filePath, tipo)
        const nome = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Mídia'

        await saveMedia({
          playlist_id: activePlaylist.id,
          nome,
          tipo,
          caminho_arquivo: filePath,
          duracao,
          ordem: medias.length
        })
      }
    } finally {
      addingRef.current = false
    }
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newMedias = Array.from(medias)
    const [removed] = newMedias.splice(result.source.index, 1)
    newMedias.splice(result.destination.index, 0, removed)
    await updateMediaOrder(newMedias.map((m) => m.id))
  }

  if (!activePlaylist) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600">
        <FolderOpen size={48} className="mb-3" />
        <p className="text-base font-medium">Selecione uma playlist</p>
        <p className="text-sm mt-1">
          Escolha uma playlist na barra lateral para gerenciar suas mídias
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <div>
          <h2 className="font-semibold text-gray-100">{activePlaylist.nome}</h2>
          <p className="text-xs text-gray-500">
            {medias.length} mídia{medias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary text-xs" onClick={handleAddMedia}>
          <Plus size={14} /> Adicionar Mídia
        </button>
      </div>

      {/* Media list */}
      <div className="flex-1 overflow-y-auto">
        {medias.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 py-16">
            <Plus size={36} className="mb-2" />
            <p className="text-sm">Adicione mídias à playlist</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="media-list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="p-3 space-y-1.5"
                >
                  {medias.map((media, index) => (
                    <Draggable key={media.id} draggableId={String(media.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-100 group ${snapshot.isDragging
                              ? 'border-indigo-500 bg-gray-700 shadow-lg'
                              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                        >
                          {/* Drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
                          >
                            <GripVertical size={16} />
                          </div>

                          {/* Thumbnail */}
                          <div className="shrink-0">
                            <MediaThumbnail media={media} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MediaIcon tipo={media.tipo} />
                              <p className="text-sm font-medium text-gray-200 truncate">
                                {media.nome}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-gray-500 capitalize">{media.tipo}</span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock size={10} /> {formatDuration(media.duracao)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            <button
                              className="p-1.5 text-gray-500 hover:text-indigo-400 rounded transition-colors"
                              onClick={() => selectMedia(media)}
                              title="Reproduzir agora"
                            >
                              <Play size={14} />
                            </button>
                            <button
                              className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                              onClick={() => deleteMedia(media.id)}
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  )
}
