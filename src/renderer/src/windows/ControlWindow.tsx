import PlaylistSidebar from '../components/PlaylistSidebar'
import MediaManager from '../components/MediaManager'
import PlayerPreview from '../components/PlayerPreview'
import ControlPanel from '../components/ControlPanel'

export default function ControlWindow() {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* App title bar */}
      <div className="flex items-center px-4 py-2.5 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <h1 className="ml-4 text-sm font-semibold text-gray-300">MediaFlow</h1>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Playlists */}
        <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 overflow-hidden flex flex-col">
          <PlaylistSidebar />
        </aside>

        {/* Center - Media list */}
        <main className="flex-1 overflow-hidden flex flex-col bg-gray-800/40">
          <MediaManager />
        </main>

        {/* Right - Preview panel */}
        <aside className="w-64 shrink-0 bg-gray-900 border-l border-gray-800 overflow-hidden flex flex-col">
          <PlayerPreview />
        </aside>
      </div>

      {/* Bottom - Control bar */}
      <div className="min-h-28 shrink-0">
        <ControlPanel />
      </div>
    </div>
  )
}
