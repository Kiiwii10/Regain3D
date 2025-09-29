import {
  DiscoveredPrinter,
  PrinterConfig,
  PrinterConfigSchema,
  ValidationPayload,
  PrinterCommand
} from '@shared/types/printer'

import { DiscoveredESP, ESPConfig } from '@shared/types/esp'

import {
  GCodeAnalysisResult,
  GCodeProcessingReport,
  GCodeProfile,
  GCodeValidationResult,
  GCodeProcessOptions,
  GCodeBatchOptions,
  CliModeData,
  GCodeBatchResult
} from '@shared/types/gcode'

export interface ElectronAPI {
  // Window
  setWindowTitle: (title: string) => Promise<void>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  // Discovery
  startDiscovery: () => Promise<void>
  stopDiscovery: () => Promise<void>
  onDeviceFound: (callback: (printer: DiscoveredPrinter) => void) => () => void
  onDeviceLost: (callback: (printer: DiscoveredPrinter) => void) => () => void
  removeAllListeners: (channel: string) => void
  // Printer Management
  validatePrinter: (payload: ValidationPayload) => Promise<PrinterConfig>
  checkPrinterName: (name: string) => Promise<boolean>
  getPrinterConfigSchema: (args: { brand: string; model: string }) => Promise<PrinterConfigSchema>
  addPrinter: (config: PrinterConfig) => Promise<PrinterConfig>
  getAllPrinters: () => Promise<PrinterConfig[]>
  connectAllPrinters?: () => Promise<PrinterConfig[]>
  connectPrinter?: (id: string) => Promise<PrinterConfig>
  getPrinterTelemetry: (id: string) => Promise<import('./printer').PrinterTelemetry | null>
  removePrinter: (id: string) => Promise<number>
  sendPrinterCommand: (id: string, command: PrinterCommand) => Promise<boolean>
  onPrinterConfigsChanged?: (callback: () => void) => () => void

  // ESP Management
  startESPDiscovery: () => Promise<void>
  stopESPDiscovery: () => Promise<void>
  onESPFound: (callback: (esp: DiscoveredESP) => void) => () => void
  onESPLost: (callback: (esp: DiscoveredESP) => void) => () => void
  getAllESPs: () => Promise<ESPConfig[]>
  getESP: (id: string) => Promise<ESPConfig | null>
  getESPByIP: (ip: string) => Promise<ESPConfig | null>
  addESP: (espData: Partial<ESPConfig>) => Promise<ESPConfig>
  updateESP: (id: string, updates: Partial<ESPConfig>) => Promise<ESPConfig>
  removeESP: (id: string) => Promise<boolean>
  provisionESP: (payload: {
    espDevice: DiscoveredESP
    config: any
    assignedPrinter?: PrinterConfig
  }) => Promise<{ success: boolean; error?: string }>
  checkESPReachable: (espDevice: DiscoveredESP) => Promise<boolean>
  getESPStatus: (espDevice: DiscoveredESP) => Promise<any>
  identifyESP: (
    arg:
      | string
      | { ip: string; action?: 'start' | 'stop' | 'off' | 'on' | '0' | '1'; durationMs?: number }
  ) => Promise<boolean>
  assignESPToPrinter: (payload: { espId: string; printerId: string }) => Promise<ESPConfig>
  unassignESP: (espId: string) => Promise<ESPConfig>
  onESPAssignProgress: (
    callback: (payload: {
      espId: string
      printerId: string
      step: string
      message?: string
    }) => void
  ) => () => void
  onESPAssignResult: (
    callback: (payload: {
      espId: string
      printerId: string
      success: boolean
      error?: string
      noop?: boolean
      message?: string
    }) => void
  ) => () => void
  onESPConfigsChanged?: (callback: () => void) => () => void
  onESPStatusUpdate?: (
    callback: (payload: {
      espId: string | null
      deviceId: string | null
      ip: string | null
      update: {
        status: string | null
        lastSeenAt: Date | string | null
        lastPrinterState: string | null
        lastPrinterProgress: number | null
        assignedPrinterId: string | null
        version: string | null
      }
      payload: Record<string, unknown>
    }) => void
  ) => () => void

  // Firmware delivery
  getFirmwareForPrinter: (
    brand: string,
    peerIP?: string
  ) => Promise<{
    success: boolean
    error?: string
    downloadUrl?: string
    firmware?: { filePath: string; fileName: string; md5Hash: string; fileSize: number }
  }>

  // G-code Processing
  analyzeGCode: (
    filePath: string
  ) => Promise<{ success: boolean; data?: GCodeAnalysisResult; error?: string }>
  processGCodeFile: (
    filePath: string,
    options?: GCodeProcessOptions
  ) => Promise<{ success: boolean; data?: GCodeProcessingReport; error?: string }>
  processGCodeString: (
    gcode: string,
    options?: GCodeProcessOptions
  ) => Promise<{ success: boolean; data?: any; error?: string }>
  getGCodeProfiles: () => Promise<{ success: boolean; data?: GCodeProfile[]; error?: string }>
  validateGCode: (
    filePath: string
  ) => Promise<{ success: boolean; data?: GCodeValidationResult; error?: string }>
  batchProcessGCode: (
    directory: string,
    options?: GCodeBatchOptions
  ) => Promise<{ success: boolean; data?: GCodeBatchResult; error?: string }>

  // Shell Operations
  showItemInFolder: (fullPath: string) => void
  openExternal: (url: string) => void

  // CLI Mode
  onCliModeInit: (callback: (data: CliModeData) => void) => () => void
  notifyCliProcessingComplete: (success: boolean) => void
  notifyCliProcessingCancelled: () => void

  // Generic invoke for other IPC calls
  invoke: (channel: string, ...args: any[]) => Promise<any>
}
