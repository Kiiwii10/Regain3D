// electron/gcode/gcodeIpcHandlers.ts

import { ipcMain, BrowserWindow, dialog, shell, app } from 'electron'
import { IpcChannels } from '@shared/constants/ipc'
import { GCodeService, ProcessFileOptions } from '@electron/gcode'
import * as fs from 'fs/promises'
import * as path from 'path'
import { GCodeProcessingReport } from '@shared/types/gcode'

export function registerGCodeIpcHandlers(
  win: BrowserWindow,
  gcodeService: GCodeService,
  isCliMode: boolean = false
): void {
  // --- G-code Analysis ---
  ipcMain.handle(IpcChannels.GCODE_ANALYZE, async (_, inputPath: string) => {
    try {
      // Validate file exists
      await fs.access(inputPath)

      // Reject unsupported formats
      if (!inputPath.toLowerCase().endsWith('.gcode')) {
        throw new Error('only gcode files are supported')
      }

      // Read and analyze
      const gcode = await fs.readFile(inputPath, 'utf-8')
      const analysis = await gcodeService.analyzeGCode(gcode)

      return {
        success: true,
        data: analysis
      }
    } catch (error) {
      const message = `Failed to analyze G-code: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`

      if (isCliMode) {
        console.error(message)
      }

      return {
        success: false,
        error: message
      }
    }
  })

  // --- G-code File Processing ---
  ipcMain.handle(
    IpcChannels.GCODE_PROCESS_FILE,
    async (_, inputPath: string, options: ProcessFileOptions = {}) => {
      try {
        // Validate input file
        const stats = await fs.stat(inputPath)
        if (!stats.isFile()) {
          throw new Error('Input path is not a file')
        }

        // Reject unsupported formats
        if (!inputPath.toLowerCase().endsWith('.gcode')) {
          throw new Error('only gcode files are supported')
        }

        if (!options.outputPath) {
          options.outputPath = inputPath.replace(/\.gcode$/i, '_optimized.gcode')
        }

        // Process the file
        const report = await gcodeService.processFile(inputPath, {
          ...options,
          generateReport: options.generateReport ?? true,
          backupOriginal: options.backupOriginal ?? true,
          espEnabled: options.espEnabled ?? true
        })

        // Log success in CLI mode
        if (isCliMode) {
          console.log(`✓ Successfully processed: ${inputPath}`)
          console.log(`  Output: ${report.outputFile}`)
          console.log(`  Savings: ${report.savingsPercent.toFixed(1)}%`)
        }

        return {
          success: true,
          data: report
        }
      } catch (error) {
        const message = `Failed to process G-code: ${error instanceof Error ? error.message : 'Unknown error'}`

        if (isCliMode) {
          console.error(`✗ ${message}`)
        }

        return {
          success: false,
          error: message
        }
      }
    }
  )

  // --- G-code String Processing ---
  ipcMain.handle(IpcChannels.GCODE_PROCESS_STRING, async (_, gcode: string, options) => {
    try {
      const result = await gcodeService.processGCode(gcode, {
        ...options,
        espEnabled: options?.espEnabled ?? true
      })

      return {
        success: result.success,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // --- Get Available Profiles ---
  ipcMain.handle(IpcChannels.GCODE_GET_PROFILES, async () => {
    try {
      const profiles = await gcodeService.getAvailableProfiles()

      return {
        success: true,
        data: profiles
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [] // Return empty array as fallback
      }
    }
  })

  // --- Validate G-code ---
  ipcMain.handle(IpcChannels.GCODE_VALIDATE, async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      const errors: Array<{ line: number; error: string }> = []

      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(';')) return

        // Basic G-code validation
        if (!trimmed.match(/^[GMTF]\d+/)) {
          errors.push({
            line: index + 1,
            error: 'Invalid command format'
          })
        }

        // Check for common issues
        if (trimmed.includes('M620') && !trimmed.includes('S')) {
          errors.push({
            line: index + 1,
            error: 'M620 missing S parameter'
          })
        }
      })

      return {
        success: true,
        data: {
          valid: errors.length === 0,
          errors,
          totalLines: lines.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate G-code'
      }
    }
  })

  // --- Batch Process ---
  ipcMain.handle(IpcChannels.GCODE_BATCH_PROCESS, async (_, directory: string, options) => {
    try {
      const files = await fs.readdir(directory)
      const gcodeFiles = files.filter((f) => f.toLowerCase().endsWith('.gcode'))

      if (gcodeFiles.length === 0) {
        return {
          success: false,
          error: 'No G-code files found in directory',
          data: []
        }
      }

      const results: Array<{
        file: string
        success: boolean
        report?: GCodeProcessingReport
        error?: string
      }> = []
      let successCount = 0
      let totalSaved = 0

      for (const file of gcodeFiles) {
        const inputPath = path.join(directory, file)
        const outputDir = options?.outputDir || path.join(directory, 'optimized')

        // Ensure output directory exists
        await fs.mkdir(outputDir, { recursive: true })

        try {
          const report = await gcodeService.processFile(inputPath, {
            ...options,
            outputPath: path.join(outputDir, file)
          })

          results.push({
            file,
            success: true,
            report
          })

          successCount++
          totalSaved += report.originalWaste - report.optimizedWaste
        } catch (error) {
          results.push({
            file,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return {
        success: true,
        data: {
          results,
          summary: {
            total: gcodeFiles.length,
            successful: successCount,
            failed: gcodeFiles.length - successCount,
            totalSaved
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch process'
      }
    }
  })

  // --- File Dialog Helpers ---
  ipcMain.handle('gcode:dialog:open-file', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Select G-code File',
      filters: [
        { name: 'G-code Files', extensions: ['gcode', 'GCODE'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('gcode:dialog:save-file', async (_, defaultPath?: string) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Save Optimized G-code',
      defaultPath,
      filters: [
        { name: 'G-code Files', extensions: ['gcode', 'GCODE'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('gcode:dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Select Directory',
      properties: ['openDirectory']
    })

    return result.canceled ? null : result.filePaths[0]
  })

  // --- Shell Operations ---
  ipcMain.handle('gcode:shell:show-in-folder', (_, fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })

  ipcMain.handle('gcode:shell:open-external', (_, url: string) => {
    shell.openExternal(url)
  })

  // --- CLI Mode Status Handlers ---
  if (isCliMode) {
    // Handle processing completion
    ipcMain.on('cli-processing-complete', (_, success: boolean) => {
      console.log(success ? '✓ Processing completed successfully' : '✗ Processing failed')

      // Set global flag for exit code
      global.cliProcessingSuccess = success

      // Give a moment for any final operations
      setTimeout(() => {
        global.cliExitHandled = true
        app.exit(success ? 0 : 1)
      }, 100)
    })

    // Handle user cancellation
    ipcMain.on('cli-processing-cancelled', () => {
      console.log('✗ Processing cancelled by user')
      global.cliProcessingSuccess = false
      global.cliExitHandled = true
      app.exit(1)
    })
  }
}

// Export a factory function to create the service and register handlers
export function initializeGCodeHandlers(
  win: BrowserWindow,
  isCliMode: boolean = false
): GCodeService {
  const gcodeService = new GCodeService({
    verboseLogging: isCliMode,
    enableESP: true,
    autoBackup: true,
    defaultSafetyFactor: 0.9
  })

  registerGCodeIpcHandlers(win, gcodeService, isCliMode)

  return gcodeService
}
