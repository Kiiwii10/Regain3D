import { DiscoveredPrinter } from '@shared/types/printer'
import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'
import { printerManagerService } from '@electron/printer/printerManager'

class DiscoveryManagerService extends EventEmitter {
  private win: BrowserWindow | null = null

  constructor() {
    super()
  }

  start(win: BrowserWindow): void {
    this.win = win
    const drivers = printerManagerService.getAllPrinterDrivers()

    // Each driver will be responsible for emitting 'found' and 'lost' events.
    // We listen to those events and forward them to the renderer process.
    this.on('found', (printer: DiscoveredPrinter) => {
      this.win?.webContents.send('device:found', printer)
    })

    this.on('lost', (printer: DiscoveredPrinter) => {
      this.win?.webContents.send('device:lost', printer)
    })

    for (const driver of Object.values(drivers)) {
      if (typeof driver.startDiscovery === 'function') {
        driver.startDiscovery(this) // Pass our event emitter to the driver
      }
    }
  }

  stop(): void {
    const drivers = printerManagerService.getAllPrinterDrivers()
    for (const driver of Object.values(drivers)) {
      if (typeof driver.stopDiscovery === 'function') {
        driver.stopDiscovery()
      }
    }
    this.removeAllListeners()
    this.win = null
  }
}

export const discoveryManagerService = new DiscoveryManagerService()
