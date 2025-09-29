// electron/gcode/index.ts

import { GCodeInjector, InjectionOptions, InjectionResult } from './core/GCodeInjector'
import { GCodeParser } from './core/GCodeParser'
import { PrinterProfile } from './types/profile.types'
import * as path from 'path'
// Note: JSON-based PrinterProfile save/delete removed; using built-in classes only
import * as fs from 'fs/promises'
import { GCodeProcessingReport, GCodeAnalysisResult } from '@shared/types/gcode'

export interface GCodeServiceConfig {
  profilesPath?: string
  enableESP?: boolean
  defaultSafetyFactor?: number
  autoBackup?: boolean
  verboseLogging?: boolean
}

export interface ProcessFileOptions extends InjectionOptions {
  outputPath?: string
  backupOriginal?: boolean
  generateReport?: boolean
  // Optional profile selection by id coming from UI
  profileId?: string
}

export class GCodeService {
  private injector: GCodeInjector
  private profiles: PrinterProfile[] = []
  private config: GCodeServiceConfig
  private initPromise: Promise<void>

  constructor(config: GCodeServiceConfig = {}) {
    this.config = {
      enableESP: true,
      defaultSafetyFactor: 0.9,
      autoBackup: true,
      verboseLogging: false,
      ...config
    }

    this.injector = new GCodeInjector()

    // Register all profiles with the injector
    this.initPromise = this.initializeProfiles()
  }

