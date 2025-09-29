import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@renderer/App'
import '@renderer/index.css'
import { AddPrinterWizardProvider } from '@renderer/context/AddPrinterContext'
import { PrinterProvider } from '@renderer/context/PrinterContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PrinterProvider>
      <AddPrinterWizardProvider>
        <App />
      </AddPrinterWizardProvider>
    </PrinterProvider>
  </React.StrictMode>
)

postMessage({ payload: 'removeLoading' }, '*')
