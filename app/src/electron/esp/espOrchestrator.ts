import { BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/constants/ipc'
import { PrinterConfig } from '@shared/types/printer'
import { DiscoveredESP, ApplicationConfig, ESPProvisioningResponse } from '@shared/types/esp'
import { databaseService } from '@electron/database/database'
import { FirmwareManager } from '@electron/firmware/firmwareManager'
import { printerManagerService } from '@electron/printer/printerManager'
import { FirmwareServer } from '@electron/firmware/FirmwareServer'
import { ESPProvisioningService } from '@electron/esp/espProvisioning'
import { secretsService } from '@electron/secrets.service'
import { randomUUID, randomBytes } from 'crypto'
import { ESPDeviceStatus, FinalProvisioningConfig } from './types/esp.types'
import { PrinterConnectionData } from '@shared/types/printer'

function generateUpdateCredentials(): string {
  const username = randomBytes(6).toString('hex')
  const password = randomBytes(18).toString('hex')
  return `${username}:${password}`
}

export class ESPOrchestrator {
  static async buildConnectionMetadata(printer: PrinterConfig): Promise<PrinterConnectionData> {
    let meta: PrinterConnectionData = {}
    if (typeof printer.connectionConfig === 'string') {
      try {
        meta = JSON.parse(printer.connectionConfig)
      } catch {
        // leave as-is if parsing fails
      }
    } else if (typeof printer.connectionConfig === 'object' && printer.connectionConfig !== null) {
      meta = { ...printer.connectionConfig } as PrinterConnectionData
    }

    if (meta && meta.accessCodeSecretId) {
      try {
        const secret = await secretsService.getSecret(meta.accessCodeSecretId)
        if (secret) {
          meta.accessCode = secret
        } else {
          console.warn(
            '[ESPOrchestrator] No secret found for accessCodeSecretId on printer',
            printer.id
          )
        }
      } catch {
        console.warn('[ESPOrchestrator] Failed to resolve access code for printer', printer.id)
      }
      // Never forward secret references to firmware
      delete meta.accessCodeSecretId
    }
    return meta
  }

  static async provision(
    _win: BrowserWindow,
    espDevice: DiscoveredESP,
    config: ApplicationConfig,
    assignedPrinter?: PrinterConfig
  ): Promise<ESPProvisioningResponse> {
    await FirmwareServer.getInstance().ensureStarted()
    const baseUrl = FirmwareServer.getInstance().getBaseUrl(espDevice?.ip)

    const updateToken = generateUpdateCredentials()

    const finalConfig: FinalProvisioningConfig = {
      ...config,
      apiEndpoint: baseUrl,
      updateToken
    }
    if (assignedPrinter) {
      finalConfig.printerId = assignedPrinter.id
      finalConfig.printerName = assignedPrinter.name
      finalConfig.printerModel = assignedPrinter.model
      finalConfig.printerConnection = await this.buildConnectionMetadata(assignedPrinter)
    }

    const result = await ESPProvisioningService.provisionESP(
      espDevice,
      finalConfig as ApplicationConfig
    )

    if (result.success) {
      const existing = await databaseService.getESPByIP(espDevice.ip)
      if (existing) {
        await databaseService.updateESP(existing.id, {
          isProvisioned: true,
          assignedPrinterId: assignedPrinter?.id ?? existing.assignedPrinterId,
          lastFirmwareUpdateAt: new Date(),
          firmwareMd5: finalConfig.firmwareMD5,
          hostname: espDevice.hostname,
          name: espDevice.name,
          updateToken
        })
      } else {
        await databaseService.addESP({
          id: randomUUID(),
          name: espDevice.name,
          ip: espDevice.ip,
          port: espDevice.port,
          hostname: espDevice.hostname,
          mac: espDevice.mac,
          version: espDevice.version,
          chipId: espDevice.chipId,
          isProvisioned: true,
          assignedPrinterId: assignedPrinter?.id,
          lastFirmwareUpdateAt: new Date(),
          firmwareMd5: finalConfig.firmwareMD5,
          updateToken,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    return result
  }

  static async assignToPrinter(
    win: BrowserWindow,
    espId: string,
    printerId: string
  ): Promise<DiscoveredESP | undefined> {
    // Ensure any other ESPs assigned to this printer are unassigned first
    if (await databaseService.hasAssignedESP(printerId)) {
      const existing = await databaseService.getESPsByPrinter(printerId)
      for (const esp of existing) {
        if (esp.id !== espId) {
          await databaseService.unassignESP(esp.id)
        }
      }
    }

    // Persist assignment in DB
    await databaseService.assignESPToPrinter(espId, printerId)

    const esp = await databaseService.getESP(espId)
    const printer = await databaseService.getPrinter(printerId)
    if (!esp) throw new Error(`ESP ${espId} not found`)
    if (!printer) throw new Error(`Printer ${printerId} not found`)

    win.webContents.send(IpcChannels.ESP_ASSIGN_PROGRESS, {
      espId,
      printerId,
      step: 'start',
      message: 'Assigning ESP to printer'
    })

    const fw = await FirmwareManager.getDownloadForBrand(String(printer.brand), { peerIP: esp.ip })
    const updateToken = generateUpdateCredentials()

    // Determine if provision is required
    let needsProvision = true
    try {
      win.webContents.send(IpcChannels.ESP_ASSIGN_PROGRESS, {
        espId,
        printerId,
        step: 'check-status',
        message: 'Checking ESP current firmware'
      })
      const status: ESPDeviceStatus = await ESPProvisioningService.getESPStatus({
        ip: esp.ip,
        hostname: esp.hostname,
        name: esp.name,
        isProvisioned: esp.isProvisioned
      } as DiscoveredESP)
      const currentType =
        status?.printer_type ||
        status?.printerType ||
        status?.assignedPrinter ||
        status?.app?.printer_type ||
        status?.application_config?.printer_type
      const brandMatches =
        currentType &&
        typeof currentType === 'string' &&
        currentType.toLowerCase() === String(printer.brand).toLowerCase()

      // If brand matches, still check firmware MD5 against DB target
      const md5Matches = esp.firmwareMd5 && fw.success && esp.firmwareMd5 === fw.firmware.md5Hash

      needsProvision = !(brandMatches && md5Matches)
    } catch {
      needsProvision = true
    }

    if (!fw.success) {
      win.webContents.send(IpcChannels.ESP_ASSIGN_RESULT, {
        espId,
        printerId,
        success: false,
        error: fw.error || 'Firmware download failed'
      })
      return await databaseService.getESP(espId)
    }
    await FirmwareServer.getInstance().ensureStarted()
    const baseUrl = FirmwareServer.getInstance().getBaseUrl(esp.ip)
    win.webContents.send(IpcChannels.ESP_ASSIGN_PROGRESS, {
      espId,
      printerId,
      step: needsProvision ? 'provision' : 'assign',
      message: needsProvision
        ? 'Provisioning ESP with matching firmware'
        : 'Configuring ESP for printer'
    })

    // Prepare metadata and resolve brand-specific secrets (e.g., bambu access code)
    // Build sanitized, brand-specific connection metadata
    const connMeta = await this.buildConnectionMetadata(printer)

    const finalConfig: FinalProvisioningConfig = {
      firmwareUrl: fw.downloadUrl,
      firmwareMD5: fw.firmware.md5Hash,
      firmwareSize: fw.firmware.fileSize,
      apiEndpoint: baseUrl,
      updateToken,
      PrinterBrand: printer.brand,
      printerId: printer.id,
      printerName: printer.name,
      printerModel: printer.model,
      printerConnection: connMeta
    }

    const result = await ESPProvisioningService.provisionESP(
      {
        ip: esp.ip,
        hostname: esp.hostname,
        name: esp.name,
        isProvisioned: esp.isProvisioned
      } as DiscoveredESP,
      finalConfig
    )

    if (result.success) {
      // Update DB to reflect new firmware assignment when provisioning occurred
      if (needsProvision) {
        await databaseService.updateESP(espId, {
          isProvisioned: true,
          firmwareMd5: fw.firmware.md5Hash,
          firmwareFileName: fw.firmware.fileName,
          lastFirmwareUpdateAt: new Date(),
          updateToken
        })
      }
      if (!needsProvision) {
        await databaseService.updateESP(espId, { updateToken })
      }

      // Disconnect any active direct printer session so the ESP can take over
      try {
        await printerManagerService.removePrinter(printerId)
      } catch (err) {
        console.warn('[ESPOrchestrator] Failed to remove printer after ESP assignment', err)
      }

      // Update printer status based on the latest ESP-reported state
      try {
        const statusDoc: ESPDeviceStatus = await ESPProvisioningService.getESPStatus({
          ip: esp.ip,
          hostname: esp.hostname,
          name: esp.name,
          isProvisioned: true
        } as DiscoveredESP)

        const docDeviceId = (statusDoc as any)?.device_id || (statusDoc as any)?.chip_id
        if (docDeviceId && docDeviceId !== esp.deviceId) {
          try {
            await databaseService.updateESP(espId, { deviceId: docDeviceId })
          } catch (err) {
            console.warn('[ESPOrchestrator] Failed to persist deviceId from status doc', err)
          }
        }

        let printerStatus: string | undefined
        if (typeof statusDoc?.status === 'string' && statusDoc.status.trim()) {
          printerStatus = statusDoc.status
        } else if (typeof statusDoc?.state === 'string' && statusDoc.state.trim()) {
          printerStatus = statusDoc.state
        } else if (typeof statusDoc?.connected === 'boolean') {
          printerStatus = statusDoc.connected ? 'online' : 'offline'
        }

        if (printerStatus) {
          await databaseService.updatePrinter(printerId, { status: printerStatus })
        }
      } catch (err) {
        console.warn('[ESPOrchestrator] Failed to update printer status from ESP', err)
      }

      win.webContents.send(IpcChannels.ESP_ASSIGN_RESULT, {
        espId,
        printerId,
        success: true,
        message: result.message,
        noop: !needsProvision
      })

      return await databaseService.getESP(espId)
    } else {
      win.webContents.send(IpcChannels.ESP_ASSIGN_RESULT, {
        espId,
        printerId,
        success: false,
        error: result.error || 'Provisioning failed'
      })
      return await databaseService.getESP(espId)
    }
  }
}
