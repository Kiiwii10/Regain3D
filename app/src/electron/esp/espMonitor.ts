import { databaseService } from '@electron/database/database'
import { ESPProvisioningService } from '@electron/esp/espProvisioning'
import { DiscoveredESP } from '@shared/types/esp'
import { ESPDatabaseUpdate, ESPDeviceStatus } from './types/esp.types'

type MonitorHandle = {
  interval?: NodeJS.Timeout
  running: boolean
}

const handle: MonitorHandle = {
  interval: undefined,
  running: false
}

const STALE_THRESHOLD_MS = 2 * 60 * 1000 // 2 minutes

// Determine provisioned/assigned state from root/app docs
function deriveProvisioned(doc: ESPDeviceStatus): boolean | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  // App-mode doc
  if (
    'connected' in doc ||
    'printer_type' in doc ||
    'printer_brand' in doc ||
    'printer_id' in doc
  ) {
    return true
  }
  // Provisioning-mode doc
  if ('application_assigned' in doc) {
    return !!doc.application_assigned
  }
  if (typeof doc.status === 'string') {
    const s = String(doc.status).toLowerCase()
    if (s.includes('provisioned') || s.includes('ready') || s.includes('assigned')) return true
  }
  return undefined
}

function deriveVersion(doc: ESPDeviceStatus): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  if (typeof doc.firmware_version === 'string') return doc.firmware_version
  if (doc.application_config && typeof doc.application_config?.firmware_version === 'string')
    return doc.application_config.firmware_version
  return undefined
}

function deriveAssignedPrinterId(doc: ESPDeviceStatus): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  // app doc may carry printer_id
  if (typeof doc.printer_id === 'string' && doc.printer_id.trim()) return doc.printer_id
  return undefined
}

function derivePrinterState(doc: ESPDeviceStatus): string | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  const candidates = [
    doc.printer_state,
    doc.state,
    doc.status,
    doc.app?.state,
    doc.application_config?.state
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  if (typeof doc.connected === 'boolean') return doc.connected ? 'online' : 'offline'
  return undefined
}

function deriveProgress(doc: ESPDeviceStatus): number | undefined {
  const raw =
    (doc as any)?.progress ??
    (doc as any)?.printer_progress ??
    (doc as any)?.completion ??
    (doc as any)?.job_progress
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.min(100, raw))
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed))
  }
  return undefined
}

function deriveDeviceId(doc: ESPDeviceStatus): string | undefined {
  if (typeof (doc as any)?.device_id === 'string') return (doc as any).device_id
  if (typeof doc.chipId === 'string') return doc.chipId
  if (typeof doc.chip_id === 'string') return doc.chip_id
  return undefined
}

async function probeOnce(): Promise<void> {
  try {
    const esps = await databaseService.getAllESPs()
    if (!esps || esps.length === 0) return

    const now = Date.now()
    for (const esp of esps) {
      const lastSeen = esp.lastSeenAt instanceof Date ? esp.lastSeenAt.getTime() : NaN
      const shouldProbe =
        !Number.isFinite(lastSeen) ||
        now - lastSeen > STALE_THRESHOLD_MS

      if (!shouldProbe) {
        continue
      }

      if (
        Number.isFinite(lastSeen) &&
        now - lastSeen > STALE_THRESHOLD_MS &&
        esp.status && esp.status !== 'stale'
      ) {
        try {
          await databaseService.updateESP(esp.id, { status: 'stale' })
        } catch {
          // ignore failures - status update best effort
        }
      }

      try {
        const doc: ESPDeviceStatus = await ESPProvisioningService.getESPStatus({
          ip: esp.ip,
          hostname: esp.hostname,
          name: esp.name,
          isProvisioned: esp.isProvisioned
        } as DiscoveredESP)

        const updates: ESPDatabaseUpdate = {}
        const ver = deriveVersion(doc)
        if (ver && ver !== esp.version) updates.version = ver
        const prov = deriveProvisioned(doc)
        if (typeof prov === 'boolean' && prov !== esp.isProvisioned) updates.isProvisioned = prov
        const printerId = deriveAssignedPrinterId(doc)
        if (printerId && printerId !== esp.assignedPrinterId) updates.assignedPrinterId = printerId

        const state = derivePrinterState(doc)
        if (state && state !== esp.status) updates.status = state

        const progress = deriveProgress(doc)
        if (
          typeof progress === 'number' &&
          (typeof esp.lastPrinterProgress !== 'number' || progress !== esp.lastPrinterProgress)
        ) {
          updates.lastPrinterProgress = progress
        }

        const deviceId = deriveDeviceId(doc)
        if (deviceId && deviceId !== esp.deviceId) {
          updates.deviceId = deviceId
        }

        updates.lastSeenAt = new Date()
        updates.lastPrinterState = state ?? esp.lastPrinterState
        updates.lastPayload = doc as unknown as Record<string, unknown>

        if (Object.keys(updates).length > 0) {
          await databaseService.updateESP(esp.id, updates)
        }
      } catch {
        // Unreachable or failed probe: mark the controller offline
        try {
          await databaseService.updateESP(esp.id, {
            status: 'offline'
          })
        } catch {
          // Ignore DB update errors
        }
        continue
      }
    }
  } catch (err) {
    console.warn('[ESPMonitor] Probe cycle failed:', err)
  }
}

export const ESPMonitor = {
  start(intervalMs = 60000): void {
    if (handle.running) return
    handle.running = true
    // Kick one immediately, then schedule
    probeOnce().catch(() => void 0)
    handle.interval = setInterval(() => {
      probeOnce().catch(() => void 0)
    }, intervalMs)
    console.log(`[ESPMonitor] Started with interval ${intervalMs}ms`)
  },
  stop(): void {
    if (!handle.running) return
    if (handle.interval) clearInterval(handle.interval)
    handle.interval = undefined
    handle.running = false
    console.log('[ESPMonitor] Stopped')
  },
  async probeNow(): Promise<void> {
    await probeOnce()
  }
}
