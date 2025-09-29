import { PrinterBrand, PrinterConnectionData } from './printer'

export interface DiscoveredESP {
  ip: string
  port: number
  hostname: string
  name: string
  mac?: string
  version?: string
  chipId?: string
  isProvisioned: boolean
  // Discovery metadata
  discoveryMethod?: 'mDNS' | 'network-scan'
  // mDNS service-specific data
  txt?: Record<string, string | undefined>
  type?: string
  protocol?: string
}

export interface ESPConfig {
  id: string // Internal UUID
  name: string // User-defined name
  ip: string
  port: number
  hostname: string
  mac?: string
  version?: string
  chipId?: string
  deviceId?: string
  updateToken?: string
  isProvisioned: boolean
  assignedPrinterId?: string | null // Link to printer if assigned
  lastFirmwareUpdateAt?: Date
  firmwareMd5?: string
  firmwareFileName?: string
  status?: string
  lastSeenAt?: Date
  lastPrinterState?: string
  lastPrinterProgress?: number
  lastPayload?: Record<string, unknown> | null
  createdAt?: Date
  updatedAt?: Date
}

export interface ApplicationConfig {
  firmwareUrl: string
  firmwareMD5: string
  firmwareSize: number
  apiEndpoint: string
  updateToken?: string
  PrinterBrand: PrinterBrand
  // Optional printer metadata for on-device integration
  printerId?: string
  printerName?: string
  printerModel?: string
  printerConnection?: PrinterConnectionData
}

export interface ProvisioningPayload {
  firmware_url: string
  firmware_md5: string
  firmware_size: number
  api_endpoint: string
  update_token?: string
  // Preferred by device firmware
  printer_type?: string
  // Backward compatibility if device expects brand field name
  printer_brand?: string
  printer_model: string
  printer_id?: string
  printer_name?: string
  // Brand-specific, sanitized connection data for firmware consumption.
  // Never include secret references like secret IDs here; resolve them in the desktop app
  // and include only non-sensitive, necessary values (e.g., a transient accessCode if required).
  printer_connection_data?: PrinterConnectionData
}

export interface ESPProvisioningResponse {
  success: boolean
  message?: string
  error?: string
}

export interface ESPStatus {
  online: boolean
  lastSeen?: Date
  firmwareVersion?: string
  assignedPrinter?: string
}
