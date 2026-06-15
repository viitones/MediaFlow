import { create } from 'zustand'

export type MediaType = 'imagem' | 'vídeo' | 'áudio'
export type PlaybackMode = 'manual' | 'automatico' | 'automatico_intervalo' | 'loop'

export interface Playlist {
  id: number
  nome: string
  descricao: string
  imagem_capa: string
  data_criacao: string
}

export interface Media {
  id: number
  playlist_id: number
  nome: string
  tipo: MediaType
  caminho_arquivo: string
  duracao: number
  ordem: number
}

export interface Config {
  imagem_ociosa: string
  modo_reproducao: PlaybackMode
  intervalo_entre_midias: number
  monitor_selecionado: string
  volume_padrao: number
}

export type PlayerState =
  | 'IDLE'
  | 'LOADING'
  | 'PLAYING_IMAGE'
  | 'PLAYING_VIDEO'
  | 'PLAYING_AUDIO'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR'

export interface Settings {
  idle_image_path: string
  ao_finalizar_midia: 'proxima' | 'reiniciar_midia' | 'reiniciar_playlist' | 'tela_ociosa'
}

export interface MonitorInfo {
  id: string
  name: string
  bounds: { x: number; y: number; width: number; height: number }
  isPrimary: boolean
}

export interface PlaybackState {
  currentMedia: Media | null
  isPlaying: boolean
  isPaused: boolean
  volume: number
  mode: PlaybackMode
  playlistId: number | null
  queue: Media[]
  currentIndex: number
  playerState: PlayerState
}

interface MediaStore {
  // Data
  playlists: Playlist[]
  activePlaylist: Playlist | null
  medias: Media[]
  config: Config
  settings: Settings
  monitors: MonitorInfo[]
  isPlayerOpen: boolean

  // Playback
  playback: PlaybackState

  // Actions - Data
  loadPlaylists: () => Promise<void>
  setActivePlaylist: (playlist: Playlist | null) => Promise<void>
  savePlaylist: (
    playlist: Omit<Playlist, 'id' | 'data_criacao'> & { id?: number }
  ) => Promise<number>
  deletePlaylist: (id: number) => Promise<void>

  loadMedias: (playlistId: number) => Promise<void>
  saveMedia: (media: Omit<Media, 'id'> & { id?: number }) => Promise<number>
  deleteMedia: (id: number) => Promise<void>
  updateMediaOrder: (mediaIds: number[]) => Promise<void>

  loadConfig: () => Promise<void>
  saveConfig: (config: Partial<Config>) => Promise<void>

  loadSettings: () => Promise<void>
  saveSettings: (settings: Partial<Settings>) => Promise<void>

  loadMonitors: () => Promise<void>

  // Actions - Player Window
  openPlayerWindow: () => Promise<void>
  closePlayerWindow: () => Promise<void>
  togglePlayerFullscreen: (isFullscreen: boolean) => Promise<void>
  setIsPlayerOpen: (isOpen: boolean) => void

