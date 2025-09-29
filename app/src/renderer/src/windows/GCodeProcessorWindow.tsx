// renderer/windows/GCodeProcessorWindow.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { GCodeAnalysisResult, GCodeProcessingReport, GCodeProfile } from '@shared/types/gcode'
import { IpcChannels } from '@shared/constants/ipc'

const steps = ['File Analysis', 'Configuration', 'Processing']

const GCodeProcessorWindow: React.FC = () => {
  const viewRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [filePath, setFilePath] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [analysis, setAnalysis] = useState<GCodeAnalysisResult | null>(null)
  const [profiles, setProfiles] = useState<GCodeProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [processingReport, setProcessingReport] = useState<GCodeProcessingReport | null>(null)
  const [error, setError] = useState<string>('')
  const [completed, setCompleted] = useState(false)
  const [autoProcess, setAutoProcess] = useState(false)

  // Filter controls based on detected analysis
  const [brandFilterEnabled, setBrandFilterEnabled] = useState<boolean>(true)
  const [modelFilterEnabled, setModelFilterEnabled] = useState<boolean>(true)

  // Settings
  const [safetyFactor] = useState(0.9)
  const [enableESP] = useState(true)
  const [generateReport] = useState(true)
  const [backupOriginal] = useState(true)

  // Listen for CLI mode initialization
  useEffect(() => {
    const unsubscribe = window.electronAPI.onCliModeInit(async (data) => {
      console.log('CLI Mode initialized with file:', data.filePath)
      setFilePath(data.filePath)
      setFileName(data.filePath.split(/[\\/]/).pop() || '')

      await loadProfiles()

      if (data.profileId) {
        setSelectedProfile(data.profileId)
        setAutoProcess(true)
      }

      await analyzeFile(data.filePath)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect
        window.electronAPI.invoke(IpcChannels.WINDOW_RESIZE, { height })
      }
    })

    if (viewRef.current) {
      observer.observe(viewRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [activeStep])

  const loadProfiles = async (): Promise<GCodeProfile[]> => {
    try {
      const result = await window.electronAPI.getGCodeProfiles()
      if (result.success && result.data) {
        setProfiles(result.data)
        return result.data
      } else {
        setError('Failed to load printer profiles')
        return []
      }
    } catch (err) {
      console.error('Failed to load profiles:', err)
      setError('Failed to load printer profiles')
      return []
    }
  }

  const analyzeFile = async (path: string): Promise<void> => {
    setProcessing(true)
    setActiveStep(0)

    try {
      const result = await window.electronAPI.analyzeGCode(path)

      if (result.success && result.data) {
        setAnalysis(result.data)

        // Enable filters only if there is a detected brand/model
        setBrandFilterEnabled(Boolean(result.data.brand))
        setModelFilterEnabled(Boolean(result.data.printer))

        // Move to configuration step
        setActiveStep(1)
      } else {
        setError(result.error || 'Analysis failed')
        // In CLI mode, treat as failure (not user cancellation)
        window.electronAPI.notifyCliProcessingComplete(false)
      }
    } catch (err) {
      setError(`Analysis failed: ${err}`)
      // In CLI mode, treat as failure (not user cancellation)
      window.electronAPI.notifyCliProcessingComplete(false)
    } finally {
      setProcessing(false)
    }
  }

  // Auto-start processing only when explicitly requested
  useEffect(() => {
    if (
      autoProcess &&
      filePath &&
      activeStep === 1 &&
      selectedProfile &&
      !processing &&
      !completed
    ) {
      const t = setTimeout(() => handleProcess(), 300)
      return () => clearTimeout(t)
    }
  }, [autoProcess, filePath, activeStep, selectedProfile, processing, completed])

  // Compute filtered profile list based on detected brand/model and enabled filters
  const filteredProfiles = useMemo(() => {
    if (!profiles || profiles.length === 0) return []
    let filtered = profiles

    if (analysis && brandFilterEnabled && analysis.brand) {
      filtered = filtered.filter((p) => p.manufacturer === analysis.brand)
    }
    if (analysis && modelFilterEnabled && analysis.printer) {
      filtered = filtered.filter((p) => p.model === analysis.printer)
    }

    return filtered
  }, [profiles, analysis, brandFilterEnabled, modelFilterEnabled])

  // Auto-select profile if only one remains after filtering
  useEffect(() => {
    if (activeStep === 1) {
      if (filteredProfiles.length === 1) {
        setSelectedProfile(filteredProfiles[0].id)
      } else if (!filteredProfiles.find((p) => p.id === selectedProfile)) {
        // Deselect if current selection not in filtered list
        setSelectedProfile('')
      }
    }
  }, [filteredProfiles, activeStep])

  const handleProcess = async (): Promise<void> => {
    if (!filePath || !selectedProfile) {
      setError('Missing required configuration')
      return
    }

    setProcessing(true)
    setActiveStep(2)

    try {
      // Determine output path
      const outputPath = filePath.replace(/\.gcode$/i, '_optimized.gcode')

      const result = await window.electronAPI.processGCodeFile(filePath, {
        outputPath,
        profileId: selectedProfile,
        backupOriginal,
        generateReport,
        espEnabled: enableESP,
        safetyFactor
      })

      if (result.success && result.data) {
        setProcessingReport(result.data)
        setCompleted(true)

        // Notify main process of successful completion
        setTimeout(() => {
          window.electronAPI.notifyCliProcessingComplete(true)
        }, 2000) // Show success for 2 seconds before closing
      } else {
        setError(result.error || 'Processing failed')
        // In CLI mode, treat as failure (not user cancellation)
        window.electronAPI.notifyCliProcessingComplete(false)
      }
    } catch (err) {
      setError(`Processing failed: ${err}`)
      // In CLI mode, treat as failure (not user cancellation)
      window.electronAPI.notifyCliProcessingComplete(false)
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = (): void => {
    // Notify main process of cancellation
    window.electronAPI.notifyCliProcessingCancelled()
  }

  return (
    <Box
      ref={viewRef}
      sx={{
        bgcolor: '#1e1e1e',
        p: 3,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff' }}>
          G-code Optimization Tool
        </Typography>
        <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>
          Two-Stage Purge Injection
        </Typography>
      </Box>

      {/* File info */}
      {fileName && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Chip label={fileName} sx={{ bgcolor: '#2d2d2d', color: '#fff' }} />
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Progress Stepper */}
      <Card sx={{ bgcolor: '#2d2d2d', mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label} completed={activeStep > index}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card sx={{ bgcolor: '#2d2d2d', flex: 1 }}>
        <CardContent>
          {/* Step 0: Analysis */}
          {activeStep === 0 && (
            <Box>
              {processing ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="h6">Analyzing G-code...</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detecting printer profile and filament changes
                  </Typography>
                </Box>
              ) : analysis ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Analysis Complete
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Paper sx={{ p: 2, bgcolor: '#252526' }}>
                        <Typography variant="body2">
                          <strong>Detected Printer:</strong> {analysis.brand || 'Unknown'}{' '}
                          {analysis.printer || ''}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Paper sx={{ p: 2, bgcolor: '#252526' }}>
                        <Typography variant="body2">
                          <strong>Tool Changes:</strong> {analysis.toolChanges}
                        </Typography>
                        {analysis.spools && analysis.spools.length > 0 && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Spools:</strong>{' '}
                            {analysis.spools
                              .map((s) => `T${s.tool}(${s.plastic || 'Unknown'})`)
                              .join(', ')}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              ) : null}
            </Box>
          )}

          {/* Step 1: Configuration */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Select Printer Profile
              </Typography>

              {/* Detected brand/model and filter controls */}
              {analysis && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity={analysis.brand ? 'info' : 'warning'} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Detected: <strong>{analysis.brand || 'Unknown brand'}</strong>
                      {analysis.printer ? ` ${analysis.printer}` : ''}
                    </Typography>
                  </Alert>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analysis.brand && (
                      <Chip
                        color={brandFilterEnabled ? 'primary' : 'default'}
                        variant={brandFilterEnabled ? 'filled' : 'outlined'}
                        label={`Brand filter: ${analysis.brand}`}
                        onDelete={
                          brandFilterEnabled
                            ? () => {
                                const ok = window.confirm(
                                  'Removing the brand filter is strongly discouraged. Using a profile from a different brand may inject incompatible commands. Continue anyway?'
                                )
                                if (ok) setBrandFilterEnabled(false)
                              }
                            : undefined
                        }
                      />
                    )}
                    {analysis.printer && (
                      <Chip
                        color={modelFilterEnabled ? 'primary' : 'default'}
                        variant={modelFilterEnabled ? 'filled' : 'outlined'}
                        label={`Model filter: ${analysis.printer}`}
                        onDelete={
                          modelFilterEnabled
                            ? () => {
                                const ok = window.confirm(
                                  'Removing the model filter can lead to suboptimal behavior. Prefer matching the detected model. Continue anyway?'
                                )
                                if (ok) setModelFilterEnabled(false)
                              }
                            : undefined
                        }
                      />
                    )}
                    {(analysis.brand || analysis.printer) &&
                      (!brandFilterEnabled || !modelFilterEnabled) && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            setBrandFilterEnabled(Boolean(analysis.brand))
                            setModelFilterEnabled(Boolean(analysis.printer))
                          }}
                        >
                          Restore filters
                        </Button>
                      )}
                  </Box>

                  {!brandFilterEnabled && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Selecting a profile from a different brand is likely incorrect and may break
                      injection logic.
                    </Alert>
                  )}
                </Box>
              )}

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Printer Profile</InputLabel>
                <Select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  label="Printer Profile"
                >
                  {(filteredProfiles.length > 0 ? filteredProfiles : profiles).map((profile) => (
                    <MenuItem key={profile.id} value={profile.id}>
                      {profile.name} ({profile.manufacturer})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {filteredProfiles.length === 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No profiles match the detected brand/model filters. You can remove a filter above
                  to select a different profile (not recommended).
                </Alert>
              )}

              {analysis && analysis.toolChanges > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    • {analysis.toolChanges} tool changes detected
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="outlined" onClick={handleCancel} startIcon={<CancelIcon />}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleProcess}
                  disabled={!selectedProfile}
                  startIcon={<SaveIcon />}
                >
                  Process & Save
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 2: Processing */}
          {activeStep === 2 && (
            <Box>
              {processing ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="h6">Processing G-code...</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Injecting two-stage purge sequences
                  </Typography>
                  <LinearProgress sx={{ mt: 2, width: '60%', mx: 'auto' }} />
                </Box>
              ) : completed && processingReport ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Processing Complete!
                  </Typography>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Optimized {processingReport.totalChanges} filament changes
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Saved {processingReport.savingsPercent.toFixed(1)}% waste
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 2, display: 'block' }}
                    >
                      Closing automatically...
                    </Typography>
                  </Box>
                </Box>
              ) : null}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default GCodeProcessorWindow
