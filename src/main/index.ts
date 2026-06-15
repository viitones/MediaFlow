import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { registerMediaScheme, setupMediaProtocol } from './protocol'
import { setupMonitorHandlers } from './monitors'

// Register media:// scheme before app is ready
registerMediaScheme()

let mainWindow: BrowserWindow | null = null
let playerWindow: BrowserWindow | null = null

function createControlWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'MediaFlow - Controle',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    // If the control window is closed, close the player window too
    if (playerWindow) {
      playerWindow.close()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createPlayerWindow(
  bounds: { x: number; y: number; width: number; height: number },
  isFullscreen: boolean
): void {
  // Close existing player window if open
  if (playerWindow) {
    playerWindow.close()
  }

  playerWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fullscreen: isFullscreen,
    frame: false,
    autoHideMenuBar: true,
    title: 'Player de Exibição',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  playerWindow.on('ready-to-show', () => {
    if (playerWindow) {
      playerWindow.show()
    }
  })

  playerWindow.on('closed', () => {
    playerWindow = null
    // Notify control window that player window has closed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('player:status', { isOpen: false })
    }
  })

  // Load the player view route (#/player)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    playerWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/player`)
  } else {
    playerWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/player' })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  // Watch shortcuts
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize features
  initDatabase()
  setupMediaProtocol()
  setupMonitorHandlers()

  // IPC handlers for Window Management
  ipcMain.handle(
    'player:open',
    (_, bounds: { x: number; y: number; width: number; height: number }, isFullscreen: boolean) => {
      createPlayerWindow(bounds, isFullscreen)
      return true
    }
  )

  ipcMain.handle('player:close', () => {
    if (playerWindow) {
      playerWindow.close()
    }
    return true
  })

  ipcMain.handle('player:set-fullscreen', (_, isFullscreen: boolean) => {
    if (playerWindow) {
      playerWindow.setFullScreen(isFullscreen)
      return true
    }
    return false
  })

  ipcMain.handle('player:is-open', () => {
    return playerWindow !== null && !playerWindow.isDestroyed()
  })

  // Dialog file picker for media selection
  ipcMain.handle('dialog:open-media', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Selecionar Mídias',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Arquivos de Mídia',
          extensions: [
            'jpg',
            'jpeg',
            'png',
            'gif',
            'webp',
            'mp4',
            'webm',
            'mov',
            'mkv',
            'mp3',
            'wav',
            'ogg',
            'm4a'
          ]
        }
      ]
    })
    if (result.canceled) return []
    return result.filePaths
  })

  // Dialog file picker for idle image selection
  ipcMain.handle('dialog:open-idle-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Selecionar Imagem Ociosa',
      properties: ['openFile'],
      filters: [
        {
          name: 'Imagens',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // File system utilities
  ipcMain.handle('fs:get-file-size', async (_, filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath)
      return stats.size
    } catch (e) {
      console.error('Error getting file size:', e)
      return 0
    }
  })

  // Playback sync event broadcasting
  ipcMain.on('playback:update', (_, state) => {
    // Forward state to both windows to keep them in sync
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playback:sync', state)
    }
    if (playerWindow && !playerWindow.isDestroyed()) {
      playerWindow.webContents.send('playback:sync', state)
    }
  })

  ipcMain.on('playback:seek', (_, time: number) => {
    if (playerWindow && !playerWindow.isDestroyed()) {
      playerWindow.webContents.send('playback:seek', time)
    }
  })

  ipcMain.on('playback:request-sync', () => {
    // A window (usually the newly opened Player) is requesting sync.
    // We forward this request to the control window (mainWindow)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('playback:request-sync')
    }
  })

  createControlWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
