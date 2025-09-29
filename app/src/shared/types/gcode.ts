// shared/types/gcode.ts

export interface GCodeAnalysisResult {
  brand: string | null
  printer: string | null
  toolChanges: number
  spools: Array<{ tool: number; plastic: string | null }>
}

export interface GCodeProcessingReport {
  inputFile: string
  outputFile?: string
  profile: string
  totalChanges: number
  originalWaste: number
  optimizedWaste: number
  savingsPercent: number
  purgeDetails: Array<{
    changeNumber: number
    fromTool: number
    toTool: number
    purePurge: number
    mixedPurge: number
  }>
  executionTime: number
}

export interface GCodeProfile {
  id: string
  name: string
  manufacturer: string
  model: string
}

export interface GCodeValidationResult {
  valid: boolean
  errors: Array<{
    line: number
    error: string
  }>
  totalLines: number
}

export interface GCodeProcessOptions {
  outputPath?: string
  profileId?: string
  backupOriginal?: boolean
  generateReport?: boolean
  espEnabled?: boolean
  safetyFactor?: number
}

export interface GCodeBatchOptions {
  outputDir?: string
  backupOriginal?: boolean
  generateReport?: boolean
}

export interface CliModeData {
  filePath: string
  isCliMode: boolean
  profileId?: string
}

export interface GCodeBatchResult {
  results: Array<{
    file: string
    success: boolean
    report?: GCodeProcessingReport
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
    totalSaved: number
  }
}
