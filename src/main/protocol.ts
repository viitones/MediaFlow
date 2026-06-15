import { protocol } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Readable, PassThrough } from 'stream'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

// Set ffmpeg binary path from ffmpeg-static
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

// Extensions that need codec transcoding (H.264/AAC -> WebM/VP8)
const VIDEO_TRANSCODE_EXTS = ['.mp4', '.mov', '.mkv', '.avi', '.flv', '.m4v']

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

      // --- VIDEO: Transcode via FFmpeg to WebM/VP8 ---
      if (VIDEO_TRANSCODE_EXTS.includes(ext)) {
        console.log('TRANSCODING VIDEO:', filePath)

        const passThrough = new PassThrough()

        ffmpeg(filePath)
          .format('webm')
          .videoCodec('libvpx')
          .audioCodec('libvorbis')
          .outputOptions(['-quality realtime', '-cpu-used 8', '-deadline realtime'])
          .on('start', (cmd) => console.log('FFmpeg started:', cmd))
          .on('error', (err) => {
            console.error('FFmpeg error:', err.message)
            passThrough.destroy(err)
          })
          .on('end', () => console.log('FFmpeg transcode finished'))
          .pipe(passThrough, { end: true })

        const webStream = Readable.toWeb(passThrough) as ReadableStream

        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/webm',
            'Transfer-Encoding': 'chunked'
          }
        })
      }

      // --- NON-VIDEO: Serve directly with Range support ---
      let contentType = 'application/octet-stream'
      if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg'
      else if (['.png'].includes(ext)) contentType = 'image/png'
      else if (['.gif'].includes(ext)) contentType = 'image/gif'
      else if (['.webp'].includes(ext)) contentType = 'image/webp'
      else if (['.mp3'].includes(ext)) contentType = 'audio/mpeg'
      else if (['.wav'].includes(ext)) contentType = 'audio/wav'
      else if (['.ogg'].includes(ext)) contentType = 'audio/ogg'
      else if (['.webm'].includes(ext)) contentType = 'video/webm'

      const rangeHeader = request.headers.get('Range')

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = end - start + 1

        const nodeStream = fs.createReadStream(filePath, { start, end })
        const webStream = Readable.toWeb(nodeStream) as ReadableStream

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
        const webStream = Readable.toWeb(nodeStream) as ReadableStream

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
