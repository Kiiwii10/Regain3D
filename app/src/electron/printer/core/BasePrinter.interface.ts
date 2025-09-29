import {
  DiscoveredPrinter,
  PrinterConfig,
  PrinterConnection,
  ValidatedConfig,
  PrinterConfigSchema,
  ValidationPayload,
  PrinterCommand
} from '@shared/types/printer'

export interface BasePrinter {
  brand: string
  models: string[]
  validate(payload: ValidationPayload): Promise<ValidatedConfig>
  connect(validated: ValidatedConfig): Promise<PrinterConnection>
  buildConfigSchema(model: string): PrinterConfigSchema
  disconnect(): Promise<void>
  executeCommand(command: PrinterCommand): Promise<void>
  getLastTelemetry?: () => PrinterTelemetry | null
}

export interface BasePrinterClass {
  new (config: PrinterConfig): BasePrinter
  discover(): Promise<DiscoveredPrinter[]>
}
