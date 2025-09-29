import * as http from 'http'
import * as fs from 'fs'
import * as url from 'url'
import { EventEmitter } from 'events'
import { FirmwareManager } from './firmwareManager'

export class FirmwareDownloadServer {
  private static server: http.Server | null = null
  private static port: number = 3001
  private static eventEmitter: EventEmitter = new EventEmitter()
  private static isRunning: boolean = false

  static getEventEmitter(): EventEmitter {
    return this.eventEmitter
  }

  static async startServer(port: number = 3001): Promise<boolean> {
    if (this.isRunning) {
      console.log('[FirmwareDownloadServer] Server is already running')
      return true
    }

    this.port = port

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res)
      })

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`[FirmwareDownloadServer] Port ${this.port} is in use, trying next port`)
          this.port++
          this.server?.listen(this.port)
        } else {
          console.error('[FirmwareDownloadServer] Server error:', error)
          reject(error)
        }
      })

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true
        console.log(
          `[FirmwareDownloadServer] Firmware download server started on port ${this.port}`
        )
        this.eventEmitter.emit('server-started', this.port)
        resolve(true)
      })
    })
  }

  static stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server && this.isRunning) {
        this.server.close(() => {
          this.isRunning = false
          this.server = null
          console.log('[FirmwareDownloadServer] Firmware download server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  static getServerPort(): number {
    return this.port
  }

  static generateDownloadUrl(firmwareId: string): string {
    return `http://localhost:${this.port}/firmware/${firmwareId}`
  }

  private static handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url || '', true)
    const pathname = parsedUrl.pathname || ''

    console.log(
      `[FirmwareDownloadServer] ${req.method} ${pathname} from ${req.socket.remoteAddress}`
    )

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (req.method === 'GET' && pathname.startsWith('/firmware/')) {
      this.handleFirmwareDownload(req, res, pathname)
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  }

  private static handleFirmwareDownload(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string
  ): void {
    try {
      const firmwareId = pathname.split('/').pop()
      if (!firmwareId) {
        res.writeHead(400)
        res.end('Firmware ID required')
        return
      }

      const firmware = FirmwareManager.getFirmwareById(firmwareId)
      if (!firmware || !fs.existsSync(firmware.filePath)) {
        res.writeHead(404)
        res.end('Firmware not found')
        return
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${firmware.fileName}"`)
      res.setHeader('Content-Length', firmware.fileSize.toString())

      console.log(
        `[FirmwareDownloadServer] Serving firmware: ${firmware.name} v${firmware.version}`
      )

      // Stream the file
      const fileStream = fs.createReadStream(firmware.filePath)
      fileStream.pipe(res)

      fileStream.on('error', (error) => {
        console.error('[FirmwareDownloadServer] Error streaming file:', error)
        if (!res.headersSent) {
          res.writeHead(500)
          res.end('Error reading firmware file')
        }
      })
    } catch (error) {
      console.error('[FirmwareDownloadServer] Error handling download:', error)
      res.writeHead(500)
      res.end('Internal server error')
    }
  }
}
