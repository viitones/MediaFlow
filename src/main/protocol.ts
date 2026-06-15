import { protocol } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

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

export function setupMediaProtocol(): void {
  protocol.handle('media', (request) => {
    console.log('MEDIA REQUEST:', request.url)
    console.log('RANGE HEADER:', request.headers.get('Range'))
    try {
      let urlPath = request.url.slice('media://'.length)
      while (urlPath.startsWith('/')) {
        urlPath = urlPath.slice(1)
      }
      const filePath = decodeURIComponent(urlPath)

      console.log('FILE PATH:', filePath)
      console.log('EXISTS:', fs.existsSync(filePath))

      const stat = fs.statSync(filePath)
      const fileSize = stat.size
      const ext = path.extname(filePath).toLowerCase()

      let contentType = 'application/octet-stream'
      if (['.mp4'].includes(ext)) contentType = 'video/mp4'
      else if (['.webm'].includes(ext)) contentType = 'video/webm'
      else if (['.mov'].includes(ext)) contentType = 'video/quicktime'
      else if (['.mkv'].includes(ext)) contentType = 'video/x-matroska'
      else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg'
      else if (['.png'].includes(ext)) contentType = 'image/png'
      else if (['.gif'].includes(ext)) contentType = 'image/gif'
      else if (['.webp'].includes(ext)) contentType = 'image/webp'
      else if (['.mp3'].includes(ext)) contentType = 'audio/mpeg'
      else if (['.wav'].includes(ext)) contentType = 'audio/wav'
      else if (['.ogg'].includes(ext)) contentType = 'audio/ogg'

      console.log('FILE SIZE:', fileSize)
      console.log('EXTENSION:', ext)
      console.log('CONTENT TYPE:', contentType)

      const rangeHeader = request.headers.get('Range')

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = end - start + 1

        console.log('START:', start)
        console.log('END:', end)
        console.log('FILE SIZE:', fileSize)
        
        const nodeStream = fs.createReadStream(filePath, { start, end })
        const webStream = require('stream').Readable.toWeb(nodeStream)

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType
          }
        })
      } else {
        const nodeStream = fs.createReadStream(filePath)
        const webStream = require('stream').Readable.toWeb(nodeStream)

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': contentType
          }
        })
      }
    } catch (error) {
      console.error('Failed to handle media protocol request:', error)
      return new Response('Media Protocol Error', { status: 500 })
    }
  })
}