  /**
   * Initialize and register all profiles
   */
  private async initializeProfiles(): Promise<void> {
    // Reset and register all profiles with the injector
    this.injector.clearProfiles()
    const profileDir =
      this.config.profilesPath || path.join(__dirname, '..', '..', 'resources', 'printerConfigs')
    const manufacturers = await fs.readdir(profileDir)
    for (const manufacturer of manufacturers) {
      const manufacturerDir = path.join(profileDir, manufacturer)
      const stats = await fs.stat(manufacturerDir)
      if (stats.isDirectory()) {
        const profileFiles = await fs.readdir(manufacturerDir)
        let sharedProfile: Partial<PrinterProfile> = {}
        const sharedProfilePath = path.join(manufacturerDir, `${manufacturer}.json`)
        try {
          const sharedContent = await fs.readFile(sharedProfilePath, 'utf-8')
          sharedProfile = JSON.parse(sharedContent)
        } catch {
          // No shared profile, continue
        }

        for (const profileFile of profileFiles) {
          if (profileFile.endsWith('.json') && profileFile !== `${manufacturer}.json`) {
            const profilePath = path.join(manufacturerDir, profileFile)
            const content = await fs.readFile(profilePath, 'utf-8')
            const specificProfile: PrinterProfile = JSON.parse(content)
            const mergedProfile = { ...sharedProfile, ...specificProfile } as PrinterProfile
            this.profiles.push(mergedProfile)
            this.injector.registerProfile(mergedProfile)
          }
        }
      }
    }

    if (this.config.verboseLogging) {
      console.log(`Loaded ${this.profiles.length} printer profiles`)
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise
  }

  /**
   * Process a G-code file
   */
  async processFile(
    inputPath: string,
    options: ProcessFileOptions = {}
  ): Promise<GCodeProcessingReport> {
    await this.ensureInitialized()
    const startTime = Date.now()

    if (!inputPath.toLowerCase().endsWith('.gcode')) {
      throw new Error('only .gcode files are supported')
    }

    // Read input file
    const gcode = await fs.readFile(inputPath, 'utf-8')

    // Backup if requested
    if (options.backupOriginal ?? this.config.autoBackup) {
      const backupPath = inputPath.replace(/\.gcode$/i, '_original.gcode')
      await fs.writeFile(backupPath, gcode)
      if (this.config.verboseLogging) {
        console.log(`Backup saved to: ${backupPath}`)
      }
    }

    // Resolve selected profile if provided by id
    let selectedProfile: PrinterProfile | undefined
    if (options.profile) {
      selectedProfile = options.profile
    } else if (options.profileId) {
      selectedProfile = this.profiles.find((p) => p.id === options.profileId)
    }

    // Process with injector
    const result = await this.injector.process(gcode, {
      ...options,
      profile: selectedProfile ?? options.profile,
      espEnabled: options.espEnabled ?? this.config.enableESP,
      addComments: true
    })

    if (!result.success) {
      throw new Error(`Processing failed: ${result.errors.join(', ')}`)
    }

    // Determine output path
    const outputPath = options.outputPath || inputPath.replace(/\.gcode$/i, '_optimized.gcode')

    // Write output file
    if (result.modifiedGCode) {
      await fs.writeFile(outputPath, result.modifiedGCode)
      if (this.config.verboseLogging) {
        console.log(`Optimized G-code saved to: ${outputPath}`)
      }
    }

    // Generate report
    const report: GCodeProcessingReport = {
      inputFile: inputPath,
      outputFile: outputPath,
      profile: result.profile?.name || 'Unknown',
      totalChanges: result.changes.length,
      originalWaste: result.wasteEstimate?.originalWaste || 0,
      optimizedWaste:
        (result.wasteEstimate?.mixedWaste || 0) +
        Array.from(result.wasteEstimate?.pureWaste.values() || []).reduce((a, b) => a + b, 0),
      savingsPercent: result.wasteEstimate?.savingsPercent || 0,
      purgeDetails: result.changes.map((change, i) => ({
        changeNumber: i + 1,
        fromTool: change.fromTool,
        toTool: change.toTool,
        purePurge: result.calculations[i]?.purePurgeLength || 0,
        mixedPurge: result.calculations[i]?.mixedPurgeLength || 0
      })),
      executionTime: Date.now() - startTime
    }

    // Save report if requested
    if (options.generateReport) {
      const reportPath = inputPath.replace(/\.gcode$/i, '_report.json')
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
      if (this.config.verboseLogging) {
        console.log(`Report saved to: ${reportPath}`)
      }
    }

    return report
  }

  /**
   * Process G-code string directly
   */
  async processGCode(gcode: string, options: InjectionOptions = {}): Promise<InjectionResult> {
    await this.ensureInitialized()
    // Allow passing a profile id via options as any (from UI)
    let resolvedProfile: PrinterProfile | undefined = options.profile
    if (!resolvedProfile && (options as ProcessFileOptions).profileId) {
      resolvedProfile = this.profiles.find(
        (p) => p.id === (options as ProcessFileOptions).profileId
      )
    }

    return this.injector.process(gcode, {
      ...options,
      profile: resolvedProfile ?? options.profile,
      espEnabled: options.espEnabled ?? this.config.enableESP
    })
  }

  /**
   * Analyze G-code without modification
   */
  async analyzeGCode(gcode: string): Promise<GCodeAnalysisResult> {
    await this.ensureInitialized()
    const parser = new GCodeParser()
    const parsed = parser.parse(gcode)

    const profiles = this.profiles
    let bestProfile: PrinterProfile | null = null
    let bestScore = 0

    for (const profile of profiles) {
      const score = this.injector['calculateProfileMatchScore'](parsed, profile)
      if (score > bestScore) {
        bestScore = score
        bestProfile = profile
      }
    }

    const changes = bestProfile ? this.injector['detectFilamentChanges'](parsed, bestProfile) : []
    const spoolMap = new Map<number, string>()
    changes.forEach((change) => {
      if (change.fromFilament) {
        spoolMap.set(change.fromTool, change.fromFilament.type)
      }
      if (change.toFilament) {
        spoolMap.set(change.toTool, change.toFilament.type)
      }
    })

    const spools = Array.from(spoolMap.entries()).map(([tool, plastic]) => ({
      tool,
      plastic
    }))

    return {
      brand: bestProfile?.manufacturer || null,
      printer: bestProfile?.model || null,
      toolChanges: changes.length,
      spools
    }
  }

  /**
   * Get available profiles
   */
  async getAvailableProfiles(): Promise<
    Array<{ id: string; name: string; manufacturer: string; model: string }>
  > {
    await this.ensureInitialized()
    return this.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      manufacturer: p.manufacturer,
      model: p.model
    }))
  }

  /**
   * CLI entry point
   */
  static async cli(args: string[]): Promise<void> {
    const service = new GCodeService({
      verboseLogging: true
    })

    if (args.length < 1) {
      console.log('Usage: gcode-injector <input.gcode> [output.gcode]')
      process.exit(1)
    }

    const inputPath = args[0]
    const outputPath = args[1]

    try {
      const report = await service.processFile(inputPath, {
        outputPath,
        generateReport: true
      })

      console.log('\n=== Processing Complete ===')
      console.log(`Profile: ${report.profile}`)
      console.log(`Filament changes: ${report.totalChanges}`)
      console.log(`Original waste: ${report.originalWaste.toFixed(2)}g`)
      console.log(`Optimized waste: ${report.optimizedWaste.toFixed(2)}g`)
      console.log(`Savings: ${report.savingsPercent.toFixed(1)}%`)
      console.log(`Execution time: ${report.executionTime}ms`)

      process.exit(0)
    } catch (error) {
      console.error('Error:', error)
      process.exit(1)
    }
  }
}

// Export types
export * from './types/gcode.types'
export * from './types/profile.types'
export * from './types/filament.types'
export { GCodeParser } from './core/GCodeParser'
export { GCodeInjector } from './core/GCodeInjector'
