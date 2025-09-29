import { ipcMain, BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/constants/ipc'
import { printerManagerService } from '@electron/printer/printerManager'
import { databaseService } from '@electron/database/database'
import { secretsService } from '@electron/secrets.service'
import { discoveryManagerService } from '@electron/printer/discoveryManager'
import { ESPDiscoveryManager } from '@electron/esp/espDiscoveryManager'
import { ESPProvisioningService } from '@electron/esp/espProvisioning'
import { FirmwareManager } from '@electron/firmware/firmwareManager'
import { FirmwareServer } from '@electron/firmware/FirmwareServer'
import { ESPOrchestrator } from '@electron/esp/espOrchestrator'
import { PrinterConfig, PrinterCommand } from '@shared/types/printer'
import * as fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export function registerIpcHandlers(win: BrowserWindow): void {
  // --- Printer Discovery ---
  ipcMain.handle(IpcChannels.DEVICE_DISCOVERY_START, () => {
    discoveryManagerService.start(win)
  })

  ipcMain.handle(IpcChannels.DEVICE_DISCOVERY_STOP, () => {
    discoveryManagerService.stop()
  })

  // --- Printer Validation ---

  ipcMain.handle(IpcChannels.PRINTER_VALIDATE, async (_, config) => {
    const driver = printerManagerService.getPrinterDriver(config.brand)
    if (!driver) throw new Error(`Unsupported printer brand: ${config.brand}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tempInstance = new (driver as any)({})
    return await tempInstance.validate(config)
  })

  ipcMain.handle(IpcChannels.PRINTER_CHECK_NAME, async (_, name: string) => {
    return await databaseService.doesPrinterNameExist(name)
  })

  // --- Get Printer Schema ---
  ipcMain.handle(IpcChannels.PRINTER_GET_CONFIG_SCHEMA, (_, { brand, model }) => {
    const driver = printerManagerService.getPrinterDriver(brand)
    if (!driver) throw new Error(`Unsupported printer brand: ${brand}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tempInstance = new (driver as any)({})
    return tempInstance.buildConfigSchema(model)
  })

  // --- Printer CRUD ---
  ipcMain.handle(IpcChannels.PRINTER_ADD, async (_, config) => {
    // 1. Store the secret
    const secretId = await secretsService.setSecret(config.accessCode)
    delete config.accessCode // Remove plain text password
    // Persist secret reference in both the root column and inside connectionConfig
    // so brand drivers can access it uniformly from connectionConfig.
    config.accessCodeSecretId = secretId
    config.connectionConfig = {
      ...(config.connectionConfig || {}),
      accessCodeSecretId: secretId
    }

    // 2. Save to DB
    const newPrinter = await databaseService.addPrinter(config)

    if (await printerManagerService.isPrinterHandledByESP(newPrinter.id)) {
      try {
        await databaseService.updatePrinter(newPrinter.id, { status: 'online' } as any)
      } catch {}
      try {
        win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
      } catch {}
      return newPrinter
    }

    // 3. Initialize and connect
    const printerInstance = printerManagerService.initializePrinter(newPrinter)
    try {
      await printerInstance.connect(newPrinter)
      // Mark online on successful connect
      try {
        await databaseService.updatePrinter(newPrinter.id, { status: 'online' } as any)
      } catch (e) {
        console.warn(`[IPC] Failed to update printer status to online for ${newPrinter.id}:`, e)
      }
    } catch (e) {
      console.warn(`[IPC] Failed to connect newly added printer ${newPrinter.id}:`, e)
      try {
        await databaseService.updatePrinter(newPrinter.id, { status: 'offline' } as any)
      } catch {}
    }

    try {
      win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
    } catch {}

    return newPrinter
  })

  ipcMain.handle(IpcChannels.PRINTER_GET_ALL, async () => {
    return await databaseService.getAllPrinters()
  })

  ipcMain.handle(IpcChannels.PRINTER_GET_BRANDS_AND_MODELS, () => {
    return printerManagerService.getPrinterInfo()
  })

  ipcMain.handle(IpcChannels.PRINTER_GET, async (_, id: string) => {
    return await databaseService.getPrinter(id)
  })

  // Connect all configured printers (idempotent) and return updated configs
  ipcMain.handle(IpcChannels.PRINTER_CONNECT_ALL, async () => {
    const printers = await databaseService.getAllPrinters()
    for (const p of printers) {
      if (await printerManagerService.isPrinterHandledByESP(p.id)) {
        try {
          await databaseService.updatePrinter(p.id, { status: 'online' } as any)
        } catch {
          // Ignore DB update errors
        }
        continue
      }
      let instance = printerManagerService.getPrinterById(p.id)
      if (!instance) {
        instance = printerManagerService.initializePrinter(p)
      }
      try {
        await instance.connect(p)
        try {
          await databaseService.updatePrinter(p.id, { status: 'online' } as any)
        } catch {
          // Ignore DB update errors
        }
      } catch (err) {
        try {
          await databaseService.updatePrinter(p.id, { status: 'offline' } as any)
        } catch {
          // Ignore DB update errors
        }
      }
    }
    try {
      win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
    } catch {}
    return await databaseService.getAllPrinters()
  })

  // Connect a single printer by id and return updated config
  ipcMain.handle(IpcChannels.PRINTER_CONNECT, async (_event, id: string) => {
    const cfg = await databaseService.getPrinter(id)
    if (!cfg) throw new Error(`Printer ${id} not found`)
    if (await printerManagerService.isPrinterHandledByESP(id)) {
      try {
        await databaseService.updatePrinter(id, { status: 'online' } as any)
      } catch {}
      try {
        win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
      } catch {}
      return await databaseService.getPrinter(id)
    }
    let instance = printerManagerService.getPrinterById(id)
    if (!instance) instance = printerManagerService.initializePrinter(cfg)
    try {
      await instance.connect(cfg)
      try {
        await databaseService.updatePrinter(id, { status: 'online' } as any)
      } catch {}
    } catch (err) {
      try {
        await databaseService.updatePrinter(id, { status: 'offline' } as any)
      } catch {}
      throw err
    }
    try {
      win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
    } catch {}
    return await databaseService.getPrinter(id)
  })

  // Lightweight telemetry fetch for renderer-side safety/UX checks
  ipcMain.handle(IpcChannels.PRINTER_GET_TELEMETRY, async (_event, id: string) => {
    const printer = printerManagerService.getPrinterById(id) as any
    if (!printer || typeof printer.getLastTelemetry !== 'function') return null
    try {
      return printer.getLastTelemetry()
    } catch {
      return null
    }
  })

  ipcMain.handle(
    IpcChannels.PRINTER_UPDATE,
    async (_, id: string, updates: Partial<PrinterConfig>) => {
      const existing = await databaseService.getPrinter(id)
      if (!existing) throw new Error(`Printer ${id} not found`)

      if ((updates as any).accessCode) {
        if (existing.connectionConfig.accessCodeSecretId) {
          try {
            await secretsService.deleteSecret(existing.connectionConfig.accessCodeSecretId)
          } catch (error) {
            console.error(`Failed to delete secret for printer ${id}:`, error)
          }
        }
        const newSecretId = await secretsService.setSecret((updates as any).accessCode)
        ;(updates as any).connectionConfig.accessCodeSecretId = newSecretId
        delete (updates as any).accessCode
      }

      await databaseService.updatePrinter(id, updates as any)
      const updated = await databaseService.getPrinter(id)

      if (updated) {
        await printerManagerService.removePrinter(id)
        if (await printerManagerService.isPrinterHandledByESP(id)) {
          try {
            await databaseService.updatePrinter(id, { status: 'online' } as any)
          } catch {}
          try {
            win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
          } catch {}
          return updated
        }
        const instance = printerManagerService.initializePrinter(updated)
        try {
          await instance.connect(updated)
          try {
            await databaseService.updatePrinter(id, { status: 'online' } as any)
          } catch {}
        } catch (e) {
          console.warn(`[IPC] Failed to reconnect printer ${id} after update:`, e)
          try {
            await databaseService.updatePrinter(id, { status: 'offline' } as any)
          } catch {}
        }
        try {
          win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
        } catch {}
      }

      return updated
    }
  )

  ipcMain.handle(IpcChannels.PRINTER_REMOVE, async (_, id: string) => {
    // Get the printer config first to get the secretId
    const printer = await databaseService.getPrinter(id)

    if (printer) {
      // Disconnect if active
      await printerManagerService.removePrinter(id)

      // Delete the secret from the keychain
      if (printer.connectionConfig.accessCodeSecretId) {
        try {
          await secretsService.deleteSecret(printer.connectionConfig.accessCodeSecretId)
        } catch (error) {
          console.error(`Failed to delete secret for printer ${id}:`, error)
          // We won't block deletion if the secret fails to delete, but we'll log it.
        }
      }
    }

    // Finally, remove from the database
    const res = await databaseService.deletePrinter(id)
    try {
      win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
    } catch {}
    return res
  })

  ipcMain.handle(
    IpcChannels.PRINTER_COMMAND,
    async (_event, id: string, command: PrinterCommand) => {
      let printer = printerManagerService.getPrinterById(id)
      if (!printer) {
        // Attempt to initialize and connect on-demand
        const cfg = await databaseService.getPrinter(id)
        if (!cfg) throw new Error(`Printer ${id} not found`)
        const instance = printerManagerService.initializePrinter(cfg)
        try {
          await instance.connect(cfg)
          try {
            await databaseService.updatePrinter(id, { status: 'online' } as any)
          } catch {}
        } catch (e) {
          throw new Error(`Printer ${id} not initialized`)
        }
        printer = instance
      }
      await printer.executeCommand(command)
      return true
    }
  )

  // --- ESP Discovery ---
  let espEventListeners: { found?: (...args: any[]) => void; lost?: (...args: any[]) => void } = {}
  let isESPDiscoveryActive = false

  // Auto-stop timer for discovery
  let espDiscoveryAutoStop: NodeJS.Timeout | null = null

  const stopESPDiscoveryInternal = () => {
    if (!isESPDiscoveryActive) return
    isESPDiscoveryActive = false

    ESPDiscoveryManager.stopDiscovery()

    // Clean up event listeners
    const eventEmitter = ESPDiscoveryManager.getEventEmitter()

    if (espEventListeners.found) {
      eventEmitter.off('esp-found', espEventListeners.found)
    }
    if (espEventListeners.lost) {
      eventEmitter.off('esp-lost', espEventListeners.lost)
    }
    espEventListeners = {}

    if (espDiscoveryAutoStop) {
      clearTimeout(espDiscoveryAutoStop)
      espDiscoveryAutoStop = null
    }
  }

  ipcMain.handle(IpcChannels.ESP_DISCOVERY_START, () => {
    if (isESPDiscoveryActive) return
    isESPDiscoveryActive = true

    ESPDiscoveryManager.startDiscovery()

    // Set up event forwarding to renderer
    const eventEmitter = ESPDiscoveryManager.getEventEmitter()

    const forwardESPFound = (esp: any) => win.webContents.send(IpcChannels.ESP_FOUND, esp)
    const forwardESPLost = (esp: any) => win.webContents.send(IpcChannels.ESP_LOST, esp)

    eventEmitter.on('esp-found', forwardESPFound)
    eventEmitter.on('esp-lost', forwardESPLost)

    // Store references for cleanup
    espEventListeners = { found: forwardESPFound, lost: forwardESPLost }

    // Auto-stop after 60 seconds by default
    if (espDiscoveryAutoStop) {
      clearTimeout(espDiscoveryAutoStop)
    }
    espDiscoveryAutoStop = setTimeout(() => {
      if (isESPDiscoveryActive) {
        stopESPDiscoveryInternal()
      }
    }, 60000)
  })

  ipcMain.handle(IpcChannels.ESP_DISCOVERY_STOP, () => {
    stopESPDiscoveryInternal()
  })

  // --- ESP CRUD Operations ---
  ipcMain.handle(IpcChannels.ESP_GET_ALL, async () => {
    return await databaseService.getAllESPs()
  })

  ipcMain.handle(IpcChannels.ESP_GET, async (_, id: string) => {
    return await databaseService.getESP(id)
  })

  ipcMain.handle(IpcChannels.ESP_GET_BY_IP, async (_, ip: string) => {
    if (!ip) return null
    return (await databaseService.getESPByIP(ip)) || null
  })

  ipcMain.handle(IpcChannels.ESP_ADD, async (_, espData) => {
    const espConfig = {
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...espData
    }
    const added = await databaseService.addESP(espConfig)
    try {
      win.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
    } catch {}
    return added
  })

  ipcMain.handle(IpcChannels.ESP_UPDATE, async (_, id: string, updates) => {
    await databaseService.updateESP(id, updates)
    try {
      win.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
    } catch {}
    return await databaseService.getESP(id)
  })

  ipcMain.handle(IpcChannels.ESP_REMOVE, async (_, id: string) => {
    const res = await databaseService.deleteESP(id)
    try {
      win.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
    } catch {}
    return res
  })

  // --- ESP Provisioning ---
  ipcMain.handle(IpcChannels.ESP_PROVISION, async (_, { espDevice, config, assignedPrinter }) => {
    try {
      const result = await ESPOrchestrator.provision(win, espDevice, config, assignedPrinter)
      if (result?.success) {
        try {
          win.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
        } catch {}
      }
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // --- Firmware Hosting ---
  ipcMain.handle(
    IpcChannels.FIRMWARE_GET_FOR_PRINTER,
    async (_event, brand: string, peerIP?: string) => {
      try {
        console.log(`[IPC] FIRMWARE_GET_FOR_PRINTER brand=${brand} peerIP=${peerIP || 'n/a'}`)
        const res = await FirmwareManager.getDownloadForBrand(brand, { peerIP })
        if (res.success) {
          console.log(
            `[IPC] Firmware ready for '${brand}':`,
            res.firmware.fileName,
            res.downloadUrl
          )
        } else {
          console.warn(`[IPC] Firmware not found for '${brand}':`, res.error)
        }
        if (!res.success) return res
        return res
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to prepare firmware download'
        }
      }
    }
  )

  ipcMain.handle(IpcChannels.ESP_CHECK_REACHABLE, async (_, espDevice) => {
    return await ESPProvisioningService.pingESP(espDevice)
  })

  ipcMain.handle(IpcChannels.ESP_GET_STATUS, async (_, espDevice) => {
    try {
      return await ESPProvisioningService.getESPStatus(espDevice)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get ESP status')
    }
  })

  ipcMain.handle(
    IpcChannels.ESP_IDENTIFY,
    async (
      _,
      arg:
        | string
        | { ip: string; action?: 'start' | 'stop' | 'off' | 'on' | '0' | '1'; durationMs?: number }
    ) => {
      const ip = typeof arg === 'string' ? arg : arg?.ip
      const action = typeof arg === 'string' ? undefined : arg?.action
      const durationMs = typeof arg === 'string' ? undefined : arg?.durationMs
      if (!ip) return false
      return await ESPProvisioningService.identifyByIP(ip, { action, durationMs })
    }
  )

  ipcMain.handle(IpcChannels.ESP_ASSIGN_TO_PRINTER, async (_, { espId, printerId }) => {
    const res = await ESPOrchestrator.assignToPrinter(win, espId, printerId)
    try {
      win.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
    } catch {}
    return res
  })

  ipcMain.handle(IpcChannels.ESP_UNASSIGN, async (_, espId: string) => {
     // Fetch current ESP to capture assigned printer before unassigning
    const espBefore = await databaseService.getESP(espId)
    await databaseService.unassignESP(espId)

    // Reconnect the printer that was previously assigned to this ESP
    const printerId = espBefore?.assignedPrinterId
    if (printerId) {
      const cfg = await databaseService.getPrinter(printerId)
      if (cfg) {
        let instance = printerManagerService.getPrinterById(printerId)
        if (!instance) instance = printerManagerService.initializePrinter(cfg)
        try {
          await instance.connect(cfg)
          try {
            await databaseService.updatePrinter(printerId, { status: 'online' } as any)
          } catch {}
        } catch {
          try {
            await databaseService.updatePrinter(printerId, { status: 'offline' } as any)
          } catch {}
        }
        try {
          win.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
        } catch {}
      }
    }

    try {
      win.webContents.send(IpcChannels.ESP_CONFIGS_CHANGED)
    } catch {}
    return await databaseService.getESP(espId)
  })

  // --- Window Handlers ---
  ipcMain.handle('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle('window-is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isMaximized()
  })

  ipcMain.handle('set-window-title', (event, title: string) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    if (win) {
      win.setTitle(`${title} - Regain3D`)
    }
  })
}
