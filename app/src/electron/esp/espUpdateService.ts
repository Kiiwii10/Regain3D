import { BrowserWindow } from 'electron'
import { FirmwareServer, FirmwareUpdateContext } from '@electron/firmware/FirmwareServer'
import { databaseService } from '@electron/database/database'
import { IpcChannels } from '@shared/constants/ipc'
import { ESPConfig } from '@shared/types/esp'
import { ESPDatabaseUpdate } from '@electron/esp/types/esp.types'
import { Buffer } from 'node:buffer'

function normalizeIp(address?: string | null): string | undefined {
  if (!address) return undefined
  if (address.startsWith('::ffff:')) return address.slice(7)
  if (address === '::1') return '127.0.0.1'
  return address
}

function extractString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  return undefined
}

function extractNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function extractBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return undefined
    if (['true', '1', 'yes', 'online', 'connected'].includes(normalized)) return true
    if (['false', '0', 'no', 'offline', 'disconnected'].includes(normalized)) return false
  }
  return undefined
}

function clampProgress(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function derivePrinterStatus(
  printerState?: string,
  connected?: boolean,
  applicationState?: string
): string | undefined {
  if (printerState && printerState.trim()) return printerState
  if (typeof connected === 'boolean') return connected ? 'online' : 'offline'
  if (applicationState) {
    const lowered = applicationState.toLowerCase()
    if (lowered.includes('error')) return 'error'
    if (lowered.includes('offline')) return 'offline'
    if (lowered.includes('online') || lowered.includes('running')) return 'online'
  }
  return undefined
}

function decodeBasicAuthCredential(source: unknown, origin: string): string | undefined {
  const headerValue = Array.isArray(source) ? source[0] : source
  if (typeof headerValue !== 'string') return undefined
  const trimmed = headerValue.trim()
  if (!trimmed) return undefined
  const match = /^Basic\s+(.+)$/i.exec(trimmed)
  if (!match) return undefined
  const encoded = match[1].trim()
  if (!encoded) return undefined
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8')
    if (!decoded.includes(':')) {
      console.warn('[ESPUpdateService] Basic auth header missing separator from', origin)
      return undefined
    }
    return decoded
  } catch (err) {
    console.warn('[ESPUpdateService] Failed to decode Basic auth header from', origin, err)
    return undefined
  }
}

type RawUpdatePayload = Record<string, unknown>

export class ESPUpdateService {
  private static instance: ESPUpdateService | null = null
  private listenerDisposer?: () => void
  private window?: BrowserWindow

  static getInstance(): ESPUpdateService {
    if (!this.instance) {
      this.instance = new ESPUpdateService()
    }
    return this.instance
  }

  async initialize(win: BrowserWindow): Promise<void> {
    this.window = win
    await FirmwareServer.getInstance().ensureStarted()

    if (this.listenerDisposer) return

    this.listenerDisposer = FirmwareServer.getInstance().registerUpdateListener(
      (payload, context) => {
        this.handleUpdate(payload, context).catch((err) => {
          console.error('[ESPUpdateService] Failed to process update payload:', err)
        })
      }
    )

    console.log('[ESPUpdateService] Listening for ESP status updates')
  }

  shutdown(): void {
    if (this.listenerDisposer) {
      this.listenerDisposer()
      this.listenerDisposer = undefined
    }
  }

