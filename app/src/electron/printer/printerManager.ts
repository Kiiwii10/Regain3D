import { BasePrinter } from '@electron/printer/core/BasePrinter'
import { BambulabPrinter } from '@electron/printer/core/BambulabPrinter'
import { PrinterConfig, PrinterCommand } from '@shared/types/printer'
import { databaseService } from '@electron/database/database'
const ESP_HEALTH_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes tolerance for ESP heartbeats

// A map to hold our "printer drivers"
const PRINTER_DRIVERS: Record<string, typeof BasePrinter> = {
  bambu: BambulabPrinter as unknown as typeof BasePrinter
  // prusa: PrusaPrinter, // Future printers would be added here
}

class PrinterManagerService {
  private static instance: PrinterManagerService
  private activePrinters: Map<string, BasePrinter> = new Map()

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): PrinterManagerService {
    if (!PrinterManagerService.instance) {
      PrinterManagerService.instance = new PrinterManagerService()
    }
    return PrinterManagerService.instance
  }

  public getPrinterDriver(brand: string): typeof BasePrinter | undefined {
    return PRINTER_DRIVERS[brand]
  }

  public getAllPrinterDrivers(): Record<string, typeof BasePrinter> {
    return PRINTER_DRIVERS
  }

  public getAvailableBrands(): string[] {
    return Object.keys(PRINTER_DRIVERS)
  }

  public getAvailableModels(brand: string): string[] {
    const DriverClass = this.getPrinterDriver(brand)
    if (!DriverClass) {
      return []
    }

    // Create a temporary instance to access the models array
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tempInstance = new (DriverClass as any)({}) as BasePrinter & { models?: string[] }
      return tempInstance.models || []
    } catch (error) {
      console.error(`Failed to get models for brand ${brand}:`, error)
      return []
    }
  }

  public getPrinterInfo(): Record<string, string[]> {
    const info: Record<string, string[]> = {}

    for (const brand of this.getAvailableBrands()) {
      info[brand] = this.getAvailableModels(brand)
    }

    return info
  }

  public initializePrinter(config: PrinterConfig): BasePrinter {
    // Backfill connectionConfig.accessCodeSecretId from legacy root column if needed
    try {
      const anyCfg = config as any
      const cc = { ...(config.connectionConfig || {}) }
      if (!cc.accessCodeSecretId && anyCfg.accessCodeSecretId) {
        cc.accessCodeSecretId = anyCfg.accessCodeSecretId
        config.connectionConfig = cc
        // Persist the fix so subsequent loads have proper structure
        try {
          void databaseService.updatePrinter(config.id, { connectionConfig: cc } as any)
        } catch {}
      }
    } catch {}

    const DriverClass = this.getPrinterDriver(config.brand)
    if (!DriverClass) {
      throw new Error(`No driver found for printer brand: ${config.brand}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const printerInstance = new (DriverClass as any)(config) as BasePrinter
    this.activePrinters.set(config.id, printerInstance)

    // Attach basic status listeners if available
    const anyInstance = printerInstance as any
    if (anyInstance?.events?.on) {
      try {
        anyInstance.events.on('connected', async () => {
          try {
            await databaseService.updatePrinter(config.id, { status: 'online' } as any)
          } catch {}
        })
        anyInstance.events.on('disconnected', async () => {
          try {
            await databaseService.updatePrinter(config.id, { status: 'offline' } as any)
          } catch {}
        })
        anyInstance.events.on('error', async () => {
          try {
            await databaseService.updatePrinter(config.id, { status: 'offline' } as any)
          } catch {}
        })
      } catch {}
    }
    return printerInstance
  }

  public getPrinterById(id: string): BasePrinter | undefined {
    return this.activePrinters.get(id)
  }

  public async removePrinter(id: string): Promise<void> {
    const printer = this.activePrinters.get(id)
    if (printer) {
      await printer.disconnect()
      this.activePrinters.delete(id)
    }
  }

  public async sendCommand(id: string, command: PrinterCommand): Promise<void> {
    const printer = this.activePrinters.get(id)
    if (!printer) throw new Error(`Printer ${id} not found`)
    await printer.executeCommand(command)
  }

  public async isPrinterHandledByESP(printerId: string): Promise<boolean> {
    try {
      const esps = await databaseService.getESPsByPrinter(printerId)
      if (!esps || esps.length === 0) return false

      const now = Date.now()
      for (const esp of esps) {
        const lastSeenTime = esp.lastSeenAt
          ? new Date(esp.lastSeenAt as Date).getTime()
          : NaN
        if (!Number.isFinite(lastSeenTime)) continue
        if (now - lastSeenTime > ESP_HEALTH_TIMEOUT_MS) continue

        const status = (esp.status || '').toLowerCase()
        if (status.includes('error') || status.includes('offline')) continue

        if (typeof esp.lastPrinterState === 'string') {
          const printerState = esp.lastPrinterState.toLowerCase()
          if (printerState.includes('offline') || printerState.includes('disconnected')) {
            continue
          }
        }

        return true
      }
    } catch (err) {
      console.warn(
        `[PrinterManager] Failed to determine if printer ${printerId} is handled by ESP:`,
        err
      )
    }
    return false
  }
}

export const printerManagerService = PrinterManagerService.getInstance()
