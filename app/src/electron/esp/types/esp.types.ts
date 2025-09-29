import { Service } from 'bonjour-service'

/**
 * Represents the TXT record from a Bonjour/mDNS service.
 * Values are typically strings.
 */
export type MDnsTxtRecord = Record<string, string | undefined>

/**
 * A mock service object used for devices discovered via network scan,
 * to make them compatible with the mDNS discovery logic.
 */
export type MockService = Partial<Service> & {
  name: string
  host: string
  port: number
  addresses: string[]
  type: string
  protocol: string
  txt: MDnsTxtRecord
}

/**
 * A union type for a service, which can be a real Bonjour service
 * or a mock service object.
 */
export type EspService = Service | MockService

// Base type for raw device identification fields from ESP responses
type ESPDeviceIdentification = {
  name?: string
  device_name?: string
  hostname?: string
  chipId?: string
  chip_id?: string
  chipID?: string
  mac?: string
  macAddress?: string
  mac_address?: string
}

// Base type for raw firmware and versioning fields
type ESPDeviceFirmware = {
  version?: string
  firmware?: string
  firmware_version?: string
  firmwareVersion?: string
  firmware_url?: string
  firmwareUrl?: string
  firmware_md5?: string
}

// Base type for raw provisioning and application status fields
type ESPDeviceProvisioningStatus = {
  provisioned?: boolean
  status?: string // e.g., 'provisioned', 'unprovisioned', 'ready'
  assigned?: boolean
  application_assigned?: boolean
  api_endpoint?: string
  apiEndpoint?: string
}

// Base type for raw printer-specific info in app-mode
type ESPDeviceAppModeInfo = {
  printer_type?: string
  printerType?: string
  printer_brand?: string
  printer_id?: string
  printer_name?: string
  printer_model?: string
  printer_state?: string
  assignedPrinter?: string
  app?: {
    printer_type?: string
    state?: string
  }
  application_config?: {
    printer_type?: string
    firmware_version?: string
    state?: string
  }
}

// Base type for raw system metrics
type ESPDeviceSystemMetrics = {
  heap?: number
  uptime?: number
  reset_reason?: string
  wifi?: Record<string, unknown>
  ip?: string
}

// Base type for raw connection state
type ESPDeviceConnectionState = {
  connected?: boolean
  state?: string // e.g., 'online', 'offline'
}

// Base type for raw ecosystem fields
type ESPDeviceEcosystem = {
  ecosystem_token?: string
  device_type?: string // e.g., 'regain3d-controller'
  device?: string // e.g., 'esp32'
}

/**
 * Represents the composite JSON response from an ESP device's status or info endpoint.
 * This combines all raw field types into a single, comprehensive type.
 */
export type ESPDeviceStatus = ESPDeviceIdentification &
  ESPDeviceFirmware &
  ESPDeviceProvisioningStatus &
  ESPDeviceAppModeInfo &
  ESPDeviceSystemMetrics &
  ESPDeviceConnectionState &
  ESPDeviceEcosystem

/**
 * Additional information gathered from an ESP device's endpoints.
 */
export type EnhancedDeviceInfo = {
  name?: string
  mac?: string
  version?: string
  chipId?: string
  isProvisioned: boolean
  additionalInfo: {
    heap?: number
    uptime?: number
    wifi?: Record<string, unknown>
    reported_ip?: string
    reset_reason?: string
  }
}

import { ApplicationConfig } from '@shared/types/esp'
import { PrinterConnectionData } from '@shared/types/printer'

/**
 * The final configuration object sent to an ESP device during provisioning.
 * Extends the shared ApplicationConfig with a mandatory apiEndpoint.
 */
export type FinalProvisioningConfig = ApplicationConfig & {
  apiEndpoint: string
  updateToken: string
  printerConnection?: PrinterConnectionData
}

/**
 * Represents updates to be applied to an ESP record in the database.
 */
export type ESPDatabaseUpdate = {
  version?: string
  isProvisioned?: boolean
  assignedPrinterId?: string
  status?: string
  deviceId?: string
  updateToken?: string
  lastSeenAt?: Date
  lastPrinterState?: string
  lastPrinterProgress?: number
  lastPayload?: Record<string, unknown> | null
}
