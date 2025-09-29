import { ipcRenderer, contextBridge, shell } from 'electron'
import { IpcChannels } from '@shared/constants/ipc'
import { PrinterConfig, ValidationPayload, PrinterCommand } from '@shared/types/printer'
import { CliModeData } from '@shared/types/gcode'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...params) => listener(event, ...params))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  }
})

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  setWindowTitle: (title: string) => ipcRenderer.invoke('set-window-title', title),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Printer Wizard
  startDiscovery: () => ipcRenderer.invoke(IpcChannels.DEVICE_DISCOVERY_START),
  stopDiscovery: () => ipcRenderer.invoke(IpcChannels.DEVICE_DISCOVERY_STOP),
  onDeviceFound: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.DEVICE_FOUND, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.DEVICE_FOUND, subscription)
    }
  },
  onDeviceLost: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.DEVICE_LOST, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.DEVICE_LOST, subscription)
    }
  },
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),

  validatePrinter: (payload: ValidationPayload) =>
    ipcRenderer.invoke(IpcChannels.PRINTER_VALIDATE, payload),

  checkPrinterName: (name: string) => ipcRenderer.invoke(IpcChannels.PRINTER_CHECK_NAME, name),

  getPrinterConfigSchema: (args: { brand: string; model: string }) =>
    ipcRenderer.invoke(IpcChannels.PRINTER_GET_CONFIG_SCHEMA, args),

  addPrinter: (config: PrinterConfig) => ipcRenderer.invoke(IpcChannels.PRINTER_ADD, config),

  getAllPrinters: () => ipcRenderer.invoke(IpcChannels.PRINTER_GET_ALL),
  connectAllPrinters: () => ipcRenderer.invoke(IpcChannels.PRINTER_CONNECT_ALL),
  connectPrinter: (id: string) => ipcRenderer.invoke(IpcChannels.PRINTER_CONNECT, id),

  getPrinter: (id: string) => ipcRenderer.invoke(IpcChannels.PRINTER_GET, id),
  getPrinterTelemetry: (id: string) => ipcRenderer.invoke(IpcChannels.PRINTER_GET_TELEMETRY, id),

  updatePrinter: (id: string, updates: Partial<PrinterConfig>) =>
    ipcRenderer.invoke(IpcChannels.PRINTER_UPDATE, id, updates),

  removePrinter: (id: string) => ipcRenderer.invoke(IpcChannels.PRINTER_REMOVE, id),

  sendPrinterCommand: (id: string, command: PrinterCommand) =>
    ipcRenderer.invoke(IpcChannels.PRINTER_COMMAND, id, command),

  // Printer config changes (DB updates) stream
  onPrinterConfigsChanged: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(IpcChannels.PRINTER_CONFIGS_CHANGED, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.PRINTER_CONFIGS_CHANGED, subscription)
    }
  },

  // ESP Functions
  startESPDiscovery: () => ipcRenderer.invoke(IpcChannels.ESP_DISCOVERY_START),
  stopESPDiscovery: () => ipcRenderer.invoke(IpcChannels.ESP_DISCOVERY_STOP),
  onESPFound: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.ESP_FOUND, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.ESP_FOUND, subscription)
    }
  },
  onESPLost: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.ESP_LOST, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.ESP_LOST, subscription)
    }
  },
  getAllESPs: () => ipcRenderer.invoke(IpcChannels.ESP_GET_ALL),
  getESP: (id: string) => ipcRenderer.invoke(IpcChannels.ESP_GET, id),
  getESPByIP: (ip: string) => ipcRenderer.invoke(IpcChannels.ESP_GET_BY_IP, ip),
  addESP: (espData: any) => ipcRenderer.invoke(IpcChannels.ESP_ADD, espData),
  updateESP: (id: string, updates: any) => ipcRenderer.invoke(IpcChannels.ESP_UPDATE, id, updates),
  removeESP: (id: string) => ipcRenderer.invoke(IpcChannels.ESP_REMOVE, id),
  provisionESP: (payload: any) => ipcRenderer.invoke(IpcChannels.ESP_PROVISION, payload),
  checkESPReachable: (espDevice: any) =>
    ipcRenderer.invoke(IpcChannels.ESP_CHECK_REACHABLE, espDevice),
  getESPStatus: (espDevice: any) => ipcRenderer.invoke(IpcChannels.ESP_GET_STATUS, espDevice),
  identifyESP: (
    arg:
      | string
      | { ip: string; action?: 'start' | 'stop' | 'off' | 'on' | '0' | '1'; durationMs?: number }
  ) => ipcRenderer.invoke(IpcChannels.ESP_IDENTIFY, arg),
  assignESPToPrinter: (payload: any) =>
    ipcRenderer.invoke(IpcChannels.ESP_ASSIGN_TO_PRINTER, payload),
  unassignESP: (espId: string) => ipcRenderer.invoke(IpcChannels.ESP_UNASSIGN, espId),

  // Assignment events
  onESPAssignProgress: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.ESP_ASSIGN_PROGRESS, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.ESP_ASSIGN_PROGRESS, subscription)
    }
  },
  onESPAssignResult: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.ESP_ASSIGN_RESULT, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.ESP_ASSIGN_RESULT, subscription)
    }
  },
  // ESP config changes (DB updates) stream
  onESPConfigsChanged: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(IpcChannels.ESP_CONFIGS_CHANGED, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.ESP_CONFIGS_CHANGED, subscription)
    }
  },

  onESPStatusUpdate: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on(IpcChannels.ESP_STATUS_UPDATE, subscription)
    return () => {
      ipcRenderer.removeListener(IpcChannels.ESP_STATUS_UPDATE, subscription)
    }
  },

  // Firmware delivery
  getFirmwareForPrinter: (brand: string, peerIP?: string) =>
    ipcRenderer.invoke(IpcChannels.FIRMWARE_GET_FOR_PRINTER, brand, peerIP),

  // G-code Processing
  analyzeGCode: (filePath: string) => ipcRenderer.invoke(IpcChannels.GCODE_ANALYZE, filePath),

  processGCodeFile: (
    filePath: string,
    options?: {
      outputPath?: string
      profileId?: string
      backupOriginal?: boolean
      generateReport?: boolean
      espEnabled?: boolean
      safetyFactor?: number
    }
  ) => ipcRenderer.invoke(IpcChannels.GCODE_PROCESS_FILE, filePath, options),

  processGCodeString: (gcode: string, options?: any) =>
    ipcRenderer.invoke(IpcChannels.GCODE_PROCESS_STRING, gcode, options),

  getGCodeProfiles: () => ipcRenderer.invoke(IpcChannels.GCODE_GET_PROFILES),

  validateGCode: (filePath: string) => ipcRenderer.invoke(IpcChannels.GCODE_VALIDATE, filePath),

  batchProcessGCode: (
    directory: string,
    options?: {
      outputDir?: string
      backupOriginal?: boolean
      generateReport?: boolean
    }
  ) => ipcRenderer.invoke(IpcChannels.GCODE_BATCH_PROCESS, directory, options),

  // Shell operations for G-code files
  showItemInFolder: (fullPath: string) => shell.showItemInFolder(fullPath),

  openExternal: (url: string) => shell.openExternal(url),

  // CLI Mode listeners
  onCliModeInit: (callback: (data: CliModeData) => void) => {
    const subscription = (_event: any, value: CliModeData) => callback(value)
    ipcRenderer.on('cli-mode-init', subscription)
    return () => {
      ipcRenderer.removeListener('cli-mode-init', subscription)
    }
  },

  notifyCliProcessingComplete: (success: boolean) =>
    ipcRenderer.send('cli-processing-complete', success),

  notifyCliProcessingCancelled: () => ipcRenderer.send('cli-processing-cancelled'),

  // Generic invoke for other IPC calls
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
})

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']): Promise<boolean> {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  }
}

function useLoading(): { appendLoading: () => void; removeLoading: () => void } {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    }
  }
}

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)
