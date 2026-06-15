import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Playlists CRUD
  getPlaylists: () => ipcRenderer.invoke('db:get-playlists'),
  savePlaylist: (playlist: any) => ipcRenderer.invoke('db:save-playlist', playlist),
  deletePlaylist: (id: number) => ipcRenderer.invoke('db:delete-playlist', id),

  // Medias CRUD
  getMedias: (playlistId: number) => ipcRenderer.invoke('db:get-medias', playlistId),
  saveMedia: (media: any) => ipcRenderer.invoke('db:save-media', media),
  deleteMedia: (id: number) => ipcRenderer.invoke('db:delete-media', id),
  updateMediaOrder: (playlistId: number, mediaIds: number[]) =>
    ipcRenderer.invoke('db:update-media-order', playlistId, mediaIds),

  // Configurações CRUD
  getConfig: () => ipcRenderer.invoke('db:get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('db:save-config', config),

  // Settings CRUD
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('db:save-settings', settings),

  // File Picker Dialogs
  selectMediaFiles: () => ipcRenderer.invoke('dialog:open-media'),
  selectIdleImage: () => ipcRenderer.invoke('dialog:open-idle-image'),

  // File system API
  getFileSize: (filePath: string) => ipcRenderer.invoke('fs:get-file-size', filePath),

  // Monitor API
  getMonitors: () => ipcRenderer.invoke('monitors:get-all'),

  // Player Window Management
  openPlayer: (bounds: any, isFullscreen: boolean) =>
    ipcRenderer.invoke('player:open', bounds, isFullscreen),
  closePlayer: () => ipcRenderer.invoke('player:close'),
  setPlayerFullscreen: (isFullscreen: boolean) =>
    ipcRenderer.invoke('player:set-fullscreen', isFullscreen),
  isPlayerOpen: () => ipcRenderer.invoke('player:is-open'),

  // Playback Cross-Window synchronization
  sendPlaybackUpdate: (state: any) => ipcRenderer.send('playback:update', state),
  onPlaybackSync: (callback: (state: any) => void) => {
    const listener = (_event: any, state: any) => callback(state)
    ipcRenderer.on('playback:sync', listener)
    return () => {
      ipcRenderer.off('playback:sync', listener)
    }
  },
  requestPlaybackSync: () => ipcRenderer.send('playback:request-sync'),
  onRequestPlaybackSync: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('playback:request-sync', listener)
    return () => {
      ipcRenderer.off('playback:request-sync', listener)
    }
  },
  seekVideo: (time: number) => ipcRenderer.send('playback:seek', time),
  onPlaybackSeek: (callback: (time: number) => void) => {
    const listener = (_event: any, time: number) => callback(time)
    ipcRenderer.on('playback:seek', listener)
    return () => {
      ipcRenderer.off('playback:seek', listener)
    }
  },
  onPlayerStatus: (callback: (status: { isOpen: boolean }) => void) => {
    const listener = (_event: any, status: { isOpen: boolean }) => callback(status)
    ipcRenderer.on('player:status', listener)
    return () => {
      ipcRenderer.off('player:status', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
