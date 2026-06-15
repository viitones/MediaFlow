import { ElectronAPI } from '@electron-toolkit/preload'

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
  tipo: 'image' | 'video' | 'audio'
  caminho_arquivo: string
  duracao: number
  ordem: number
}

export interface Config {
  imagem_ociosa: string
  modo_reproducao: 'manual' | 'automatico' | 'automatico_intervalo' | 'loop'
  intervalo_entre_midias: number
  monitor_selecionado: string
  volume_padrao: number
}

export interface MonitorInfo {
  id: string
  name: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isPrimary: boolean
}

export interface PlayerBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PlaybackState {
  currentMedia: Media | null
  isPlaying: boolean
  isPaused: boolean
  volume: number
  mode: Config['modo_reproducao']
  playlistId: number | null
  queue: Media[]
  currentIndex: number
  playerState: 'IDLE' | 'LOADING' | 'PLAYING_IMAGE' | 'PLAYING_VIDEO' | 'PLAYING_AUDIO' | 'PAUSED_IMAGE' | 'PAUSED_VIDEO' | 'PAUSED_AUDIO' | 'STOPPED' | 'ERROR'
}

export interface Settings {
  idle_image_path: string
  ao_finalizar_midia: 'proxima' | 'reiniciar_midia' | 'reiniciar_playlist' | 'tela_ociosa'
}

export interface Api {
  // Playlists
  getPlaylists: () => Promise<Playlist[]>
  savePlaylist: (playlist: Omit<Playlist, 'id'> & { id?: number }) => Promise<number>
  deletePlaylist: (id: number) => Promise<boolean>
  // Medias
  getMedias: (playlistId: number) => Promise<Media[]>
  saveMedia: (media: Omit<Media, 'id'> & { id?: number }) => Promise<number>
  deleteMedia: (id: number) => Promise<boolean>
  updateMediaOrder: (playlistId: number, mediaIds: number[]) => Promise<boolean>
  // Config
  getConfig: () => Promise<Config>
  saveConfig: (config: Partial<Config>) => Promise<boolean>
  // Settings
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Partial<Settings>) => Promise<boolean>
  // File picker dialogues
  selectMediaFiles: () => Promise<string[]>
  selectIdleImage: () => Promise<string | null>
  // File system utilities
  getFileSize: (filePath: string) => Promise<number>
  // Monitors
  getMonitors: () => Promise<MonitorInfo[]>
  // Player window
  openPlayer: (bounds: PlayerBounds, isFullscreen: boolean) => Promise<boolean>
  closePlayer: () => Promise<boolean>
  setPlayerFullscreen: (isFullscreen: boolean) => Promise<boolean>
  isPlayerOpen: () => Promise<boolean>
  // Playback sync
  sendPlaybackUpdate: (state: PlaybackState) => void
  onPlaybackSync: (callback: (state: PlaybackState) => void) => () => void
  requestPlaybackSync: () => void
  onRequestPlaybackSync: (callback: () => void) => () => void
  onPlayerStatus: (callback: (status: { isOpen: boolean }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
