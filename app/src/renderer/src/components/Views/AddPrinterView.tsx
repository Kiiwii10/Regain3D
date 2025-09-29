import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  TextField,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  FormGroup,
  FormControl,
  Alert,
  ListItemButton
} from '@mui/material'
import {
  DiscoveredPrinter,
  PrinterConfig,
  PrinterConfigSchema,
  ValidationPayload
} from '@shared/types/printer'
import { useAddPrinterWizard } from '@renderer/context/AddPrinterContext'
import { usePrinterContext } from '@renderer/context/PrinterContext'
import { ActiveView } from '@renderer/types/ui'
import { useDebouncedCallback } from 'use-debounce'
import { IpcChannels } from '@shared/constants/ipc'

interface AddPrinterViewProps {
  onViewChange: (view: ActiveView) => void
}

const AddPrinterView: React.FC<AddPrinterViewProps> = ({ onViewChange }) => {
  const { step, setStep, printerConfig, updatePrinterConfig, resetWizard } = useAddPrinterWizard()
  const { discoveredPrinters, addConfiguredPrinter } = usePrinterContext()

  // Local state for the wizard view
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [connectionSchema, setConnectionSchema] = useState<PrinterConfigSchema | null>(null)
  const [connectionDetails, setConnectionDetails] = useState({})
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [printerBrandsAndModels, setPrinterBrandsAndModels] = useState<Record<string, string[]>>({})
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState(false)
  // State to hold the transient access code after validation
  const [validatedAccessCode, setValidatedAccessCode] = useState<string | null>(null)
  const [nameWarning, setNameWarning] = useState<string | null>(null)

  // --- API Calls ---

  const checkName = useDebouncedCallback(async (name: string) => {
    if (window.electronAPI && name) {
      const exists = await window.electronAPI.checkPrinterName(name)
      if (exists) {
        setNameWarning(`A printer named "${name}" already exists. You can still use this name.`)
      } else {
        setNameWarning(null)
      }
    }
  }, 500)

  // Load printer brands and models on component mount
  useEffect(() => {
    const loadPrinterData = async () => {
      if (window.electronAPI) {
        try {
          const data = await window.electronAPI.invoke(IpcChannels.PRINTER_GET_BRANDS_AND_MODELS)
          setPrinterBrandsAndModels(data)
        } catch (error) {
          console.error('Failed to load printer brands and models:', error)
        }
      }
    }

    loadPrinterData()
  }, [])

  useEffect(() => {
    if (step === 1 && printerConfig.brand && printerConfig.model) {
      if (window.electronAPI) {
        window.electronAPI
          .getPrinterConfigSchema({
            brand: printerConfig.brand,
            model: printerConfig.model
          })
          .then(setConnectionSchema)
      }
    }
  }, [step, printerConfig.brand, printerConfig.model])

  const handleConnectionDetailChange = (key: string, value: string): void => {
    setConnectionDetails((prev) => ({ ...prev, [key]: value }))
  }

  const handleTestConnection = async (): Promise<void> => {
    setIsTestingConnection(true)
    setConnectionError(null)
    setConnectionSuccess(false)

    try {
      if (window.electronAPI) {
        const accessCode = connectionDetails['accessCode']
        const configToValidate: ValidationPayload = {
          ...printerConfig,
          accessCode: accessCode,
          connectionConfig: {
            ...printerConfig.connectionConfig,
            ipAddress: connectionDetails['ipAddress'] || printerConfig.connectionConfig?.ipAddress,
            serialNumber:
              connectionDetails['serialNumber'] || printerConfig.connectionConfig?.serialNumber
          }
        }

        const validatedConfig = await window.electronAPI.validatePrinter(configToValidate)
        updatePrinterConfig(validatedConfig) // Store the validated config (without access code)
        setValidatedAccessCode(accessCode) // Store the access code separately for the final save
        setConnectionSuccess(true)
      }
    } catch (error: unknown) {
      setConnectionError(error instanceof Error ? error.message : 'An unknown error occurred.')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSavePrinter = async (): Promise<void> => {
    if (window.electronAPI) {
      try {
        // Re-combine the config with the validated access code for the save operation
        const finalConfig = { ...printerConfig, accessCode: validatedAccessCode }
        const newPrinter = await window.electronAPI.addPrinter(finalConfig as PrinterConfig)
        addConfiguredPrinter(newPrinter) // Add to the global state
        resetWizard()
        onViewChange('dashboard')
      } catch (error: unknown) {
        console.error(error instanceof Error ? error.message : 'An unknown error occurred.')
        // TODO: Show an error to the user
      }
    }
  }

  const handleCancel = (): void => {
    resetWizard()
    onViewChange('dashboard')
  }

  // --- Step Transitions ---

  const handleDiscoveredSelect = (p: DiscoveredPrinter): void => {
    updatePrinterConfig({
      brand: p.brand,
      model: p.model,
      name: p.name,
      connectionConfig: {
        ipAddress: p.ip,
        serialNumber: p.serial
      }
    })
    setStep(1) // Move to Connection Details
  }

  const handleManualAdd = (): void => {
    updatePrinterConfig({
      brand: selectedBrand,
      model: selectedModel,
      name: `${selectedBrand} ${selectedModel}`
    })
    setStep(1) // Move to Connection Details
  }

  // --- Render Functions ---

  const renderStepOne = (): React.ReactNode => (
    <Box sx={{ display: 'flex', gap: 4, height: '100%' }}>
      {/* Left Side: Discovery */}
      <Box sx={{ flex: 1, borderRight: 1, borderColor: 'divider', pr: 4 }}>
        <Typography variant="h5" gutterBottom>
          Discovered Printers
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Printers found on your local network will appear here automatically.
        </Typography>
        {discoveredPrinters.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Scanning for printers...</Typography>
          </Box>
        ) : (
          <List>
            {discoveredPrinters.map((p) => (
              <ListItem key={p.serial} disablePadding>
                <ListItemButton onClick={() => handleDiscoveredSelect(p)}>
                  <ListItemText primary={p.name} secondary={`${p.model} - ${p.ip}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Right Side: Manual Add */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h5" gutterBottom>
          Add Manually
        </Typography>
        <TextField
          select
          label="Brand"
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value)
            setSelectedModel('') // Reset model when brand changes
          }}
          fullWidth
          sx={{ mb: 2 }}
        >
          {Object.keys(printerBrandsAndModels).map((brand) => (
            <MenuItem key={brand} value={brand}>
              {brand === 'bambu' ? 'Bambu Lab' : brand.charAt(0).toUpperCase() + brand.slice(1)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Model"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          fullWidth
          disabled={!selectedBrand}
          sx={{ mb: 2 }}
        >
          {!selectedBrand && <MenuItem value="">Select a brand first</MenuItem>}
          {selectedBrand &&
            printerBrandsAndModels[selectedBrand]?.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
        </TextField>
        <Button
          variant="contained"
          disabled={!selectedBrand || !selectedModel}
          onClick={handleManualAdd}
        >
          Add Manually
        </Button>
      </Box>
    </Box>
  )

  const renderStepTwo = (): React.ReactNode => {
    const isDiscovered = !!printerConfig.connectionConfig?.serialNumber

    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Connection Details for {printerConfig.name}
        </Typography>
        <FormGroup>
          {/* IP Address Field */}
          <FormControl sx={{ mb: 2 }}>
            <TextField
              label="IP Address"
              value={
                connectionDetails['ipAddress'] || printerConfig.connectionConfig?.ipAddress || ''
              }
              onChange={(e) => handleConnectionDetailChange('ipAddress', e.target.value.trim())}
              disabled={isDiscovered}
            />
          </FormControl>

          {/* Serial Number Field */}
          <FormControl sx={{ mb: 2 }}>
            <TextField
              label="Serial Number"
              value={
                connectionDetails['serialNumber'] ||
                printerConfig.connectionConfig?.serialNumber ||
                ''
              }
              onChange={(e) => handleConnectionDetailChange('serialNumber', e.target.value.trim())}
              disabled={isDiscovered}
              helperText={
                !isDiscovered ? 'Found on the printer settings screen or in Bambu Handy.' : ''
              }
            />
          </FormControl>

          {/* Access Code Field */}
          {connectionSchema && (
            <FormControl sx={{ mb: 2 }}>
              <TextField
                label="Access Code"
                value={connectionDetails['accessCode'] || ''}
                onChange={(e) => handleConnectionDetailChange('accessCode', e.target.value.trim())}
                helperText="Found on the printer's network settings screen. This code changes periodically."
              />
            </FormControl>
          )}
        </FormGroup>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button onClick={() => setStep(0)}>Back</Button>
          <Button variant="contained" onClick={handleTestConnection} disabled={isTestingConnection}>
            {isTestingConnection ? <CircularProgress size={24} /> : 'Test Connection'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!connectionSuccess}
            onClick={() => setStep(2)}
          >
            Next
          </Button>
        </Box>
        {connectionError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {connectionError}
          </Alert>
        )}
        {connectionSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Connection successful! You can now proceed.
          </Alert>
        )}
      </Box>
    )
  }

  const renderStepThree = (): React.ReactNode => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Configuration & Personalization
      </Typography>
      <TextField
        label="Printer Name"
        value={printerConfig.name || ''}
        onChange={(e) => {
          updatePrinterConfig({ name: e.target.value })
          checkName(e.target.value)
        }}
        fullWidth
        sx={{ mb: 2 }}
        helperText={nameWarning}
        error={!!nameWarning}
        FormHelperTextProps={{
          sx: { color: nameWarning ? 'warning.main' : 'text.secondary' }
        }}
      />
      <TextField
        label="Nozzle Size (mm)"
        type="number"
        value={printerConfig.nozzleSizeMm || 0.4}
        onChange={(e) => updatePrinterConfig({ nozzleSizeMm: parseFloat(e.target.value) })}
        fullWidth
        sx={{ mb: 2 }}
      />
      {/* TODO: Implement a proper tag input component */}
      <TextField label="Tags (coming soon)" disabled fullWidth sx={{ mb: 2 }} />
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button onClick={() => setStep(1)}>Back</Button>
        <Button variant="contained" onClick={() => setStep(3)}>
          Next
        </Button>
      </Box>
    </Box>
  )

  const renderStepFour = (): React.ReactNode => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Summary
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary="Name" secondary={printerConfig.name} />
        </ListItem>
        <ListItem>
          <ListItemText primary="Brand" secondary={printerConfig.brand} />
        </ListItem>
        <ListItem>
          <ListItemText primary="Model" secondary={printerConfig.model} />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="IP Address"
            secondary={printerConfig.connectionConfig?.ipAddress}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Serial Number"
            secondary={printerConfig.connectionConfig?.serialNumber}
          />
        </ListItem>
        <ListItem>
          <ListItemText primary="Nozzle Size" secondary={`${printerConfig.nozzleSizeMm} mm`} />
        </ListItem>
      </List>
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button onClick={() => setStep(2)}>Back</Button>
        <Button variant="contained" onClick={handleSavePrinter}>
          Save Printer
        </Button>
      </Box>
    </Box>
  )

  const steps = ['Discovery', 'Connection', 'Configuration', 'Summary']

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Add a New Printer
        </Typography>
        <Button onClick={handleCancel}>Cancel</Button>
      </Box>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ flex: 1 }}>
        {step === 0 && renderStepOne()}
        {step === 1 && renderStepTwo()}
        {step === 2 && renderStepThree()}
        {step === 3 && renderStepFour()}
      </Box>
    </Box>
  )
}

export default AddPrinterView
