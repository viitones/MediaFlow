import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'

// Register media:// scheme as privileged.
// This MUST be called before app is ready.
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: {
        secure: true,
        bypassCSP: true,
        stream: true,
        supportFetchAPI: true,
        corsEnabled: true
      }
    }
  ])
}

// Register the media:// protocol handler.
// This is called after app is ready.
export function setupMediaProtocol(): void {
  protocol.handle('media', (request) => {
    try {
      // Extract the target file path
      // media://C:/path/to/file.mp4 -> C:/path/to/file.mp4
      // media:///C:/path/to/file.mp4 -> C:/path/to/file.mp4
      let urlPath = request.url.slice('media://'.length)

      // Remove leading slashes if they exist (e.g. media:///C:/...)
      while (urlPath.startsWith('/')) {
        urlPath = urlPath.slice(1)
      }

      const filePath = decodeURIComponent(urlPath)
      const fileUrl = pathToFileURL(filePath).toString()

      return net.fetch(fileUrl)
    } catch (error) {
      console.error('Failed to handle media protocol request:', error)
      return new Response('Media Protocol Error', { status: 500 })
    }
  })
}
