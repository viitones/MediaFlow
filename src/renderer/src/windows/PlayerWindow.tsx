import { useEffect } from 'react'
import PlayerView from '../components/PlayerView'
import { useMediaStore } from '../store/useMediaStore'

export default function PlayerWindow() {
  const { syncPlayback } = useMediaStore()

  useEffect(() => {
    // Subscribe to sync events
    const unsubSync = window.api.onPlaybackSync((state) => {
      syncPlayback(state)
    })

    // Ask the control window for the current playback state
    window.api.requestPlaybackSync()

    return () => {
      unsubSync()
    }
  }, [syncPlayback])

  return <PlayerView />
}
