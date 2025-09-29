// electron/gcode/types/profile.types.ts

export interface PrinterProfile {
  id: string
  name: string
  manufacturer: string
  model: string
  version: string

  detection: ProfileDetection
  hardware: HardwareSpecs
  changeSequence: ChangeSequenceConfig
  injection: InjectionConfig
  calculations: CalculationConfig
  gcode?: Record<string, string>
}

export interface ProfileDetection {
  headerPatterns: string[]
  commandSignatures: string[]
  priority: number
}

export interface HardwareSpecs {
  nozzleDiameters: number[] // mm
  nozzleLength?: number // mm, for advanced purge calculation
  cutterPosition?: { x: number; y: number; z: number } // for advanced purge calculation
  filamentDiameter: number // mm
  meltZoneVolume: number // mm³
  maxFlowRate: number // mm³/s
  hasCutter: boolean
  hasAMS: boolean
}

export interface ChangeSequenceConfig {
  startTriggers: string[] // Commands that start a change
  endMarkers: string[] // Commands that end a change
  purgePatterns: RegExp[] // Patterns to identify purge commands
  cutterCommands?: string[] // Commands for filament cutting
  preserveCommands: string[] // Commands to keep unchanged
}

export interface InjectionConfig {
  templates: InjectionTemplates
  espProtocol: ESPProtocol
  variables: Record<string, string>
}

export interface InjectionTemplates {
  prePurge: string
  purgeStage1: string
  espPause: string
  purgeStage2: string
  postPurge: string
  cooldown?: string
  wipeSequence?: string
}

export interface ESPProtocol {
  commandFormat: 'M117' | 'M118' | 'M73' | 'custom'
  messages: {
    changeStart: string
    purePurgeStart: string
    purePurgeEnd: string
    mixedPurgeStart: string
    mixedPurgeEnd: string
    changeEnd: string
    valveSwitch: string
  }
}

export interface CalculationConfig {
  safetyFactor: number // 0.85-0.95
  minPurgeLength: number // mm
  maxPurgeLength: number // mm
  usePulsedPurge: boolean
  pulseInterval?: number // mm between pulses
  temperatureAdjustment: boolean
}
