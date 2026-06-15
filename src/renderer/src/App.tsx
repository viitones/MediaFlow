import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useMediaStore } from './store/useMediaStore'
import ControlWindow from './windows/ControlWindow'
import PlayerWindow from './windows/PlayerWindow'

function AppInitializer() {
  const { loadPlaylists, loadConfig, loadSettings, loadMonitors, syncPlayback, broadcastPlayback } =
    useMediaStore()

  useEffect(() => {
    // Initialize data from SQLite
    loadPlaylists()
    loadConfig()
    loadSettings()
    loadMonitors()

    // Subscribe to cross-window playback sync
    const unsubSync = window.api.onPlaybackSync((state) => {
      syncPlayback(state)
    })

    // When this window is asked to provide its state (e.g. player just opened)
    const unsubReqSync = window.api.onRequestPlaybackSync(() => {
      broadcastPlayback()
    })

    // Track player window status
    const unsubPlayerStatus = window.api.onPlayerStatus(({ isOpen }) => {
      useMediaStore.getState().setIsPlayerOpen(isOpen)
    })

    return () => {
      unsubSync()
      unsubReqSync()
      unsubPlayerStatus()
    }
  }, [loadPlaylists, loadConfig, loadSettings, loadMonitors, syncPlayback, broadcastPlayback])

  return null
}

export default function App() {
  return (
    <HashRouter>
      <AppInitializer />
      <Routes>
        <Route path="/" element={<ControlWindow />} />
        <Route path="/player" element={<PlayerWindow />} />
      </Routes>
    </HashRouter>
  )
}
