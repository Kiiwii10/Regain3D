import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '@resources/icon.png?asset'
import { registerIpcHandlers } from '@electron/ipcHandlers'
import { initializeGCodeHandlers } from '@electron/gcode/gcodeIpcHandlers'
import { discoveryManagerService } from '@electron/printer/discoveryManager'
import { FirmwareManager as ESPFirmwareManager } from '@electron/firmware/firmwareManager'
import { ESPMonitor } from '@electron/esp/espMonitor'
import { databaseService } from '@electron/database/database'
import { printerManagerService } from '@electron/printer/printerManager'
import { IpcChannels } from '@shared/constants/ipc'
import { PrinterConfig as Printer } from '@shared/types/printer'
import { ESPUpdateService } from '@electron/esp/espUpdateService'

if (process.platform === 'win32') app.setAppUserModelId(app.getName())

let mainWindow: BrowserWindow | null = null
let cliMode = false
let cliFilePath: string | null = null
let cliProfileId: string | null = null

// Parse CLI arguments early to determine mode
const args = process.argv.slice(2)
const supportedExtensions = ['.gcode']

const hasSupportedExtension = (file: string): boolean =>
  supportedExtensions.some((ext) => file.toLowerCase().endsWith(ext))

if (args.length > 0) {
  const filePath = args[0]
  const lowerFile = filePath.toLowerCase()
  if (hasSupportedExtension(filePath)) {
    cliMode = true
    cliFilePath = filePath
    console.log('CLI Mode: Processing file', filePath)

    // Parse optional profile argument
    for (let i = 1; i < args.length; i++) {
      const arg = args[i]
      if (arg === '--profile' && args[i + 1]) {
        cliProfileId = args[i + 1]
        i++
      } else if (arg.startsWith('--profile=')) {
        cliProfileId = arg.split('=')[1]
      }
    }
  } else if (lowerFile.endsWith('.3mf')) {
    console.error('Usage: npm run cli -- <file.gcode> [--profile <id>]')
    process.exit(1)
  } else if (process.env.npm_lifecycle_event === 'cli') {
    console.log('Usage: npm run cli -- <file.gcode> [--profile <id>]')
    process.exit(1)
  }
} else if (process.env.npm_lifecycle_event === 'cli') {
  console.log('Usage: npm run cli -- <file.gcode> [--profile <id>]')
  process.exit(1)
}

// Only enforce single instance for regular GUI mode
if (!cliMode && !app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

function createWindow(): void {
  // Different window settings for CLI mode
  const windowConfig = cliMode
    ? {
        width: 800,
        height: 600,
        title: 'G-code Processor - Regain3D',
        show: false,
        autoHideMenuBar: true,
        frame: true, // Show frame in CLI mode for better UX
        backgroundColor: '#11121a',
        resizable: true,
        minimizable: true,
        maximizable: false,
        center: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
          preload: app.isPackaged
            ? join(__dirname, '../preload/index.cjs')
            : join(__dirname, '../preload/index.mjs'),
          contextIsolation: true,
          sandbox: false
        }
      }
    : {
        width: 1400,
        height: 500,
        title: 'Dashboard - Regain3D',
        show: false,
        autoHideMenuBar: true,
        frame: false,
        backgroundColor: '#11121a',
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
          preload: app.isPackaged
            ? join(__dirname, '../preload/index.cjs')
            : join(__dirname, '../preload/index.mjs'),
          contextIsolation: true,
          sandbox: false
        }
      }

  mainWindow = new BrowserWindow(windowConfig)

  if (mainWindow !== null) {
    mainWindow.on('ready-to-show', () => {
      if (mainWindow) {
        mainWindow.show()
      }

      // Send CLI file path to renderer after window is ready
      if (cliMode && cliFilePath) {
        setTimeout(() => {
          mainWindow?.webContents.send('cli-mode-init', {
            filePath: cliFilePath,
            profileId: cliProfileId,
            isCliMode: true
          })
        }, 500)
      }
    })

    // Handle window close in CLI mode
    mainWindow.on('closed', () => {
      if (cliMode) {
        // Avoid duplicate exits if CLI handlers already terminated the app
        if (!global.cliExitHandled) {
          // Exit with appropriate code based on processing status
          const exitCode = global.cliProcessingSuccess ? 0 : 1
          app.exit(exitCode)
        }
      }
    })
  }

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the appropriate URL/file
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = cliMode
      ? `${process.env['ELECTRON_RENDERER_URL']}#/gcode-cli`
      : process.env['ELECTRON_RENDERER_URL']
    mainWindow.loadURL(url)
    if (!cliMode) {
      mainWindow.webContents.openDevTools()
    }
  } else {
    const htmlFile = join(__dirname, '../renderer/index.html')
    if (cliMode) {
      mainWindow.loadFile(htmlFile, { hash: '/gcode-cli' })
    } else {
      mainWindow.loadFile(htmlFile)
    }
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.regain3d')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  if (mainWindow) {
    // Initialize firmware catalog
    ESPFirmwareManager.initialize()
    registerIpcHandlers(mainWindow)
    initializeGCodeHandlers(mainWindow, cliMode)

    ESPUpdateService.getInstance()
      .initialize(mainWindow)
      .catch((err) => console.warn('[Startup] Failed to initialize ESP update service:', err))

    // Handle window resize requests from the renderer
    ipcMain.handle(IpcChannels.WINDOW_RESIZE, (_event, { height }) => {
      if (mainWindow && !mainWindow.isDestroyed() && cliMode) {
        const [width] = mainWindow.getSize()
        // Set a minimum height and allow it to grow. Add padding for the title bar.
        const newHeight = Math.max(400, Math.ceil(height) + 40)
        mainWindow.setSize(width, newHeight, true) // Animate the resize
      }
    })

    // Initialize and connect configured printers from DB
    ;(async () => {
      try {
        const printers = await databaseService.getAllPrinters()
        for (const p of printers) {
          try {
            if (await printerManagerService.isPrinterHandledByESP(p.id)) {
              try {
                await databaseService.updatePrinter(p.id, { status: 'online' } as Partial<Printer>)
              } catch {
                // Ignore DB update errors
              }
              continue
            }
            const instance = printerManagerService.initializePrinter(p)
            await instance.connect(p)
            try {
              await databaseService.updatePrinter(p.id, { status: 'online' } as Partial<Printer>)
            } catch {
              // Ignore DB update errors
            }
          } catch (err) {
            console.warn(`[Startup] Failed to initialize/connect printer ${p.id}:`, err)
            try {
              await databaseService.updatePrinter(p.id, { status: 'offline' } as Partial<Printer>)
            } catch {
              // Ignore DB update errors
            }
          }
        }
        try {
          mainWindow.webContents.send(IpcChannels.PRINTER_CONFIGS_CHANGED)
        } catch {
          // Ignore errors
        }
      } catch (e) {
        console.error('[Startup] Failed to bootstrap printers:', e)
      }
    })()

    // Only start discovery service in normal mode
    if (!cliMode) {
      discoveryManagerService.start(mainWindow)
      // Periodically probe ESPs for status/health from DB list
      ESPMonitor.start(60000)
    }
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Global variables for CLI mode
// Exit codes: 0 = success, 1 = failure or cancellation
declare global {
  var cliProcessingSuccess: boolean
  var cliExitHandled: boolean
}

global.cliProcessingSuccess = false
global.cliExitHandled = false
