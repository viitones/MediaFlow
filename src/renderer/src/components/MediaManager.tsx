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
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'video'
  return 'audio'
}

interface MediaInfo {
  duracao: number
  resolucao?: string
}

async function getMediaInfo(filePath: string, tipo: MediaType): Promise<MediaInfo> {
  if (tipo === 'image') return { duracao: 0 }
  try {
    const { duration, width, height } = await window.api.getVideoMetadata(filePath)
    const duracao = Math.round(duration)
    const resolucao = width > 0 && height > 0 ? `${width}x${height}` : undefined
    return { duracao, resolucao }
  } catch (e) {
    console.error('Error getting media info via FFmpeg:', e)
    return { duracao: 0 }
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MediaIcon({ tipo }: { tipo: MediaType }) {
  if (tipo === 'video') return <Video size={14} className="text-blue-400" />
  if (tipo === 'audio') return <Music2 size={14} className="text-green-400" />
  return <Image size={14} className="text-yellow-400" />
}

function MediaThumbnail({ media }: { media: Media }) {
  const url = `media:///${encodeURIComponent(media.caminho_arquivo.replace(/\\/g, '/'))}`

  if (media.tipo === 'image') {
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
  if (media.tipo === 'video') {
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
        const { duracao, resolucao } = await getMediaInfo(filePath, tipo)
        const tamanho_arquivo = await window.api.getFileSize(filePath)
        const nome = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Mídia'

        const mediaToSave = {
          playlist_id: activePlaylist.id,
          nome,
          tipo,
          caminho_arquivo: filePath,
          duracao,
          resolucao,
          tamanho_arquivo,
          ordem: medias.length
        }

        if (tipo === 'video') {
          const duration = duracao
          const [wStr, hStr] = resolucao?.split('x') ?? []
          const width = Number(wStr) || 0
          const height = Number(hStr) || 0
          console.log('VIDEO METADATA')
          console.log('duration:', duration)
          console.log('width:', width)
          console.log('height:', height)

          console.log('SAVING VIDEO')
          console.log(mediaToSave)
        }

        await saveMedia(mediaToSave)
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
                  {medias.map((media, index) => {
                    if (media.tipo === 'video') {
                      console.log('MEDIA RENDER LIST (duration field check):')
                      console.log('media.duration (or equival):', media.duracao)
                      console.log('full media object:', media)
                    }
                    return (
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
                              {media.tipo !== 'image' && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock size={10} /> {formatDuration(media.duracao)}
                                </span>
                              )}
                              {media.resolucao && (
                                <span className="text-xs text-gray-500">
                                  {media.resolucao}
                                </span>
                              )}
                              {media.tamanho_arquivo && media.tamanho_arquivo > 0 && (
                                <span className="text-xs text-gray-500">
                                  {(media.tamanho_arquivo / 1024 / 1024).toFixed(1)} MB
                                </span>
                              )}
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
                  )})}
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
