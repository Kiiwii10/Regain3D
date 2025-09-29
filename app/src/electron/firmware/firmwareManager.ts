import { EventEmitter } from 'events'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { app } from 'electron'
import { FirmwareServer } from '@electron/firmware/FirmwareServer'

export interface FirmwareInfo {
  id: string
  name: string
  version: string
  description?: string
  filePath: string
  fileName: string
  fileSize: number
  md5Hash: string
  printerType: string
  createdAt: Date
  lastModified: Date
}

export class FirmwareManager {
  private static eventEmitter: EventEmitter = new EventEmitter()
  private static firmwareCache: Map<string, FirmwareInfo> = new Map()
  private static firmwareDirectory: string = ''

  static getEventEmitter(): EventEmitter {
    return this.eventEmitter
  }

  static initialize(): void {
    // Primary firmware directory in user data (user overrides)
    this.firmwareDirectory = path.join(app.getPath('userData'), 'firmware')
    if (!fs.existsSync(this.firmwareDirectory)) {
      fs.mkdirSync(this.firmwareDirectory, { recursive: true })
      console.log(`[FirmwareManager] Created firmware directory: ${this.firmwareDirectory}`)
    }

    // Scan both userData and app resources
    console.log('[FirmwareManager] Starting initial firmware scan...')
    this.scanFirmwareDirectory()
      .then(() => this.scanAppResourcesDirectory())
      .catch((err) => {
        console.warn(
          '[FirmwareManager] User firmware scan failed, scanning app resources next:',
          err
        )
        return this.scanAppResourcesDirectory()
      })

    console.log('[FirmwareManager] Initialized firmware manager')
  }

  static getFirmwareDirectory(): string {
    return this.firmwareDirectory
  }

  static async scanFirmwareDirectory(): Promise<void> {
    try {
      console.log(`[FirmwareManager] Scanning user firmware directory: ${this.firmwareDirectory}`)
      const files = fs.readdirSync(this.firmwareDirectory)
      this.firmwareCache.clear()

      for (const file of files) {
        if (path.extname(file).toLowerCase() === '.bin') {
          const filePath = path.join(this.firmwareDirectory, file)
          const firmware = await this.analyzeFirmwareFile(filePath)
          if (firmware) {
            this.firmwareCache.set(firmware.id, firmware)
            console.log(`[FirmwareManager] Found firmware: ${firmware.name} v${firmware.version}`)
          }
        }
      }

      this.eventEmitter.emit('firmware-list-updated', Array.from(this.firmwareCache.values()))
      console.log(
        `[FirmwareManager] User firmware scan complete. Total known: ${this.firmwareCache.size}`
      )
    } catch (error) {
      console.error('[FirmwareManager] Error scanning firmware directory:', error)
    }
  }