  // Actions - Playback
  play: (mediaIndex?: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  next: () => void
  prev: () => void
  selectMedia: (media: Media) => void
  setVolume: (volume: number) => void
  setPlaybackMode: (mode: PlaybackMode) => void
  setPlayerState: (playerState: PlayerState) => void
  handleMediaEnded: () => void
  syncPlayback: (state: PlaybackState) => void
  broadcastPlayback: () => void
}

const defaultPlayback: PlaybackState = {
  currentMedia: null,
  isPlaying: false,
  isPaused: false,
  volume: 1,
  mode: 'manual',
  playlistId: null,
  queue: [],
  currentIndex: -1,
  playerState: 'IDLE'
}

const defaultConfig: Config = {
  imagem_ociosa: '',
  modo_reproducao: 'manual',
  intervalo_entre_midias: 5,
  monitor_selecionado: '',
  volume_padrao: 1.0
}

const defaultSettings: Settings = {
  idle_image_path: '',
  ao_finalizar_midia: 'proxima'
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  playlists: [],
  activePlaylist: null,
  medias: [],
  config: defaultConfig,
  settings: defaultSettings,
  monitors: [],
  isPlayerOpen: false,
  playback: defaultPlayback,

  // ---- Data Actions ----

  loadPlaylists: async () => {
    const playlists = await window.api.getPlaylists()
    set({ playlists })
  },

  setActivePlaylist: async (playlist) => {
    set({ activePlaylist: playlist, medias: [] })
    if (playlist) {
      await get().loadMedias(playlist.id)
    }
  },

  savePlaylist: async (playlist) => {
    const now = new Date().toISOString()
    const id = await window.api.savePlaylist({
      ...playlist,
      data_criacao: now
    })
    await get().loadPlaylists()
    return id as number
  },

  deletePlaylist: async (id) => {
    await window.api.deletePlaylist(id)
    const { activePlaylist } = get()
    if (activePlaylist?.id === id) {
      set({ activePlaylist: null, medias: [] })
    }
    await get().loadPlaylists()
  },

  loadMedias: async (playlistId) => {
    const medias = await window.api.getMedias(playlistId)
    set({ medias })
  },

  saveMedia: async (media) => {
    const id = await window.api.saveMedia(media)
    const { activePlaylist } = get()
    if (activePlaylist) {
      await get().loadMedias(activePlaylist.id)
    }
    return id as number
  },

  deleteMedia: async (id) => {
    await window.api.deleteMedia(id)
    const { activePlaylist, playback } = get()
    if (activePlaylist) {
      await get().loadMedias(activePlaylist.id)
    }
    // If deleted media is current, stop playback
    if (playback.currentMedia?.id === id) {
      get().stop()
    }
  },

  updateMediaOrder: async (mediaIds) => {
    const { activePlaylist } = get()
    if (!activePlaylist) return
    await window.api.updateMediaOrder(activePlaylist.id, mediaIds)
    await get().loadMedias(activePlaylist.id)
    // Update queue order too if playing
    const { playback, medias } = get()
    if (playback.isPlaying || playback.isPaused) {
      const newQueue = mediaIds
        .map((id) => medias.find((m) => m.id === id))
        .filter(Boolean) as Media[]
      const newIndex = newQueue.findIndex((m) => m.id === playback.currentMedia?.id)
      set((s) => ({
        playback: { ...s.playback, queue: newQueue, currentIndex: newIndex }
      }))
    }
  },

  loadConfig: async () => {
    const config = await window.api.getConfig()
    if (config) {
      set({
        config,
        playback: { ...get().playback, volume: config.volume_padrao, mode: config.modo_reproducao }
      })
    }
  },

  saveConfig: async (config) => {
    await window.api.saveConfig(config)
    set((s) => ({ config: { ...s.config, ...config } }))
  },

  loadSettings: async () => {
    const settings = await window.api.getSettings()
    if (settings) {
      set({ settings })
    }
  },

  saveSettings: async (settings) => {
    await window.api.saveSettings(settings)
    set((s) => ({ settings: { ...s.settings, ...settings } }))
  },

  loadMonitors: async () => {
    const monitors = await window.api.getMonitors()
    set({ monitors })
  },

  // ---- Player Window ----

  openPlayerWindow: async () => {
    const { config, monitors } = get()
    let bounds = { x: 0, y: 0, width: 1280, height: 720 }
    let isFullscreen = false

    const selectedMonitor = monitors.find((m) => m.id === config.monitor_selecionado)
    if (selectedMonitor) {
      bounds = selectedMonitor.bounds
      isFullscreen = true
    }

    await window.api.openPlayer(bounds, isFullscreen)
    set({ isPlayerOpen: true })
  },

  closePlayerWindow: async () => {
    await window.api.closePlayer()
    set({ isPlayerOpen: false })
  },

  togglePlayerFullscreen: async (isFullscreen) => {
    await window.api.setPlayerFullscreen(isFullscreen)
  },

  setIsPlayerOpen: (isOpen) => {
    set({ isPlayerOpen: isOpen })
  },

  // ---- Playback ----

  play: (mediaIndex) => {
    const { medias, playback } = get()
    if (!medias.length) return

    const idx = mediaIndex !== undefined ? mediaIndex : 0
    const media = medias[idx]
    const playerState: PlayerState =
      media.tipo === 'imagem'
        ? 'PLAYING_IMAGE'
        : media.tipo === 'vídeo'
          ? 'PLAYING_VIDEO'
          : 'PLAYING_AUDIO'

    set({
      playback: {
        ...playback,
        currentMedia: media,
        isPlaying: true,
        isPaused: false,
        queue: medias,
        currentIndex: idx,
        playlistId: media.playlist_id,
        playerState
      }
    })
    get().broadcastPlayback()
  },

  pause: () => {
    set((s) => ({
      playback: { ...s.playback, isPlaying: false, isPaused: true, playerState: 'PAUSED' }
    }))
    get().broadcastPlayback()
  },

  resume: () => {
    const { playback } = get()
    const playerState: PlayerState =
      playback.currentMedia?.tipo === 'imagem'
        ? 'PLAYING_IMAGE'
        : playback.currentMedia?.tipo === 'vídeo'
          ? 'PLAYING_VIDEO'
          : 'PLAYING_AUDIO'
    set((s) => ({
      playback: { ...s.playback, isPlaying: true, isPaused: false, playerState }
    }))
    get().broadcastPlayback()
  },

  stop: () => {
    set({
      playback: {
        ...defaultPlayback,
        volume: get().playback.volume,
        mode: get().playback.mode,
        playerState: 'IDLE'
      }
    })
    get().broadcastPlayback()
  },

  next: () => {
    const { playback } = get()
    const { queue, currentIndex, mode } = playback
    if (!queue.length) return

    let nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      if (mode === 'loop') {
        nextIndex = 0
      } else {
        get().stop()
        return
      }
    }

    const media = queue[nextIndex]
    const playerState: PlayerState =
      media.tipo === 'imagem'
        ? 'PLAYING_IMAGE'
        : media.tipo === 'vídeo'
          ? 'PLAYING_VIDEO'
          : 'PLAYING_AUDIO'
    set((s) => ({
      playback: {
        ...s.playback,
        currentMedia: media,
        currentIndex: nextIndex,
        isPlaying: true,
        isPaused: false,
        playerState
      }
    }))
    get().broadcastPlayback()
  },

