import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Stack,
  FormControlLabel,
  Checkbox
} from '@mui/material'
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as ProvisionIcon,
  Link as AssignIcon,
  LinkOff as UnassignIcon,
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as IdentifyIcon
} from '@mui/icons-material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import { IpcChannels } from '@shared/constants/ipc'
import { DiscoveredESP, ESPConfig, ApplicationConfig } from '@shared/types/esp'
import { PrinterConfig } from '@shared/types/printer'

interface ESPsViewProps {
  selectedESP: string | null
}

const ESPsView: React.FC<ESPsViewProps> = ({ selectedESP }) => {
  // State for ESP devices
  const [discoveredESPs, setDiscoveredESPs] = useState<DiscoveredESP[]>([])
  const [configuredESPs, setConfiguredESPs] = useState<ESPConfig[]>([])
  const [isDiscoveryActive, setIsDiscoveryActive] = useState(false)
  const [loading, setLoading] = useState(true)

  // State for dialogs
  const [provisionDialog, setProvisionDialog] = useState<{
    open: boolean
    esp: DiscoveredESP | null
  }>({ open: false, esp: null })
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; esp: ESPConfig | null }>({
    open: false,
    esp: null
  })

  // State for provisioning form
  const [provisioningForm, setProvisioningForm] = useState({
    selectedPrinterId: ''
  })

  // State for printer selection filters
  const [printerFilters, setPrinterFilters] = useState({
    searchText: '',
    selectedBrand: '',
    selectedModel: '',
    selectedTags: [] as string[]
  })
  const [filteredPrinters, setFilteredPrinters] = useState<PrinterConfig[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provisioningError, setProvisioningError] = useState<string | null>(null)

  // State for assignment
  const [availablePrinters, setAvailablePrinters] = useState<PrinterConfig[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [brandFirmwareMap, setBrandFirmwareMap] = useState<Record<string, boolean>>({})
  const [espOnlineMap, setEspOnlineMap] = useState<Record<string, boolean>>({})

  const handleIdentify = async (ip: string, action: 'start' | 'stop' = 'start') => {
    try {
      if (!window.electronAPI) return
      await window.electronAPI.identifyESP({ ip, action })
    } catch (e) {
      console.error('Failed to trigger identify on ESP:', e)
    }
  }

  // Ref to store unsubscribe functions
  const espUnsubscribeFunctions = useRef<{ onESPFound?: () => void; onESPLost?: () => void }>({})
  const discoveryAutoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadData()
    setupEventListeners()

    return () => {
      cleanupEventListeners()
    }
  }, [])

  // Filter printers when filters change
  useEffect(() => {
    filterPrinters()
  }, [availablePrinters, printerFilters])

  // Update available brands/models when printers change
  useEffect(() => {
    updateFilterOptions()
  }, [availablePrinters])

  // Compute firmware presence per brand for assigned printers
  useEffect(() => {
    const compute = async () => {
      if (!window.electronAPI) return
      const brands = new Set(
        configuredESPs
          .map((esp) => availablePrinters.find((p) => p.id === esp.assignedPrinterId)?.brand)
          .filter((b): b is string => !!b)
      )
      const entries: [string, boolean][] = []
      for (const brand of brands) {
        try {
          const res = await window.electronAPI.getFirmwareForPrinter(brand)
          entries.push([brand, !!res.success])
        } catch {
          entries.push([brand, false])
        }
      }
      setBrandFirmwareMap(Object.fromEntries(entries))
    }
    compute()
  }, [configuredESPs, availablePrinters])

  // Check live online status for configured ESPs
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!window.electronAPI) return
      const statusEntries: [string, boolean][] = []
      for (const esp of configuredESPs) {
        try {
          const online = await window.electronAPI.checkESPReachable({
            ip: esp.ip,
            hostname: esp.hostname,
            name: esp.name,
            isProvisioned: esp.isProvisioned
          } as any)
          statusEntries.push([esp.id, !!online])
        } catch {
          statusEntries.push([esp.id, false])
        }
      }
      if (!cancelled) setEspOnlineMap(Object.fromEntries(statusEntries))
    }
    check()
    return () => {
      cancelled = true
    }
  }, [configuredESPs])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load configured ESPs from database
      if (window.electronAPI) {
        const esps = await window.electronAPI.getAllESPs()
        setConfiguredESPs(esps || [])

        // Load available printers for assignment
        const printers = await window.electronAPI.getAllPrinters()
        setAvailablePrinters(printers || [])
      }
    } catch (error) {
      console.error('Failed to load ESP data:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupEventListeners = () => {
    if (window.electronAPI) {
      // Listen for discovered ESP devices
      const onESPFoundUnsubscribe = window.electronAPI.onESPFound((esp: DiscoveredESP) => {
        setDiscoveredESPs((prev) => {
          const exists = prev.find((e) => e.ip === esp.ip)
          return exists ? prev : [...prev, esp]
        })
      })

      const onESPLostUnsubscribe = window.electronAPI.onESPLost((esp: DiscoveredESP) => {
        setDiscoveredESPs((prev) => prev.filter((e) => e.ip !== esp.ip))
      })

      // Store unsubscribe functions for cleanup
      espUnsubscribeFunctions.current = {
        onESPFound: onESPFoundUnsubscribe,
        onESPLost: onESPLostUnsubscribe
      }

      // Listen to assignment results to refresh view
      const offProgress = window.electronAPI.onESPAssignProgress((_payload) => {
        // Optionally show progress UI later
        // console.log('ESP assign progress', _payload)
      })
      const offResult = window.electronAPI.onESPAssignResult((_payload) => {
        // Refresh configured list on result
        loadData()
      })
      // Listen for any DB-side ESP config changes to refresh seamlessly
      const offConfigsChanged = (window.electronAPI as any).onESPConfigsChanged
        ? (window.electronAPI as any).onESPConfigsChanged(() => {
            loadData()
          })
        : undefined
      // Extend cleanup
      const prev = espUnsubscribeFunctions.current
      espUnsubscribeFunctions.current = {
        ...prev,
        onESPFound: prev.onESPFound,
        onESPLost: prev.onESPLost
      }
      ;(espUnsubscribeFunctions.current as any).onAssignProgress = offProgress
      ;(espUnsubscribeFunctions.current as any).onAssignResult = offResult
      ;(espUnsubscribeFunctions.current as any).onESPConfigsChanged = offConfigsChanged
    }
  }

  const cleanupEventListeners = () => {
    if (espUnsubscribeFunctions.current) {
      if (espUnsubscribeFunctions.current.onESPFound) {
        espUnsubscribeFunctions.current.onESPFound()
      }
      if (espUnsubscribeFunctions.current.onESPLost) {
        espUnsubscribeFunctions.current.onESPLost()
      }
      ;(espUnsubscribeFunctions.current as any).onAssignProgress?.()
      ;(espUnsubscribeFunctions.current as any).onAssignResult?.()
      ;(espUnsubscribeFunctions.current as any).onESPConfigsChanged?.()
    }
  }

  const handleStartDiscovery = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.startESPDiscovery()
        setIsDiscoveryActive(true)
        if (discoveryAutoStopTimer.current) {
          clearTimeout(discoveryAutoStopTimer.current)
          discoveryAutoStopTimer.current = null
        }
        discoveryAutoStopTimer.current = setTimeout(() => {
          if (isDiscoveryActive) {
            handleStopDiscovery()
          }
        }, 60000)
      }
    } catch (error) {
      console.error('Failed to start ESP discovery:', error)
    }
  }

  const handleStopDiscovery = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopESPDiscovery()
        setIsDiscoveryActive(false)
        setDiscoveredESPs([])
        if (discoveryAutoStopTimer.current) {
          clearTimeout(discoveryAutoStopTimer.current)
          discoveryAutoStopTimer.current = null
        }
      }
    } catch (error) {
      console.error('Failed to stop ESP discovery:', error)
    }
  }

  const handleProvision = async () => {
    if (!provisionDialog.esp || !window.electronAPI) return

    const selectedPrinter = getSelectedPrinter()
    if (!selectedPrinter) {
      setProvisioningError('Please select a printer')
      return
    }

    try {
      setIsProvisioning(true)
      setProvisioningError(null)
      console.log('[ESPsView] Provision clicked for:', {
        esp: provisionDialog.esp,
        brand: selectedPrinter.brand,
        model: selectedPrinter.model
      })

      // Get firmware download URL for the selected printer's brand/type
      const firmwareResult = await window.electronAPI.getFirmwareForPrinter(
        selectedPrinter.brand,
        provisionDialog.esp.ip
      )
      console.log('[ESPsView] getFirmwareForPrinter result:', firmwareResult)
      if (!firmwareResult.success || !firmwareResult.firmware) {
        setProvisioningError(`No firmware available for ${selectedPrinter.brand} printers`)
        return
      }

      const config: ApplicationConfig = {
        firmwareUrl: firmwareResult.downloadUrl,
        firmwareMD5: firmwareResult.firmware.md5Hash,
        firmwareSize: firmwareResult.firmware.fileSize,
        apiEndpoint: '',
        PrinterBrand: selectedPrinter.brand as any
      }

      const result = await window.electronAPI.provisionESP({
        espDevice: provisionDialog.esp,
        config,
        assignedPrinter: selectedPrinter
      })
      console.log('[ESPsView] provisionESP result:', result)

      if (result.success) {
        // Refresh from DB and close dialog
        await loadData()
        setProvisionDialog({ open: false, esp: null })

        // Reset form
        setProvisioningForm({
          selectedPrinterId: ''
        })
        setPrinterFilters({
          searchText: '',
          selectedBrand: '',
          selectedModel: '',
          selectedTags: []
        })

        // Remove from discovered list
        setDiscoveredESPs((prev) => prev.filter((esp) => esp.ip !== provisionDialog.esp!.ip))
      } else {
        setProvisioningError(result.error || 'Provisioning failed')
      }
    } catch (error) {
      setProvisioningError(error instanceof Error ? error.message : 'Provisioning failed')
    } finally {
      setIsProvisioning(false)
    }
  }

  const handleAssignToPrinter = async () => {
    if (!assignDialog.esp || !selectedPrinter || !window.electronAPI) return

    try {
      setIsAssigning(true)
      console.log('[ESPsView] Assign clicked for:', {
        esp: assignDialog.esp.id,
        printerId: selectedPrinter
      })

      await window.electronAPI.assignESPToPrinter({
        espId: assignDialog.esp.id,
        printerId: selectedPrinter
      })

      // Refresh the configured ESPs list
      await loadData()
      setAssignDialog({ open: false, esp: null })
      setSelectedPrinter('')
      console.log('[ESPsView] Assign completed')
    } catch (error) {
      console.error('Failed to assign ESP to printer:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassign = async (esp: ESPConfig) => {
    if (!window.electronAPI) return

    try {
      await window.electronAPI.unassignESP(esp.id)
      await loadData()
    } catch (error) {
      console.error('Failed to unassign ESP:', error)
    }
  }

  const getAssignedPrinterName = (esp: ESPConfig): string => {
    if (!esp.assignedPrinterId) return 'Not assigned'
    const printer = availablePrinters.find((p) => p.id === esp.assignedPrinterId)
    return printer ? printer.name : 'Unknown printer'
  }

  const updateFilterOptions = () => {
    // Extract unique brands
    const brands = [...new Set(availablePrinters.map((p) => p.brand))].filter(Boolean).sort()
    setAvailableBrands(brands)

    // Extract unique models (filtered by selected brand if any)
    let modelsToShow = availablePrinters
    if (printerFilters.selectedBrand) {
      modelsToShow = availablePrinters.filter((p) => p.brand === printerFilters.selectedBrand)
    }
    const models = [...new Set(modelsToShow.map((p) => p.model))].filter(Boolean).sort()
    setAvailableModels(models)

    // Extract unique tags
    const allTags = availablePrinters.flatMap((p) => p.tags || [])
    const uniqueTags = [...new Set(allTags)].sort()
    setAvailableTags(uniqueTags)
  }

  const filterPrinters = () => {
    let filtered = [...availablePrinters]

    // Filter by search text (name, brand, model)
    if (printerFilters.searchText.trim()) {
      const searchLower = printerFilters.searchText.toLowerCase()
      filtered = filtered.filter(
        (printer) =>
          printer.name.toLowerCase().includes(searchLower) ||
          printer.brand?.toLowerCase().includes(searchLower) ||
          printer.model?.toLowerCase().includes(searchLower)
      )
    }

    // Filter by brand
    if (printerFilters.selectedBrand) {
      filtered = filtered.filter((printer) => printer.brand === printerFilters.selectedBrand)
    }

    // Filter by model
    if (printerFilters.selectedModel) {
      filtered = filtered.filter((printer) => printer.model === printerFilters.selectedModel)
    }

    // Filter by tags
    if (printerFilters.selectedTags.length > 0) {
      filtered = filtered.filter((printer) =>
        printerFilters.selectedTags.every((tag) => printer.tags?.includes(tag))
      )
    }

    setFilteredPrinters(filtered)
  }

  const handleFilterChange = (field: string, value: any) => {
    setPrinterFilters((prev) => {
      const updated = { ...prev, [field]: value }

      // Reset dependent filters when parent filter changes
      if (field === 'selectedBrand') {
        updated.selectedModel = ''
      }

      return updated
    })
  }

  const handleTagToggle = (tag: string) => {
    setPrinterFilters((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag]
    }))
  }

  const getSelectedPrinter = (): PrinterConfig | null => {
    return availablePrinters.find((p) => p.id === provisioningForm.selectedPrinterId) || null
  }

  if (loading) {
    return (
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header with controls */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: '#2d2d2d' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
                  ESP Controllers
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={isDiscoveryActive ? 'outlined' : 'contained'}
                    onClick={isDiscoveryActive ? handleStopDiscovery : handleStartDiscovery}
                    startIcon={isDiscoveryActive ? <StopIcon /> : <StartIcon />}
                    color={isDiscoveryActive ? 'error' : 'primary'}
                  >
                    {isDiscoveryActive ? 'Stop Discovery' : 'Start Discovery'}
                  </Button>
                  <Button variant="outlined" onClick={loadData} startIcon={<RefreshIcon />}>
                    Refresh
                  </Button>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Discover and manage ESP32 controllers for 3D waste collection monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Discovered ESP Devices */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: '#2d2d2d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Discovered Devices{' '}
                {isDiscoveryActive && <Chip label="Scanning..." color="primary" size="small" />}
              </Typography>

              {discoveredESPs.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  {isDiscoveryActive
                    ? 'No ESP devices found yet...'
                    : 'Start discovery to find ESP devices on your network'}
                </Typography>
              ) : (
                <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>IP Address</TableCell>
                        <TableCell>Hostname</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {discoveredESPs.map((esp) => (
                        <TableRow key={esp.ip}>
                          <TableCell>{esp.name}</TableCell>
                          <TableCell>{esp.ip}</TableCell>
                          <TableCell>{esp.hostname}</TableCell>
                          <TableCell>
                            <Chip
                              icon={esp.isProvisioned ? <OnlineIcon /> : <OfflineIcon />}
                              label={esp.isProvisioned ? 'Provisioned' : 'Unprovisioned'}
                              color={esp.isProvisioned ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Tooltip title="Identify (blink)">
                                <IconButton
                                  onClick={() => handleIdentify(esp.ip, 'start')}
                                  size="small"
                                >
                                  <IdentifyIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Stop Identify">
                                <IconButton
                                  onClick={() => handleIdentify(esp.ip, 'stop')}
                                  size="small"
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>
                              {!esp.isProvisioned && (
                                <Tooltip title="Provision ESP">
                                  <IconButton
                                    onClick={() => setProvisionDialog({ open: true, esp })}
                                    size="small"
                                  >
                                    <ProvisionIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {/* Temporarily disable DB assign/delete for discovered devices */}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Configured ESP Devices */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: '#2d2d2d' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configured Controllers
              </Typography>

              {configuredESPs.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No ESP controllers configured yet
                </Typography>
              ) : (
                <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>IP Address</TableCell>
                        <TableCell>Assigned Printer</TableCell>
                        <TableCell>Firmware</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {configuredESPs.map((esp) => (
                        <TableRow key={esp.id}>
                          <TableCell>{esp.name}</TableCell>
                          <TableCell>{esp.ip}</TableCell>
                          <TableCell>{getAssignedPrinterName(esp)}</TableCell>
                          <TableCell>
                            {(() => {
                              const brand = availablePrinters.find(
                                (p) => p.id === esp.assignedPrinterId
                              )?.brand
                              const hasFw = brand ? brandFirmwareMap[brand] : undefined
                              if (!brand) return <Chip label="N/A" size="small" />
                              return hasFw ? (
                                <Chip label="FW Ready" color="success" size="small" />
                              ) : (
                                <Chip label="No FW" color="warning" size="small" />
                              )
                            })()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={espOnlineMap[esp.id] ? <OnlineIcon /> : <OfflineIcon />}
                              label={espOnlineMap[esp.id] ? 'Online' : 'Offline'}
                              color={espOnlineMap[esp.id] ? 'success' : 'warning'}
                              size="small"
                            />
                            {esp.version && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                v{esp.version}
                              </Typography>
                            )}
                            {esp.lastFirmwareUpdateAt && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Updated: {new Date(esp.lastFirmwareUpdateAt).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              {/* Identify controls */}
                              <Tooltip title="Identify (blink)">
                                <IconButton
                                  onClick={() => handleIdentify(esp.ip, 'start')}
                                  size="small"
                                >
                                  <IdentifyIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Stop Identify">
                                <IconButton
                                  onClick={() => handleIdentify(esp.ip, 'stop')}
                                  size="small"
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>

                              {/* Reassign (always available) */}
                              <Tooltip
                                title={
                                  esp.assignedPrinterId
                                    ? 'Reassign to printer'
                                    : 'Assign to printer'
                                }
                              >
                                <IconButton
                                  onClick={() => setAssignDialog({ open: true, esp })}
                                  size="small"
                                >
                                  <AssignIcon />
                                </IconButton>
                              </Tooltip>

                              {/* Unassign if currently assigned */}
                              {esp.assignedPrinterId && (
                                <Tooltip title="Unassign from printer">
                                  <IconButton onClick={() => handleUnassign(esp)} size="small">
                                    <UnassignIcon />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {/* Delete from DB */}
                              <Tooltip title="Delete ESP">
                                <IconButton
                                  onClick={async () => {
                                    try {
                                      await window.electronAPI.removeESP(esp.id)
                                      await loadData()
                                    } catch (e) {
                                      console.error('Failed to delete ESP:', e)
                                    }
                                  }}
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Provisioning Dialog */}
      <Dialog
        open={provisionDialog.open}
        onClose={() => setProvisionDialog({ open: false, esp: null })}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        disableRestoreFocus
        aria-labelledby="provision-dialog-title"
        aria-describedby="provision-dialog-description"
      >
        <DialogTitle id="provision-dialog-title">Provision ESP Device</DialogTitle>
        <DialogContent sx={{ minHeight: 500 }}>
          {provisionDialog.esp && (
            <>
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  id="provision-dialog-description"
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0 }}
                >
                  Provisioning: {provisionDialog.esp.name} ({provisionDialog.esp.ip})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleIdentify(provisionDialog.esp!.ip, 'start')}
                >
                  Identify
                </Button>
                <Button
                  size="small"
                  onClick={() => handleIdentify(provisionDialog.esp!.ip, 'stop')}
                >
                  Stop
                </Button>
              </Box>

              {provisioningError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {provisioningError}
                </Alert>
              )}

              {/* Printer Selection Section */}
              <Typography
                variant="h6"
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FilterIcon /> Select Target Printer
              </Typography>

              {/* Search and Filters */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                {/* Live Search */}
                <TextField
                  fullWidth
                  label="Search printers..."
                  value={printerFilters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />

                {/* Filter Row */}
                <Stack direction="row" spacing={2}>
                  {/* Brand Filter */}
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Brand</InputLabel>
                    <Select
                      value={printerFilters.selectedBrand}
                      onChange={(e) => handleFilterChange('selectedBrand', e.target.value)}
                      label="Brand"
                    >
                      <MenuItem value="">All Brands</MenuItem>
                      {availableBrands.map((brand) => (
                        <MenuItem key={brand} value={brand}>
                          {brand}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Model Filter */}
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Model</InputLabel>
                    <Select
                      value={printerFilters.selectedModel}
                      onChange={(e) => handleFilterChange('selectedModel', e.target.value)}
                      label="Model"
                      disabled={!printerFilters.selectedBrand}
                    >
                      <MenuItem value="">All Models</MenuItem>
                      {availableModels.map((model) => (
                        <MenuItem key={model} value={model}>
                          {model}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                {/* Tags Filter */}
                {availableTags.length > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Tags:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {availableTags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          onClick={() => handleTagToggle(tag)}
                          variant={
                            printerFilters.selectedTags.includes(tag) ? 'filled' : 'outlined'
                          }
                          color={printerFilters.selectedTags.includes(tag) ? 'primary' : 'default'}
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>

              {/* Printer List */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {filteredPrinters.length} printer{filteredPrinters.length !== 1 ? 's' : ''} found
                </Typography>

                <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {filteredPrinters.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      No printers match your search criteria
                    </Box>
                  ) : (
                    <List dense>
                      {filteredPrinters.map((printer, index) => (
                        <React.Fragment key={printer.id}>
                          <ListItemButton
                            selected={provisioningForm.selectedPrinterId === printer.id}
                            onClick={() =>
                              setProvisioningForm((prev) => ({
                                ...prev,
                                selectedPrinterId: printer.id
                              }))
                            }
                          >
                            <ListItemText
                              secondaryTypographyProps={{ component: 'div' }}
                              primary={printer.name}
                              secondary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2">
                                    {printer.brand} {printer.model}
                                  </Typography>
                                  {printer.tags && printer.tags.length > 0 && (
                                    <Stack direction="row" spacing={0.5}>
                                      {printer.tags.slice(0, 2).map((tag) => (
                                        <Chip
                                          key={tag}
                                          label={tag}
                                          size="small"
                                          variant="outlined"
                                        />
                                      ))}
                                      {printer.tags.length > 2 && (
                                        <Typography variant="body2" color="text.secondary">
                                          +{printer.tags.length - 2} more
                                        </Typography>
                                      )}
                                    </Stack>
                                  )}
                                </Stack>
                              }
                            />
                          </ListItemButton>
                          {index < filteredPrinters.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              </Box>

              {/* Selected Printer Summary */}
              {getSelectedPrinter() && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Selected:</strong> {getSelectedPrinter()?.name} (
                    {getSelectedPrinter()?.brand} {getSelectedPrinter()?.model})
                  </Typography>
                </Alert>
              )}

              {/* API Endpoint removed: Electron provides it automatically via FirmwareServer */}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProvisionDialog({ open: false, esp: null })}>Cancel</Button>
          <Button
            onClick={handleProvision}
            variant="contained"
            disabled={isProvisioning || !provisioningForm.selectedPrinterId}
          >
            {isProvisioning ? <CircularProgress size={20} /> : 'Provision ESP'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog
        open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, esp: null })}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        disableRestoreFocus
        aria-labelledby="assign-dialog-title"
        aria-describedby="assign-dialog-description"
      >
        <DialogTitle id="assign-dialog-title">Assign ESP to Printer</DialogTitle>
        <DialogContent>
          {assignDialog.esp && (
            <>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  id="assign-dialog-description"
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0 }}
                >
                  Assigning: {assignDialog.esp.name} ({assignDialog.esp.ip})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleIdentify(assignDialog.esp!.ip, 'start')}
                >
                  Identify
                </Button>
                <Button size="small" onClick={() => handleIdentify(assignDialog.esp!.ip, 'stop')}>
                  Stop
                </Button>
              </Box>

              <TextField
                select
                fullWidth
                label="Select Printer"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                margin="normal"
              >
                {availablePrinters.map((printer) => (
                  <MenuItem key={printer.id} value={printer.id}>
                    {printer.name} ({printer.brand} {printer.model})
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, esp: null })}>Cancel</Button>
          <Button
            onClick={handleAssignToPrinter}
            variant="contained"
            disabled={isAssigning || !selectedPrinter}
          >
            {isAssigning ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ESPsView