  private static async scanAppResourcesDirectory(): Promise<void> {
    try {
      const baseResources = app.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'firmware')
        : path.join(process.cwd(), 'resources', 'firmware')

      console.log(`[FirmwareManager] Scanning app resources firmware directory: ${baseResources}`)
      const scanDir = (dir: string) => {
        if (!fs.existsSync(dir)) return
        const items = fs.readdirSync(dir)
        for (const item of items) {
          const full = path.join(dir, item)
          const stat = fs.statSync(full)
          if (stat.isDirectory()) {
            scanDir(full)
          } else if (stat.isFile() && path.extname(full).toLowerCase() === '.bin') {
            this.analyzeFirmwareFile(full)
              .then((fw) => {
                if (fw) {
                  this.firmwareCache.set(fw.id, fw)
                  console.log(
                    `[FirmwareManager] Found bundled firmware: ${fw.name} v${fw.version} (${fw.printerType})`
                  )
                }
              })
              .catch(() => void 0)
          }
        }
      }

      scanDir(baseResources)
      this.eventEmitter.emit('firmware-list-updated', Array.from(this.firmwareCache.values()))
      console.log(
        `[FirmwareManager] App resources firmware scan complete. Total known: ${this.firmwareCache.size}`
      )
    } catch (error) {
      // optional
    }
  }

  static async analyzeFirmwareFile(filePath: string): Promise<FirmwareInfo | null> {
    try {
      const stats = fs.statSync(filePath)
      const fileName = path.basename(filePath)

      // Calculate MD5 hash
      const fileBuffer = fs.readFileSync(filePath)
      const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex')

      // Parse firmware information from filename or metadata
      const firmwareInfo = this.parseFirmwareInfo(fileName, filePath, stats, md5Hash)

      return firmwareInfo
    } catch (error) {
      console.error(`[FirmwareManager] Error analyzing firmware file ${filePath}:`, error)
      return null
    }
  }

  private static parseFirmwareInfo(
    fileName: string,
    filePath: string,
    stats: fs.Stats,
    md5Hash: string
  ): FirmwareInfo {
    // Parse firmware info from filename pattern: name_version_printertype.bin
    // Example: regain3d-controller_v1.2.3_bambu.bin
    const baseName = path.basename(fileName, '.bin')
    const parts = baseName.split('_')

    let name = 'ESP32 Firmware'
    let version = 'unknown'
    let printerType = 'generic'
    let description = ''

    if (parts.length >= 2) {
      name = parts[0].replace(/-/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')

      // Look for version pattern (v1.2.3 or 1.2.3)
      const versionPart = parts.find((part) => /^v?\d+\.\d+(\.\d+)?/.test(part))
      if (versionPart) {
        version = versionPart.replace(/^v/, '')
      }

      // Look for printer type
      const printerTypePart = parts.find((part) =>
        ['bambu', 'prusa', 'generic', 'ender', 'cr10', 'mk3', 'mk4'].includes(part.toLowerCase())
      )
      if (printerTypePart) {
        printerType = printerTypePart.toLowerCase()
      }
    }

    // If still generic, try to infer printer type from directory path
    if (printerType === 'generic') {
      const lowerPath = filePath.toLowerCase()
      const knownBrands = ['bambu', 'prusa', 'ender', 'cr10', 'mk3', 'mk4', 'generic']
      for (const brand of knownBrands) {
        if (lowerPath.includes(path.sep + brand + path.sep)) {
          printerType = brand
          break
        }
      }
    }

    // Generate description
    description = `${name} firmware version ${version} for ${printerType} printers`

    const firmware: FirmwareInfo = {
      id: `${baseName}-${md5Hash.substring(0, 8)}`,
      name: name,
      version: version,
      description: description,
      filePath: filePath,
      fileName: fileName,
      fileSize: stats.size,
      md5Hash: md5Hash,
      printerType: printerType,
      createdAt: stats.birthtime,
      lastModified: stats.mtime
    }

    return firmware
  }

  static getAllFirmware(): FirmwareInfo[] {
    return Array.from(this.firmwareCache.values())
  }

  static getFirmwareById(id: string): FirmwareInfo | undefined {
    return this.firmwareCache.get(id)
  }

  static getFirmwareByPrinterType(printerType: string): FirmwareInfo[] {
    return Array.from(this.firmwareCache.values()).filter(
      (firmware) => firmware.printerType === printerType || firmware.printerType === 'generic'
    )
  }

  static async addFirmware(sourcePath: string, targetName?: string): Promise<FirmwareInfo | null> {
    try {
      const fileName = targetName || path.basename(sourcePath)
      const targetPath = path.join(this.firmwareDirectory, fileName)

      // Copy firmware file
      fs.copyFileSync(sourcePath, targetPath)

      // Analyze the new firmware
      const firmware = await this.analyzeFirmwareFile(targetPath)
      if (firmware) {
        this.firmwareCache.set(firmware.id, firmware)
        this.eventEmitter.emit('firmware-added', firmware)
        this.eventEmitter.emit('firmware-list-updated', Array.from(this.firmwareCache.values()))
        console.log(`[FirmwareManager] Added firmware: ${firmware.name} v${firmware.version}`)
        return firmware
      }

      return null
    } catch (error) {
      console.error('[FirmwareManager] Error adding firmware:', error)
      return null
    }
  }

  static async removeFirmware(id: string): Promise<boolean> {
    try {
      const firmware = this.firmwareCache.get(id)
      if (firmware) {
        // Delete the file
        fs.unlinkSync(firmware.filePath)

        // Remove from cache
        this.firmwareCache.delete(id)

        this.eventEmitter.emit('firmware-removed', firmware)
        this.eventEmitter.emit('firmware-list-updated', Array.from(this.firmwareCache.values()))
        console.log(`[FirmwareManager] Removed firmware: ${firmware.name} v${firmware.version}`)
        return true
      }

      return false
    } catch (error) {
      console.error('[FirmwareManager] Error removing firmware:', error)
      return false
    }
  }

  static generateFirmwareDownloadUrl(firmwareId: string): string {
    const firmware = this.getFirmwareById(firmwareId)
    if (!firmware) throw new Error('Firmware not found')
    const server = FirmwareServer.getInstance()
    // Best effort: ensure server is running
    server.ensureStarted().catch(() => void 0)
    const { url } = server.registerFirmware(firmware.filePath)
    return url
  }

  static getFirmwareForProvisioning(printerType: string): FirmwareInfo[] {
    // Get firmware suitable for provisioning based on printer type
    const compatible = this.getFirmwareByPrinterType(printerType)

    // Sort by version (newest first) and return
    return compatible.sort((a, b) => {
      // Simple version comparison - should be enhanced for proper semantic versioning
      return b.version.localeCompare(a.version)
    })
  }

  static getBestFirmwareForBrand(brand: string): FirmwareInfo | null {
    const list = this.getFirmwareForProvisioning(brand)
    if (list.length > 0) return list[0]
    return null
  }

  static async getDownloadForBrand(
    brand: string,
    opts?: { peerIP?: string }
  ): Promise<
    | { success: true; downloadUrl: string; firmware: FirmwareInfo }
    | { success: false; error: string }
  > {
    console.log(`[FirmwareManager] getDownloadForBrand: brand=${brand}`)
    let best = this.getBestFirmwareForBrand(brand)
    if (!best) {
      console.warn(`[FirmwareManager] No cached firmware for '${brand}'. Rescanning...`)
      await this.scanFirmwareDirectory()
      await this.scanAppResourcesDirectory()
      best = this.getBestFirmwareForBrand(brand)
    }
    if (!best) {
      console.error(`[FirmwareManager] Still no firmware for '${brand}' after rescan.`)
      return { success: false, error: `No firmware found for brand: ${brand}` }
    }
    // Recompute metadata (md5/size) in case the file changed after initial scan
    try {
      const fresh = await this.analyzeFirmwareFile(best.filePath)
      if (fresh) {
        best = fresh
        this.firmwareCache.set(fresh.id, fresh)
      }
    } catch {
      // ignore
    }

    await FirmwareServer.getInstance().ensureStarted()
    const { url } = FirmwareServer.getInstance().registerFirmware(
      best.filePath,
      undefined,
      opts?.peerIP
    )
    return { success: true, downloadUrl: url, firmware: best }
  }
}
