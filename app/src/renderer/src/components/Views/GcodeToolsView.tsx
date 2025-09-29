import React, { useState, useEffect } from 'react'
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
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Code as CodeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { GCodeAnalysisResult, GCodeProfile, GCodeProcessingReport } from '@shared/types/gcode'

const steps = ['Upload File', 'Analysis', 'Configuration', 'Process & Save']

const GcodeToolsView: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string>('')
  const [analysis, setAnalysis] = useState<GCodeAnalysisResult | null>(null)
  const [profiles, setProfiles] = useState<GCodeProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [processingReport, setProcessingReport] = useState<GCodeProcessingReport | null>(null)
  const [error, setError] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Advanced settings
  const [safetyFactor, setSafetyFactor] = useState(0.9)
  const [enableESP, setEnableESP] = useState(true)
  const [generateReport, setGenerateReport] = useState(true)
  const [backupOriginal, setBackupOriginal] = useState(true)

  // Load available profiles on mount
  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const result = await window.electronAPI.getGCodeProfiles()
      if (result.success && result.data) {
        setProfiles(result.data)

        // Auto-select profile if analysis already detected one
        if (analysis && !selectedProfile) {
          const matching = result.data.find(
            (p) => p.manufacturer === analysis.brand && p.model === analysis.printer
          )
          if (matching) {
            setSelectedProfile(matching.id)
          }
        }
      } else {
        setError('Failed to load printer profiles')
      }
    } catch (err) {
      console.error('Failed to load profiles:', err)
      setError('Failed to load printer profiles')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && /\.gcode$/i.test(file.name)) {
      setSelectedFile(file)
      setSelectedFilePath(file.path || '')
      setError('')
      setProcessingReport(null)

      // Ensure profiles are loaded before analysis
      if (profiles.length === 0) {
        await loadProfiles()
      }

      // Automatically move to analysis
      await analyzeFile(file.path || '')
    } else {
      setError('Please select a .gcode file')
    }
  }

  const analyzeFile = async (filePath: string) => {
    setProcessing(true)
    setActiveStep(1)

    try {
      const result = await window.electronAPI.analyzeGCode(filePath)

      if (result.success && result.data) {
        setAnalysis(result.data)

        // Auto-select profile if detected
        if (result.data.brand && result.data.printer) {
          const matchingProfile = profiles.find(
            (p) => p.manufacturer === result.data.brand && p.model === result.data.printer
          )
          if (matchingProfile) {
            setSelectedProfile(matchingProfile.id)
          }
        }

        setActiveStep(2)
      } else {
        setError(result.error || 'Analysis failed')
      }
    } catch (err) {
      setError(`Analysis failed: ${err}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleProcess = async () => {
    if (!selectedFilePath) return
    if (!selectedProfile) {
      setError('Please select a printer profile')
      return
    }

    setProcessing(true)
    setActiveStep(3)

    try {
      // Determine output path
      const outputPath = selectedFilePath.replace(/\.gcode$/i, '_optimized.gcode')

      const result = await window.electronAPI.processGCodeFile(selectedFilePath, {
        outputPath,
        profileId: selectedProfile,
        backupOriginal,
        generateReport,
        espEnabled: enableESP,
        safetyFactor
      })

      if (result.success && result.data) {
        setProcessingReport(result.data)
      } else {
        setError(result.error || 'Processing failed')
      }
    } catch (err) {
      setError(`Processing failed: ${err}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setActiveStep(0)
    setSelectedFile(null)
    setSelectedFilePath('')
    setAnalysis(null)
    setProcessingReport(null)
    setError('')
    setSelectedProfile('')
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          G-code Injection Tool
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh profiles">
            <IconButton onClick={loadProfiles} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Advanced settings">
            <IconButton onClick={() => setShowAdvanced(!showAdvanced)} size="small">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
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

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <Card sx={{ bgcolor: '#2d2d2d', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advanced Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Safety Factor"
                  type="number"
                  value={safetyFactor}
                  onChange={(e) => setSafetyFactor(Number(e.target.value))}
                  inputProps={{ min: 0.85, max: 0.95, step: 0.01 }}
                  helperText="0.85-0.95 (default: 0.9)"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>ESP Commands</InputLabel>
                  <Select
                    value={enableESP ? 'enabled' : 'disabled'}
                    onChange={(e) => setEnableESP(e.target.value === 'enabled')}
                    label="ESP Commands"
                  >
                    <MenuItem value="enabled">Enabled</MenuItem>
                    <MenuItem value="disabled">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Generate Report</InputLabel>
                  <Select
                    value={generateReport ? 'yes' : 'no'}
                    onChange={(e) => setGenerateReport(e.target.value === 'yes')}
                    label="Generate Report"
                  >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Backup Original</InputLabel>
                  <Select
                    value={backupOriginal ? 'yes' : 'no'}
                    onChange={(e) => setBackupOriginal(e.target.value === 'yes')}
                    label="Backup Original"
                  >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card sx={{ bgcolor: '#2d2d2d' }}>
        <CardContent>
          {/* Step 0: Upload */}
          {activeStep === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload G-code File
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a .gcode file to begin the two-stage purge injection process
              </Typography>

              <input
                accept=".gcode,.GCODE"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                  size="large"
                >
                  Select File
                </Button>
              </label>

              {selectedFile && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
                    onDelete={() => setSelectedFile(null)}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Step 1: Analysis */}
          {activeStep === 1 && (
            <Box>
              {processing ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="h6">Analyzing G-code...</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Detecting printer profile and filament changes
                  </Typography>
                </Box>
              ) : (
                analysis && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Analysis Complete
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      File analyzed successfully. Review the details below.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ p: 2, bgcolor: '#252526' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            File Information
                          </Typography>
                          <Typography variant="body2">
                            <strong>Name:</strong> {selectedFile?.name}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Size:</strong>{' '}
                            {selectedFile && formatFileSize(selectedFile.size)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Detected Printer:</strong> {analysis.brand || 'Unknown'}{' '}
                            {analysis.printer || ''}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ p: 2, bgcolor: '#252526' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Print Statistics
                          </Typography>
                          <Typography variant="body2">
                            <strong>Tool Changes:</strong> {analysis.toolChanges}
                          </Typography>
                          {analysis.spools.length > 0 && (
                            <Typography variant="body2">
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
                )
              )}
            </Box>
          )}

          {/* Step 2: Configuration */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select the printer profile for optimized two-stage purging
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Printer Profile</InputLabel>
                <Select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  label="Printer Profile"
                >
                  {profiles.map((profile) => (
                    <MenuItem key={profile.id} value={profile.id}>
                      <Box>
                        <Typography variant="body1">{profile.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {profile.manufacturer} {profile.model}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {analysis && analysis.toolChanges > 0 && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">Detected Usage</Typography>
                  <Typography variant="body2">
                    • {analysis.toolChanges} tool changes will be optimized
                  </Typography>
                  {analysis.spools.length > 0 && (
                    <Typography variant="body2">
                      • Spools:{' '}
                      {analysis.spools
                        .map((s) => `T${s.tool}(${s.plastic || 'Unknown'})`)
                        .join(', ')}
                    </Typography>
                  )}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => setActiveStep(1)}>
                  Back
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

          {/* Step 3: Processing & Results */}
          {activeStep === 3 && (
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
              ) : processingReport ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Processing Complete!</Typography>
                    <Typography variant="body2">
                      Successfully optimized {processingReport.totalChanges} filament changes
                    </Typography>
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 2, bgcolor: '#252526' }}>
                        <Typography
                          variant="subtitle2"
                          gutterBottom
                          sx={{ display: 'flex', alignItems: 'center' }}
                        >
                          <AnalyticsIcon sx={{ mr: 1 }} />
                          Optimization Summary
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Original Waste:</strong>{' '}
                            {processingReport.originalWaste.toFixed(2)}g
                          </Typography>
                          <Typography variant="body2">
                            <strong>Optimized Waste:</strong>{' '}
                            {processingReport.optimizedWaste.toFixed(2)}g
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            <strong>Total Savings:</strong>{' '}
                            {processingReport.savingsPercent.toFixed(1)}%
                          </Typography>
                          <Typography variant="body2">
                            <strong>Processing Time:</strong>{' '}
                            {formatDuration(processingReport.executionTime)}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 2, bgcolor: '#252526' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Output Files
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <CheckIcon sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                            Optimized G-code saved
                          </Typography>
                          {backupOriginal && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <CheckIcon sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                              Original backed up
                            </Typography>
                          )}
                          {generateReport && (
                            <Typography variant="body2">
                              <CheckIcon sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                              Report generated
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Purge Details Table */}
                  <Paper sx={{ mt: 3, p: 2, bgcolor: '#252526' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Purge Details by Change
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Change #</TableCell>
                            <TableCell>From Tool</TableCell>
                            <TableCell>To Tool</TableCell>
                            <TableCell>Pure Purge (mm)</TableCell>
                            <TableCell>Mixed Purge (mm)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {processingReport.purgeDetails.map((detail) => (
                            <TableRow key={detail.changeNumber}>
                              <TableCell>{detail.changeNumber}</TableCell>
                              <TableCell>{detail.fromTool}</TableCell>
                              <TableCell>{detail.toTool}</TableCell>
                              <TableCell>{detail.purePurge.toFixed(2)}</TableCell>
                              <TableCell>{detail.mixedPurge.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                    <Button variant="contained" onClick={handleReset}>
                      Process Another File
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        // Open file location
                        if (processingReport.outputFile) {
                          window.electronAPI.showItemInFolder(processingReport.outputFile)
                        }
                      }}
                    >
                      Show in Folder
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Alert severity="error">
                  Processing failed. Please check the error message and try again.
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default GcodeToolsView
