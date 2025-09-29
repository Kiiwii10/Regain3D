export interface GCodeCommand {
  lineNumber: number
  raw: string
  command?: string
  parameters: Map<string, number | string>
  comment?: string
  isComment: boolean
}

export interface ParsedGCode {
  commands: GCodeCommand[]
  metadata: GCodeMetadata
  raw: string[]
}

export interface GCodeMetadata {
  generator?: string
  printerModel?: string
  filamentUsed?: number[]
  printTime?: number
  layerHeight?: number
  nozzleDiameter?: number
  filamentDiameter?: number
  totalPurgeVolume?: number
}
