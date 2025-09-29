import { BasePrinter as IBasePrinter } from '@electron/printer/core/BasePrinter.interface'
import {
  PrinterConfig,
  PrinterConnection,
  PrinterConfigSchema,
  ValidatedConfig,
  ValidationPayload,
  PrinterCommand,
  PrinterTelemetry
} from '@shared/types/printer'
import { EventEmitter } from 'events'

export abstract class BasePrinter implements IBasePrinter {
  abstract brand: string
  abstract models: string[]

  constructor(protected config: PrinterConfig) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static startDiscovery(_eventEmitter: EventEmitter): void {
    // This method should be implemented by subclasses to start continuous discovery
    // It should emit 'found' and 'lost' events on the provided eventEmitter
  }

  static stopDiscovery(): void {
    // This method should be implemented by subclasses to stop continuous discovery
  }

  abstract validate(payload: ValidationPayload): Promise<ValidatedConfig>
  abstract connect(validated: ValidatedConfig): Promise<PrinterConnection>
  abstract buildConfigSchema(model: string): PrinterConfigSchema
  abstract disconnect(): Promise<void>
  abstract executeCommand(command: PrinterCommand): Promise<void>
  // Optional, for drivers that report telemetry
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLastTelemetry?(): PrinterTelemetry | null
}
