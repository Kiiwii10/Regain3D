// electron/gcode/types/filament.types.ts

export interface FilamentInfo {
  id: string
  type: FilamentType
  brand?: string
  color?: string
  temperature: {
    printing: number
    bed: number
    chamber?: number
  }
  diameter: number
  density: number // g/cm³
  slot?: number // AMS slot number
}

export enum FilamentType {
  PLA = 'PLA',
  PETG = 'PETG',
  ABS = 'ABS',
  TPU = 'TPU',
  NYLON = 'NYLON',
  PVA = 'PVA',
  PC = 'PC',
  ASA = 'ASA',
  SUPPORT = 'SUPPORT',
  UNKNOWN = 'UNKNOWN'
}

export interface PurgeCalculation {
  // Input values
  totalPurgeVolume: number // mm³ from original G-code
  meltZoneVolume: number // mm³ from printer profile
  safetyFactor: number // 0.85-0.95
  filamentDiameter: number // mm

  // Calculated volumes
  purePurgeVolume: number // mm³
  mixedPurgeVolume: number // mm³

  // Converted to filament length
  purePurgeLength: number // mm
  mixedPurgeLength: number // mm

  // Metadata
  fromFilament?: FilamentInfo
  toFilament?: FilamentInfo
  changeIndex: number
  layerNumber?: number
}

export interface FilamentChange {
  index: number
  fromTool: number
  toTool: number
  fromFilament?: FilamentInfo
  toFilament?: FilamentInfo
  originalPurgeLength: number // mm
  calculation?: PurgeCalculation
  startLine: number
  endLine: number
  position: { x: number; y: number; z: number }
}

export interface WasteEstimate {
  totalChanges: number
  pureWaste: Map<FilamentType, number> // g per type
  mixedWaste: number // g total
  originalWaste: number // g without optimization
  savingsPercent: number
}
