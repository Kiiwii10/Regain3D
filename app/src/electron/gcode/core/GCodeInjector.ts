// electron/gcode/core/GCodeInjector.ts

import { GCodeParser } from './GCodeParser'
import { PrinterProfile } from '../types/profile.types'
import { ParsedGCode } from '../types/gcode.types'
import {
  FilamentChange,
  PurgeCalculation,
  WasteEstimate,
  FilamentType
} from '../types/filament.types'

export interface InjectionOptions {
  profile?: PrinterProfile
  autoDetectProfile?: boolean
  preserveOriginal?: boolean
  addComments?: boolean
  espEnabled?: boolean
  valveMapping?: Map<string, number>
}

export interface InjectionResult {
  success: boolean
  modifiedGCode?: string
  originalGCode: string
  changes: FilamentChange[]
  calculations: PurgeCalculation[]
  wasteEstimate?: WasteEstimate
  profile: PrinterProfile | null
  errors: string[]
  warnings: string[]
}

export class GCodeInjector {
  private parser: GCodeParser
  private profiles: PrinterProfile[] = []

  constructor() {
    this.parser = new GCodeParser()
  }

  /**
   * Register a printer profile
   */
  registerProfile(profile: PrinterProfile): void {
    this.profiles.push(profile)
  }

  /**
   * Clear all registered profiles
   */
  clearProfiles(): void {
    this.profiles = []
  }

  /**
   * Process G-code file with two-stage purging injection
   */
  async process(gcode: string, options: InjectionOptions = {}): Promise<InjectionResult> {
    const result: InjectionResult = {
      success: false,
      originalGCode: gcode,
      changes: [],
      calculations: [],
      profile: null,
      errors: [],
      warnings: []
    }

    try {
      // Parse G-code
      const parsed = this.parser.parse(gcode)

      // Select or detect profile
      const profile = options.profile || this.detectProfile(parsed)
      if (!profile) {
        result.errors.push('No suitable printer profile found')
        return result
      }
      result.profile = profile

      // Detect filament changes
      const changes = this.detectFilamentChanges(parsed, profile)
      if (changes.length === 0) {
        result.warnings.push('No filament changes detected')
        result.success = true
        result.modifiedGCode = gcode
        return result
      }
      result.changes = changes

      // Calculate purge volumes for each change
      const calculations: PurgeCalculation[] = []
      changes.forEach((change) => {
        const calc = this.calculatePurgeVolumes(change, change.originalPurgeLength, profile)
        calculations.push(calc)
        change.calculation = calc
      })
      result.calculations = calculations

      // Generate modified G-code
      const modified = this.injectTwoStagePurging(parsed, changes, profile, options)
      result.modifiedGCode = modified

      // Calculate waste estimate
      result.wasteEstimate = this.calculateWasteEstimate(changes, calculations)

      result.success = true
    } catch (error) {
      result.errors.push(`Processing error: ${error}`)
    }

    return result
  }

  /**
   * Detect the best matching profile for the G-code
   */
  private detectProfile(parsed: ParsedGCode): PrinterProfile | null {
    let bestProfile: PrinterProfile | null = null
    let bestScore = 0

    for (const profile of this.profiles) {
      const score = this.calculateProfileMatchScore(parsed, profile)
      if (score > bestScore) {
        bestScore = score
        bestProfile = profile
      }
    }

    return bestScore > 0 ? bestProfile : null
  }

  /**
   * Inject two-stage purging into the G-code
   */
  private calculateProfileMatchScore(parsed: ParsedGCode, profile: PrinterProfile): number {
    let score = 0

    // Be robust to partially specified profiles
    const detection = (profile as any).detection || {
      headerPatterns: [],
      commandSignatures: [],
      priority: 1
    }

    // Check header patterns
    for (const pattern of detection.headerPatterns || []) {
      for (const line of parsed.raw.slice(0, 50)) {
        // Check first 50 lines
        if (new RegExp(pattern).test(line)) {
          score += 10
          break
        }
      }
    }

    // Check command signatures
    for (const signature of detection.commandSignatures || []) {
      if (parsed.commands.some((cmd) => cmd.command === signature)) {
        score += 5
      }
    }

    // Check metadata
    if (parsed.metadata.generator?.toLowerCase().includes(profile.manufacturer.toLowerCase())) {
      score += 20
    }

    if (parsed.metadata.printerModel?.toLowerCase().includes(profile.model.toLowerCase())) {
      score += 30
    }

    const priority =
      typeof detection.priority === 'number' && detection.priority > 0 ? detection.priority : 1
    return score * priority
  }

