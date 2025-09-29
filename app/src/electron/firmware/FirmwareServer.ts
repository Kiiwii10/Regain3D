import http, { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { Socket } from 'net'

type Token = string

interface FirmwareEntry {
  filePath: string
  fileName: string
  expiresAt?: number
}

export type FirmwareUpdateContext = {
  rawIp?: string
  ip?: string
  headers: IncomingHttpHeaders
  url: string
}

type FirmwareUpdateListener = (payload: unknown, context: FirmwareUpdateContext) => void | Promise<void>

export class FirmwareServer {
  private static instance: FirmwareServer | null = null
  private server: http.Server | null = null
  private port: number | null = null
  private tokens = new Map<Token, FirmwareEntry>()
  private updateListeners: Set<FirmwareUpdateListener> = new Set()

  static getInstance(): FirmwareServer {
    if (!this.instance) this.instance = new FirmwareServer()
    return this.instance
  }

  async ensureStarted(preferredPort = 37631): Promise<void> {
    if (this.server) return

    this.port = await this.findAvailablePort(preferredPort)
    this.server = http.createServer((req, res) => this.handleRequest(req, res))
    await new Promise<void>((resolve) =>
      this.server!.listen(this.port!, '0.0.0.0', () => resolve())
    )
    console.log(`[FirmwareServer] Listening on port ${this.port}`)
  }

  registerUpdateListener(listener: FirmwareUpdateListener): () => void {
    this.updateListeners.add(listener)
    return () => {
      this.updateListeners.delete(listener)
    }
  }

  registerFirmware(
    filePath: string,
    ttlMs = 60 * 60 * 1000,
    peerIP?: string
  ): { token: string; url: string } {
    if (!this.server || !this.port) throw new Error('FirmwareServer not started')
    const fileName = path.basename(filePath)
    const token = this.generateToken()
    const expiresAt = Date.now() + ttlMs
    this.tokens.set(token, { filePath, fileName, expiresAt })
    const host = peerIP ? this.getLocalIPAddressForPeer(peerIP) : this.getLocalIPAddress()
    const url = `http://${host}:${this.port}/fw/${token}`
    return { token, url }
  }

  // Get the base URL for app port
  getBaseUrl(peerIP?: string): string {
    if (!this.port) throw new Error('FirmwareServer not started')
    const host = peerIP ? this.getLocalIPAddressForPeer(peerIP) : this.getLocalIPAddress()
    return `http://${host}:${this.port}`
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    try {
      const url = req.url || '/'
      if (req.method === 'POST' && (url === '/updates' || url === '/updates/')) {
        this.processUpdate(req, res)
        return
      }

      if (url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' })
        res.end(JSON.stringify({ ok: true, ts: Date.now() }))
        return
      }

      if (!url.startsWith('/fw/')) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const token = url.split('/').pop() || ''
      const entry = this.tokens.get(token)
      if (!entry) {
        res.statusCode = 404
        res.end('Invalid token')
        return
      }

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.tokens.delete(token)
        res.statusCode = 410
        res.end('Expired')
        return
      }

      if (!fs.existsSync(entry.filePath)) {
        res.statusCode = 404
        res.end('File not found')
        return
      }

      const stat = fs.statSync(entry.filePath)
      try {
        const peer = (req.socket as Socket)?.remoteAddress || 'unknown-peer'
        console.log(
          `[FirmwareServer] Firmware request for ${entry.fileName} (${stat.size} bytes) from ${peer}`
        )
      } catch {
        // no-op
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${entry.fileName}"`,
        'Cache-Control': 'no-cache'
      })
      const stream = fs.createReadStream(entry.filePath)
      stream.pipe(res)
      stream.on('error', () => {
        res.destroy()
      })
    } catch (err) {
      // log
      console.error(`[FirmwareServer] Error handling request: ${err}`)
      res.statusCode = 500
      res.end('Server error')
    }
  }

  private processUpdate(req: IncomingMessage, res: ServerResponse): void {
    const chunks: Buffer[] = []
    let totalBytes = 0
    const MAX_BYTES = 256 * 1024 // 256 KiB safety limit

    const respond = (status: number, body: unknown): void => {
      if (res.headersSent) return
      const payload = typeof body === 'string' ? body : JSON.stringify(body)
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      })
      res.end(payload)
    }

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length
      if (totalBytes > MAX_BYTES) {
        console.warn('[FirmwareServer] Update payload exceeded size limit, dropping request')
        respond(413, { ok: false, error: 'Payload too large' })
        req.destroy()
        return
      }
      chunks.push(Buffer.from(chunk))
    })

    req.on('error', (err) => {
      console.warn('[FirmwareServer] Error receiving update payload:', err)
      if (!res.headersSent) {
        respond(400, { ok: false, error: 'Request error' })
      }
    })

    req.on('end', () => {
      if (res.headersSent) return
      const body = Buffer.concat(chunks).toString('utf8')
      if (!body.trim()) {
        respond(400, { ok: false, error: 'Empty payload' })
        return
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch (err) {
        console.warn('[FirmwareServer] Invalid JSON payload from update client:', err)
        respond(400, { ok: false, error: 'Invalid JSON' })
        return
      }

      const context: FirmwareUpdateContext = {
        rawIp: req.socket?.remoteAddress || undefined,
        ip: this.normalizeRemoteAddress(req.socket?.remoteAddress),
        headers: req.headers,
        url: req.url || '/updates'
      }

      this.dispatchUpdate(parsed, context)
        .then(() => {
          respond(202, { ok: true })
        })
        .catch((err) => {
          console.error('[FirmwareServer] Update handler error:', err)
          respond(500, { ok: false, error: 'Handler error' })
        })
    })
  }

  private async dispatchUpdate(
    payload: unknown,
    context: FirmwareUpdateContext
  ): Promise<void> {
    if (this.updateListeners.size === 0) {
      console.warn('[FirmwareServer] Update received but no listeners registered')
      return
    }

    for (const listener of this.updateListeners) {
      try {
        await listener(payload, context)
      } catch (err) {
        console.error('[FirmwareServer] Update listener threw:', err)
      }
    }
  }

  private normalizeRemoteAddress(address?: string | null): string | undefined {
    if (!address) return undefined
    if (address.startsWith('::ffff:')) return address.slice(7)
    if (address === '::1') return '127.0.0.1'
    return address
  }

  private generateToken(): string {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }

  private async findAvailablePort(startPort: number): Promise<number> {
    const tryPort = (port: number): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        const srv = http.createServer()
        srv.once('error', () => resolve(false))
        srv.once('listening', () => {
          srv.close(() => resolve(true))
        })
        srv.listen(port, '0.0.0.0')
      })

    for (let p = startPort; p < startPort + 100; p++) {
      if (await tryPort(p)) return p
    }
    return 0
  }

  private getLocalIPAddress(): string {
    const nets = os.networkInterfaces()
    const candidates: string[] = []
    for (const name of Object.keys(nets)) {
      const addrs = nets[name] || []
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const ip = addr.address
          if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            candidates.push(ip)
          }
        }
      }
    }
    return candidates[0] || '127.0.0.1'
  }

  private getLocalIPAddressForPeer(peerIP: string): string {
    const nets = os.networkInterfaces()
    const peerParts = peerIP.split('.').map((p) => parseInt(p, 10))
    const candidates: string[] = []
    let best: string | null = null

    for (const name of Object.keys(nets)) {
      const addrs = nets[name] || []
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const ip = addr.address
          const parts = ip.split('.').map((p) => parseInt(p, 10))
          // Prefer same /24, then same /16, else collect
          if (parts[0] === peerParts[0] && parts[1] === peerParts[1] && parts[2] === peerParts[2]) {
            return ip
          }
          if (parts[0] === peerParts[0] && parts[1] === peerParts[1]) {
            best = best || ip
          } else {
            candidates.push(ip)
          }
        }
      }
    }
    return best || candidates[0] || this.getLocalIPAddress()
  }
}
