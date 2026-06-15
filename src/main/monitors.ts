import { screen, ipcMain } from 'electron'

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

export function setupMonitorHandlers(): void {
  ipcMain.handle('monitors:get-all', (): MonitorInfo[] => {
    const displays = screen.getAllDisplays()
    const primaryDisplay = screen.getPrimaryDisplay()

    return displays.map((display, index) => {
      return {
        id: display.id.toString(),
        name:
          display.label ||
          `Monitor ${index + 1} (${display.bounds.width}x${display.bounds.height})`,
        bounds: {
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height
        },
        isPrimary: display.id === primaryDisplay.id
      }
    })
  })
}