  private detectFilamentChanges(gcode: ParsedGCode, profile: PrinterProfile): FilamentChange[] {
    const changes: FilamentChange[] = []
    // Gracefully handle missing or partial change sequence configuration
    const seq: any = (profile as any).changeSequence || {}
    const startTriggers: string[] = seq.startTriggers || []
    const endMarkers: string[] = seq.endMarkers || []
    const purgePatterns: Array<string | RegExp> = seq.purgePatterns || []
    let inChangeBlock = false
    let currentChange: Partial<FilamentChange> = {}
    let blockCommands: ParsedGCode['commands'] = []

    for (const command of gcode.commands) {
      if (startTriggers.some((trigger) => command.command?.startsWith(trigger))) {
        inChangeBlock = true
        currentChange = {
          startLine: command.lineNumber,
          index: changes.length,
          fromTool: changes.length > 0 ? changes[changes.length - 1].toTool : 0,
          toTool: command.parameters.get('S') as number
        }
        blockCommands = [command]
      } else if (inChangeBlock) {
        blockCommands.push(command)
        if (endMarkers.some((marker) => command.command === marker)) {
          inChangeBlock = false
          currentChange.endLine = command.lineNumber

          // Extract purge length from the block
          let purgeLength = 0
          for (const blockCmd of blockCommands) {
            if (blockCmd.command === 'G1' && blockCmd.parameters.has('E')) {
              for (const pattern of purgePatterns) {
                const re = pattern instanceof RegExp ? pattern : new RegExp(pattern)
                if (re.test(blockCmd.raw)) {
                  purgeLength += blockCmd.parameters.get('E') as number
                  break
                }
              }
            }
          }
          currentChange.originalPurgeLength = purgeLength
          changes.push(currentChange as FilamentChange)
        }
      }
    }
    return changes
  }

  private calculatePurgeVolumes(
    change: FilamentChange,
    totalPurgeLength: number,
    profile: PrinterProfile
  ): PurgeCalculation {
    // Convert filament length to volume
    const filamentRadius = profile.hardware.filamentDiameter / 2
    const filamentCrossSection = Math.PI * filamentRadius * filamentRadius
    const totalPurgeVolume = totalPurgeLength * filamentCrossSection

    // Calculate pure purge volume (melt zone with safety factor)
    const purePurgeVolume = profile.hardware.meltZoneVolume * profile.calculations.safetyFactor

    // Calculate mixed purge volume (remainder)
    const mixedPurgeVolume = Math.max(0, totalPurgeVolume - purePurgeVolume)

    // Convert back to filament lengths
    const purePurgeLength = purePurgeVolume / filamentCrossSection
    const mixedPurgeLength = mixedPurgeVolume / filamentCrossSection

    return {
      totalPurgeVolume,
      meltZoneVolume: profile.hardware.meltZoneVolume,
      safetyFactor: profile.calculations.safetyFactor,
      filamentDiameter: profile.hardware.filamentDiameter,
      purePurgeVolume,
      mixedPurgeVolume,
      purePurgeLength: Math.max(profile.calculations.minPurgeLength, purePurgeLength),
      mixedPurgeLength: Math.max(0, mixedPurgeLength),
      fromFilament: change.fromFilament,
      toFilament: change.toFilament,
      changeIndex: change.index,
      layerNumber: undefined // TODO: Extract from Z position
    }
  }

  private rewriteToolChangeBlock(
    blockLines: string[],
    calculation: PurgeCalculation,
    profile: PrinterProfile
  ): string[] {
    const { templates } = profile.injection
    const vars = this.createVariableMap(calculation, profile)

    const newBlock: string[] = []

    // Pre-purge
    newBlock.push(...this.expandTemplate(templates.prePurge, vars))

    // Stage 1
    vars.set('purge_length', calculation.purePurgeLength.toFixed(2))
    newBlock.push(...this.expandTemplate(templates.purgeStage1, vars))

    // Pause
    newBlock.push(...this.expandTemplate(templates.espPause, vars))

    // Stage 2
    vars.set('purge_length', calculation.mixedPurgeLength.toFixed(2))
    newBlock.push(...this.expandTemplate(templates.purgeStage2, vars))

    // Post-purge
    newBlock.push(...this.expandTemplate(templates.postPurge, vars))

    return newBlock
  }

