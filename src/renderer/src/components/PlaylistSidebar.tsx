import { useState } from 'react'
import { Plus, Music, Trash2, Pencil, Check, X, FolderOpen } from 'lucide-react'
import { useMediaStore } from '../store/useMediaStore'

interface EditState {
  id: number | null
  nome: string
  descricao: string
}

export default function PlaylistSidebar() {
  const { playlists, activePlaylist, setActivePlaylist, savePlaylist, deletePlaylist } =
    useMediaStore()

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [edit, setEdit] = useState<EditState | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    await savePlaylist({ nome: newName.trim(), descricao: newDesc.trim(), imagem_capa: '' })
    setNewName('')
    setNewDesc('')
    setShowNew(false)
  }

  const handleSaveEdit = async () => {
    if (!edit || !edit.nome.trim()) return
    const playlist = playlists.find((p) => p.id === edit.id)
    if (!playlist) return
    await savePlaylist({ ...playlist, nome: edit.nome.trim(), descricao: edit.descricao.trim() })
    setEdit(null)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await deletePlaylist(id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Playlists</h2>
        <button className="btn-ghost p-1.5" onClick={() => setShowNew(true)} title="Nova Playlist">
          <Plus size={16} />
        </button>
      </div>

      {/* New playlist form */}
      {showNew && (
        <div className="p-3 border-b border-gray-700 bg-gray-800/50">
          <input
            autoFocus
            className="input-field mb-2"
            placeholder="Nome da playlist"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            className="input-field mb-2"
            placeholder="Descrição (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn-primary text-xs py-1.5" onClick={handleCreate}>
              <Check size={13} /> Criar
            </button>
            <button
              className="btn-ghost text-xs py-1.5"
              onClick={() => {
                setShowNew(false)
                setNewName('')
                setNewDesc('')
              }}
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Playlist list */}
      <div className="flex-1 overflow-y-auto py-2">
        {playlists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <FolderOpen size={32} className="mb-2" />
            <p className="text-xs">Nenhuma playlist</p>
          </div>
        )}
        {playlists.map((playlist) => {
          const isActive = activePlaylist?.id === playlist.id
          const isEditing = edit?.id === playlist.id

          return (
            <div
              key={playlist.id}
              className={`sidebar-item mx-2 mb-1 group ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
              onClick={() => !isEditing && setActivePlaylist(isActive ? null : playlist)}
            >
              {isEditing && edit ? (
                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    autoFocus
                    className="input-field text-xs mb-1 py-1"
                    value={edit.nome}
                    onChange={(e) => {
                      const val = e.target.value
                      setEdit((prev) => (prev ? { ...prev, nome: val } : null))
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  />
                  <div className="flex gap-1.5">
                    <button className="btn-primary text-xs py-1 px-2" onClick={handleSaveEdit}>
                      <Check size={11} />
                    </button>
                    <button className="btn-ghost text-xs py-1 px-2" onClick={() => setEdit(null)}>
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Music size={15} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">{playlist.nome}</p>
                    {playlist.descricao && (
                      <p
                        className={`truncate text-xs ${isActive ? 'text-indigo-200' : 'text-gray-500'}`}
                      >
                        {playlist.descricao}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1 hover:text-white rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEdit({
                          id: playlist.id,
                          nome: playlist.nome,
                          descricao: playlist.descricao
                        })
                      }}
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="p-1 hover:text-red-400 rounded transition-colors"
                      onClick={(e) => handleDelete(e, playlist.id)}
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