  private async handleUpdate(payload: unknown, context: FirmwareUpdateContext): Promise<void> {
    if (!payload || typeof payload !== 'object') {
      console.warn(
        '[ESPUpdateService] Ignoring update with invalid payload from',
        context.ip || context.rawIp || 'unknown'
      )
      return
    }

    const data = payload as RawUpdatePayload
    const deviceId = extractString(data.device_id)
    const printerIdFromPayload = extractString(data.printer_id)
    const state = extractString(data.state ?? data.status)
    const printerState = extractString(data.printer_state)
    const connected = extractBoolean(data.connected)
    const progress = clampProgress(extractNumber(data.progress))
    const firmwareVersion = extractString(data.firmware_version ?? data.version)
    const explicitIp = extractString(data.ip ?? data.ip_address)

    const candidates = [
      context.ip,
      normalizeIp(context.rawIp),
      normalizeIp(explicitIp)
    ].filter((v): v is string => typeof v === 'string')

    let esp: ESPConfig | undefined
    if (deviceId) {
      esp = await databaseService.getESPByDeviceId(deviceId)
      if (!esp) {
        esp = await databaseService.getESPByChipId(deviceId)
      }
    }

    if (!esp) {
      for (const candidate of candidates) {
        esp = await databaseService.getESPByIP(candidate)
        if (esp) break
      }
    }

    if (!esp) {
      console.warn(
        '[ESPUpdateService] Received update from unknown device',
        deviceId || explicitIp || context.ip || 'unidentified'
      )
      return
    }

    const origin = deviceId || explicitIp || context.ip || context.rawIp || 'unidentified'
    const providedCredential = decodeBasicAuthCredential(context.headers?.authorization, origin)
    const expectedCredential = esp.updateToken?.trim()

    if (expectedCredential) {
      const normalizedProvided = providedCredential?.trim()
      if (!normalizedProvided) {
        console.warn(
          '[ESPUpdateService] Rejecting update with missing Basic auth from',
          origin
        )
        return
      }
      if (normalizedProvided !== expectedCredential) {
        console.warn(
          '[ESPUpdateService] Rejecting update with invalid credentials from',
          origin
        )
        return
      }
      console.log('[ESPUpdateService] Authenticated update from', origin)
    }

    const updates: ESPDatabaseUpdate = {
      deviceId: deviceId ?? esp.deviceId,
      status: state ?? esp.status,
      lastSeenAt: new Date(),
      lastPrinterState: printerState ?? esp.lastPrinterState,
      lastPrinterProgress: progress ?? esp.lastPrinterProgress,
      lastPayload: data
    }

    if (typeof connected === 'boolean') {
      updates.status = connected
        ? state ?? esp.status ?? 'online'
        : 'offline'
    }

    if (firmwareVersion) {
      updates.version = firmwareVersion
    }

    if (printerIdFromPayload) {
      updates.assignedPrinterId = printerIdFromPayload
    }

    await databaseService.updateESP(esp.id, updates)

    const refreshed = await databaseService.getESP(esp.id)
    const active = refreshed ?? esp

    this.emitStatusUpdate(active, data, context)
    this.notifyESPConfigsChanged()

    const effectivePrinterId = printerIdFromPayload || active?.assignedPrinterId
    const printerStatus = derivePrinterStatus(printerState, connected, state)

    if (effectivePrinterId && printerStatus) {
      try {
        await databaseService.updatePrinter(effectivePrinterId, { status: printerStatus } as any)
        this.notifyPrinterConfigsChanged()
      } catch (err) {
        console.warn('[ESPUpdateService] Failed to update printer status from ESP update:', err)
      }
    }
  }

  private emitStatusUpdate(
    esp: ESPConfig | undefined,
    payload: RawUpdatePayload,
    context: FirmwareUpdateContext
  ): void {
    if (!this.window || this.window.isDestroyed()) return

    const eventPayload = {
      espId: esp?.id ?? null,
      deviceId: esp?.deviceId ?? extractString(payload.device_id) ?? null,
      ip: esp?.ip ?? context.ip ?? context.rawIp ?? null,
      update: {
        status: esp?.status ?? null,
        lastSeenAt: esp?.lastSeenAt ?? null,
        lastPrinterState: esp?.lastPrinterState ?? null,
        lastPrinterProgress: typeof esp?.lastPrinterProgress === 'number'
          ? esp.lastPrinterProgress
          : null,
        assignedPrinterId: esp?.assignedPrinterId ?? null,
        version: esp?.version ?? null
      },
      payload
    }

    try {
      this.window.webContents.send(IpcChannels.ESP_STATUS_UPDATE, eventPayload)
    } catch (err) {
      console.warn('[ESPUpdateService] Failed to emit ESP_STATUS_UPDATE event:', err)
    }
  }

  private notifyESPConfigsChanged(): void {
    if (!this.window || this.window.isDestroyed()) return
    try {
      this.window.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
    } catch (err) {
      console.warn('[ESPUpdateService] Failed to notify ESP_CONFIGS_CHANGED:', err)
    }
  }

  private notifyPrinterConfigsChanged(): void {
    if (!this.window || this.window.isDestroyed()) return
    try {
      this.window.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
    } catch (err) {
      console.warn('[ESPUpdateService] Failed to notify PRINTER_CONFIGS_CHANGED:', err)
    }
  }
}
