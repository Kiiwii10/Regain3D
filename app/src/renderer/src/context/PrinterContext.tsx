import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react'
import { DiscoveredPrinter, PrinterConfig } from '@shared/types/printer'

interface PrinterContextType {
  discoveredPrinters: DiscoveredPrinter[]
  configuredPrinters: PrinterConfig[]
  addConfiguredPrinter: (printer: PrinterConfig) => void
  removeConfiguredPrinter: (id: string) => void
  refreshConfiguredPrinters: () => Promise<void>
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined)

export const usePrinterContext = (): PrinterContextType => {
  const context = useContext(PrinterContext)
  if (!context) {
    throw new Error('usePrinterContext must be used within a PrinterProvider')
  }
  return context
}

interface PrinterProviderProps {
  children: ReactNode
}

export const PrinterProvider: React.FC<PrinterProviderProps> = ({ children }) => {
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([])
  const [configuredPrinters, setConfiguredPrinters] = useState<PrinterConfig[]>([])

  // Fetch configured printers
  const refreshConfiguredPrinters = useCallback(async () => {
    if (window.electronAPI) {
      const printers = await window.electronAPI.getAllPrinters()
      setConfiguredPrinters(printers)
    }
  }, [])

  useEffect(() => {
    // On mount, try to connect all printers once, then fetch
    ;(async () => {
      try {
        const connected = await window.electronAPI.connectAllPrinters?.()
        if (connected && Array.isArray(connected)) {
          setConfiguredPrinters(connected)
        } else {
          await refreshConfiguredPrinters()
        }
      } catch {
        await refreshConfiguredPrinters()
      }
    })()
  }, [refreshConfiguredPrinters])

  // Listen for printer config changes pushed from main and refresh
  useEffect(() => {
    const unsub = window.electronAPI?.onPrinterConfigsChanged?.(() => {
      // Only refresh list; do not trigger connect here to avoid loops
      refreshConfiguredPrinters()
    })
    return () => {
      if (unsub) unsub()
    }
  }, [refreshConfiguredPrinters])

  const addConfiguredPrinter = (printer: PrinterConfig): void => {
    setConfiguredPrinters((prev) => [...prev, printer])
  }

  const removeConfiguredPrinter = (id: string): void => {
    setConfiguredPrinters((prev) => prev.filter((p) => p.id !== id))
  }

  useEffect(() => {
    window.electronAPI.startDiscovery()

    const handleDeviceFound = (printer: DiscoveredPrinter): void => {
      setDiscoveredPrinters((prev) => {
        if (!prev.find((p) => p.serial === printer.serial)) {
          return [...prev, printer]
        }
        return prev
      })
    }

    const handleDeviceLost = (printer: DiscoveredPrinter): void => {
      setDiscoveredPrinters((prev) => prev.filter((p) => p.serial !== printer.serial))
    }

    const onDeviceFoundUnsubscribe = window.electronAPI.onDeviceFound(handleDeviceFound)
    const onDeviceLostUnsubscribe = window.electronAPI.onDeviceLost(handleDeviceLost)

    return () => {
      window.electronAPI.stopDiscovery()
      if (onDeviceFoundUnsubscribe) onDeviceFoundUnsubscribe()
      if (onDeviceLostUnsubscribe) onDeviceLostUnsubscribe()
    }
  }, [])

  const value = {
    discoveredPrinters,
    configuredPrinters,
    addConfiguredPrinter,
    removeConfiguredPrinter,
    refreshConfiguredPrinters
  }

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
}
