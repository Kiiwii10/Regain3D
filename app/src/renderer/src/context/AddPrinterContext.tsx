import React, { createContext, useContext, useState, ReactNode } from 'react'
import { PrinterConfig } from '@shared/types/printer'

interface AddPrinterWizardState {
  step: number
  printerConfig: Partial<PrinterConfig>
  setStep: (step: number) => void
  setPrinterConfig: (config: Partial<PrinterConfig>) => void
  updatePrinterConfig: (update: Partial<PrinterConfig>) => void
  resetWizard: () => void
}

const AddPrinterWizardContext = createContext<AddPrinterWizardState | undefined>(undefined)

export const AddPrinterWizardProvider = ({ children }: { children: ReactNode }) => {
  const [step, setStep] = useState(0)
  const [printerConfig, setPrinterConfig] = useState<Partial<PrinterConfig>>({})

  const updatePrinterConfig = (update: Partial<PrinterConfig>) => {
    setPrinterConfig((prev) => ({ ...prev, ...update }))
  }

  const resetWizard = () => {
    setStep(0)
    setPrinterConfig({})
  }

  const value = {
    step,
    printerConfig,
    setStep,
    setPrinterConfig,
    updatePrinterConfig,
    resetWizard
  }

  return (
    <AddPrinterWizardContext.Provider value={value}>{children}</AddPrinterWizardContext.Provider>
  )
}

export const useAddPrinterWizard = () => {
  const context = useContext(AddPrinterWizardContext)
  if (context === undefined) {
    throw new Error('useAddPrinterWizard must be used within a AddPrinterWizardProvider')
  }
  return context
}