  private createVariableMap(
    calculation: PurgeCalculation,
    profile: PrinterProfile
  ): Map<string, string> {
    const vars = new Map<string, string>(Object.entries(profile.injection.variables))
    vars.set('pure_purge_length', calculation.purePurgeLength.toFixed(2))
    vars.set('mixed_purge_length', calculation.mixedPurgeLength.toFixed(2))
    vars.set(
      'total_purge_length',
      (calculation.purePurgeLength + calculation.mixedPurgeLength).toFixed(2)
    )
    // Add more variables from calculation and profile as needed
    return vars
  }

  private expandTemplate(template: string, vars: Map<string, string>): string[] {
    if (!template) return []
    const lines = template.split('\n')
    return lines.map((line) => {
      let expanded = line
      vars.forEach((value, key) => {
        expanded = expanded.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
      })
      return expanded
    })
  }

  private injectTwoStagePurging(
    parsed: ParsedGCode,
    changes: FilamentChange[],
    profile: PrinterProfile,
    options: InjectionOptions
  ): string {
    const lines = [...parsed.raw]
    const replacements: Map<number, string[]> = new Map()

    // Process each filament change
    changes.forEach((change) => {
      if (!change.calculation) return

      // Get original block lines
      const blockLines = parsed.raw.slice(change.startLine, change.endLine + 1)

      // Let profile rewrite block into two-stage purge while preserving critical commands
      const rewritten = this.rewriteToolChangeBlock(blockLines, change.calculation, profile)

      // Add comments if requested
      if (options.addComments) {
        rewritten.unshift(
          `; === Regain3D Two-Stage Purge ===`,
          `; Change ${change.index + 1}: Tool ${change.fromTool} -> ${change.toTool}`,
          `; Pure purge: ${change.calculation.purePurgeLength.toFixed(2)}mm`,
          `; Mixed purge: ${change.calculation.mixedPurgeLength.toFixed(2)}mm`,
          `; Total saving: ${(change.originalPurgeLength - (change.calculation.purePurgeLength + change.calculation.mixedPurgeLength)).toFixed(2)}mm`
        )
      }

      // Store replacement block
      replacements.set(change.startLine, rewritten)

      // Remove original lines after startLine
      for (let i = change.startLine + 1; i <= change.endLine; i++) {
        replacements.set(i, [])
      }
    })

    // Apply replacements in reverse order to maintain line numbers
    const sortedLines = Array.from(replacements.keys()).sort((a, b) => b - a)

    for (const lineNum of sortedLines) {
      const replacement = replacements.get(lineNum)
      if (replacement !== undefined) {
        if (replacement.length === 0) {
          // Remove line
          lines.splice(lineNum, 1)
        } else {
          // Replace line with injection
          lines.splice(lineNum, 1, ...replacement)
        }
      }
    }

    return lines.join('\n')
  }

  /**
   * Calculate waste estimates
   */
  private calculateWasteEstimate(
    changes: FilamentChange[],
    calculations: PurgeCalculation[]
  ): WasteEstimate {
    const pureWaste = new Map<FilamentType, number>()
    let mixedWaste = 0
    let originalWaste = 0

    // Filament cross-section area for volume calculations
    const filamentArea = Math.PI * Math.pow(1.75 / 2, 2) // mm²
    const density = 1.24 // g/cm³ for PLA (default)

    calculations.forEach((calc, index) => {
      const change = changes[index]

      // Pure waste by type
      const pureVolume = calc.purePurgeLength * filamentArea // mm³
      const pureMass = (pureVolume / 1000) * density // g

      const filamentType = calc.fromFilament?.type || FilamentType.UNKNOWN
      pureWaste.set(filamentType, (pureWaste.get(filamentType) || 0) + pureMass)

      // Mixed waste
      const mixedVolume = calc.mixedPurgeLength * filamentArea // mm³
      mixedWaste += (mixedVolume / 1000) * density // g

      // Original waste
      const originalVolume = change.originalPurgeLength * filamentArea // mm³
      originalWaste += (originalVolume / 1000) * density // g
    })

    const totalOptimized = Array.from(pureWaste.values()).reduce((a, b) => a + b, 0) + mixedWaste
    const savingsPercent = ((originalWaste - totalOptimized) / originalWaste) * 100

    return {
      totalChanges: changes.length,
      pureWaste,
      mixedWaste,
      originalWaste,
      savingsPercent
    }
  }
}
