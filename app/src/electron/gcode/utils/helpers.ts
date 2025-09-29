// electron/gcode/utils/helpers.ts

import { FilamentType } from '../types/filament.types'

/**
 * Convert filament length to volume
 */
export function filamentLengthToVolume(length: number, diameter: number = 1.75): number {
  const radius = diameter / 2
  return length * Math.PI * radius * radius
}

/**
 * Convert volume to filament length
 */
export function volumeToFilamentLength(volume: number, diameter: number = 1.75): number {
  const radius = diameter / 2
  return volume / (Math.PI * radius * radius)
}

/**
 * Calculate mass from filament length
 */
export function calculateFilamentMass(
  length: number,
  diameter: number = 1.75,
  density: number = 1.24 // g/cm³ for PLA
): number {
  const volume = filamentLengthToVolume(length, diameter) // mm³
  return (volume / 1000) * density // convert to cm³ and multiply by density
}

/**
 * Get filament density by type
 */
export function getFilamentDensity(type: FilamentType): number {
  const densities: Record<FilamentType, number> = {
    [FilamentType.PLA]: 1.24,
    [FilamentType.PETG]: 1.27,
    [FilamentType.ABS]: 1.04,
    [FilamentType.TPU]: 1.21,
    [FilamentType.NYLON]: 1.15,
    [FilamentType.PVA]: 1.23,
    [FilamentType.PC]: 1.2,
    [FilamentType.ASA]: 1.07,
    [FilamentType.SUPPORT]: 1.2,
    [FilamentType.UNKNOWN]: 1.24
  }

  return densities[type] || 1.24
}

/**
 * Parse temperature from G-code command
 */
export function parseTemperature(command: string): number | null {
  const match = command.match(/S(\d+)/)
  return match ? parseInt(match[1]) : null
}

/**
 * Format number with fixed decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * Calculate flow rate from speed and cross-section
 */
export function calculateFlowRate(
  speed: number, // mm/s
  lineWidth: number, // mm
  layerHeight: number // mm
): number {
  return speed * lineWidth * layerHeight // mm³/s
}

/**
 * Estimate hotend melt zone volume based on nozzle size
 */
export function estimateMeltZoneVolume(
  nozzleDiameter: number,
  hotendType: 'standard' | 'volcano' | 'dragon' = 'standard'
): number {
  const baseVolume = {
    standard: 65,
    volcano: 110,
    dragon: 75
  }

  // Adjust based on nozzle size
  const factor = nozzleDiameter / 0.4
  return baseVolume[hotendType] * Math.sqrt(factor)
}

/**
 * Parse filament type from comment or metadata
 */
export function parseFilamentType(text: string): FilamentType {
  const normalized = text.toUpperCase()

  for (const type of Object.values(FilamentType)) {
    if (normalized.includes(type)) {
      return type as FilamentType
    }
  }

  return FilamentType.UNKNOWN
}

/**
 * Generate ESP command string
 */
export function generateESPCommand(command: string, params: Record<string, any> = {}): string {
  let cmd = command

  Object.entries(params).forEach(([key, value]) => {
    cmd += ` ${key.toUpperCase()}:${value}`
  })

  return `M117 ${cmd}`
}

/**
 * Calculate optimal purge length with safety margin
 */
export function calculateOptimalPurge(
  meltZoneVolume: number,
  filamentDiameter: number,
  safetyFactor: number = 0.9
): number {
  const optimalVolume = meltZoneVolume * safetyFactor
  return volumeToFilamentLength(optimalVolume, filamentDiameter)
}

/**
 * Validate G-code syntax
 */
export function validateGCodeLine(line: string): {
  valid: boolean
  error?: string
} {
  const trimmed = line.trim()

  // Empty lines and comments are valid
  if (!trimmed || trimmed.startsWith(';')) {
    return { valid: true }
  }

  // Check for valid command structure
  const commandPattern = /^[GMTF]\d+(\.\d+)?/
  const tokens = trimmed.split(/\s+/)

  if (tokens.length > 0) {
    const firstToken = tokens[0]

    if (!commandPattern.test(firstToken)) {
      // Check for special commands (like M117 with text)
      if (!firstToken.match(/^[A-Z]\d+/)) {
        return {
          valid: false,
          error: `Invalid command format: ${firstToken}`
        }
      }
    }

    // Validate parameters
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i]
      if (!token.match(/^[A-Z][\d\.\-]+$/) && !token.startsWith(';')) {
        // Special case for M117 and similar text commands
        if (firstToken === 'M117' && i === 1) {
          break // M117 can have free text
        }
        return {
          valid: false,
          error: `Invalid parameter format: ${token}`
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Format time duration
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

/**
 * Round to nearest multiple
 */
export function roundToMultiple(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple
}