  prev: () => {
    const { playback } = get()
    const { queue, currentIndex } = playback
    if (!queue.length) return

    const prevIndex = Math.max(0, currentIndex - 1)
    const media = queue[prevIndex]
    const playerState: PlayerState =
      media.tipo === 'imagem'
        ? 'PLAYING_IMAGE'
        : media.tipo === 'vídeo'
          ? 'PLAYING_VIDEO'
          : 'PLAYING_AUDIO'
    set((s) => ({
      playback: {
        ...s.playback,
        currentMedia: media,
        currentIndex: prevIndex,
        isPlaying: true,
        isPaused: false,
        playerState
      }
    }))
    get().broadcastPlayback()
  },

  selectMedia: (media) => {
    const { medias } = get()
    const index = medias.findIndex((m) => m.id === media.id)
    const playerState: PlayerState =
      media.tipo === 'imagem'
        ? 'PLAYING_IMAGE'
        : media.tipo === 'vídeo'
          ? 'PLAYING_VIDEO'
          : 'PLAYING_AUDIO'
    set((s) => ({
      playback: {
        ...s.playback,
        currentMedia: media,
        currentIndex: index,
        queue: medias,
        isPlaying: true,
        isPaused: false,
        playlistId: media.playlist_id,
        playerState
      }
    }))
    get().broadcastPlayback()
  },

  setVolume: (volume) => {
    set((s) => ({ playback: { ...s.playback, volume } }))
    get().broadcastPlayback()
  },

  setPlaybackMode: (mode) => {
    set((s) => ({ playback: { ...s.playback, mode } }))
    get().broadcastPlayback()
  },

  setPlayerState: (playerState) => {
    set((s) => ({ playback: { ...s.playback, playerState } }))
    get().broadcastPlayback()
  },

  handleMediaEnded: () => {
    const { playback, settings } = get()
    const { queue, currentIndex, mode } = playback
    const policy = settings.ao_finalizar_midia

    if (policy === 'tela_ociosa') {
      get().stop()
      return
    }

    if (policy === 'reiniciar_midia') {
      const media = queue[currentIndex]
      if (media) {
        const playerState: PlayerState =
          media.tipo === 'imagem'
            ? 'PLAYING_IMAGE'
            : media.tipo === 'vídeo'
              ? 'PLAYING_VIDEO'
              : 'PLAYING_AUDIO'
        set((s) => ({
          playback: {
            ...s.playback,
            currentMedia: { ...media },
            isPlaying: true,
            playerState
          }
        }))
        get().broadcastPlayback()
      }
      return
    }

    if (policy === 'reiniciar_playlist') {
      if (queue.length > 0) {
        const media = queue[0]
        const playerState: PlayerState =
          media.tipo === 'imagem'
            ? 'PLAYING_IMAGE'
            : media.tipo === 'vídeo'
              ? 'PLAYING_VIDEO'
              : 'PLAYING_AUDIO'
        set((s) => ({
          playback: {
            ...s.playback,
            currentMedia: media,
            currentIndex: 0,
            isPlaying: true,
            playerState
          }
        }))
        get().broadcastPlayback()
      }
      return
    }

    // Default: proxima
    if (mode === 'loop' || mode === 'automatico' || mode === 'automatico_intervalo') {
      get().next()
    } else {
      get().stop()
    }
  },

  syncPlayback: (state) => {
    set({ playback: state })
  },

  broadcastPlayback: () => {
    window.api.sendPlaybackUpdate(get().playback as PlaybackState)
  }
}))
