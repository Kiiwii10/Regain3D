import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemSecondaryAction,
  Collapse,
  IconButton,
  Chip,
  Card,
  CardContent,
  Alert
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { alpha, useTheme } from '@mui/material/styles'
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { ActiveView } from '@renderer/types/ui'
import { usePrinterContext } from '@renderer/context/PrinterContext'
import { ESPConfig } from '@shared/types/esp'

interface DashboardViewProps {
  onViewChange: (view: ActiveView) => void
}

const DashboardView: React.FC<DashboardViewProps> = ({ onViewChange }) => {
  const theme = useTheme()
  const { configuredPrinters } = usePrinterContext()
  const [expandedPrinters, setExpandedPrinters] = useState<Set<string>>(new Set())
  const [configuredESPs, setConfiguredESPs] = useState<ESPConfig[]>([])
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([])

  // Load ESP data
  useEffect(() => {
    const loadESPData = async () => {
      if (window.electronAPI) {
        try {
          const esps = await window.electronAPI.getAllESPs()
          setConfiguredESPs(esps || [])

          const printers = await window.electronAPI.getAllPrinters()
          setAvailablePrinters(printers || [])
        } catch (error) {
          console.error('Failed to load ESP data in dashboard:', error)
        }
      }
    }

    loadESPData()
  }, [])

  const toggleExpanded = (printerId: string): void => {
    const newExpanded = new Set(expandedPrinters)
    if (newExpanded.has(printerId)) {
      newExpanded.delete(printerId)
    } else {
      newExpanded.add(printerId)
    }
    setExpandedPrinters(newExpanded)
  }

  const onlineCount = configuredPrinters.filter((p) => p.status === 'online').length
  const offlineCount = configuredPrinters.filter((p) => p.status !== 'online').length
  const stats = {
    totalPrinters: configuredPrinters.length,
    online: onlineCount,
    offline: offlineCount,
    espsProvisioned: configuredESPs.filter((esp) => esp.isProvisioned).length
  }

  const statCardSx = {
    background: 'linear-gradient(135deg, rgba(24,166,242,0.18) 0%, rgba(7,14,24,0.92) 100%)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    boxShadow: '0 24px 48px -32px rgba(0,0,0,0.75)',
    backdropFilter: 'blur(18px)',
    overflow: 'hidden'
  } as const

  const panelCardSx = {
    background: 'linear-gradient(135deg, rgba(24,166,242,0.12) 0%, rgba(4,9,15,0.95) 100%)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
    boxShadow: '0 40px 80px -50px rgba(0,0,0,0.78)',
    backdropFilter: 'blur(20px)',
    overflow: 'hidden'
  } as const

  return (
    <Box
      sx={{
        p: 3,
        height: '100%',
        overflow: 'auto',
        width: '100%',
        minWidth: 0,
        background: 'radial-gradient(circle at top right, rgba(24,166,242,0.08) 0%, transparent 40%)'
      }}
    >
      {/* Header with stats and scan button */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2
          }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: alpha(theme.palette.text.secondary, 0.8) }}>
              Mission Control
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Print Farm Overview
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SearchIcon />}
            sx={{ minWidth: 180 }}
            onClick={() => onViewChange('add-printer')}
          >
            Add a Printer
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={statCardSx}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary">
                  Printers on Network
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                  {stats.totalPrinters}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={statCardSx}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary">
                  Online Printers
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  {stats.online}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={statCardSx}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary">
                  Offline Printers
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                  {stats.offline}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={statCardSx}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary">
                  ESPs Provisioned
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  {stats.espsProvisioned}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Expandable Printer List */}
      <Card sx={panelCardSx}>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: alpha(theme.palette.primary.main, 0.18),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Configured Printers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live status from every connected machine
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => onViewChange('add-printer')}
            >
              Add Printer
            </Button>
          </Box>

          {configuredPrinters.length === 0 && (
            <Alert severity="info" sx={{ m: 2 }}>
              You haven&apos;t added any printers yet. Click &quot;Add Printer&quot; to get started.
            </Alert>
          )}

          <List sx={{ p: 0 }}>
            {configuredPrinters.map((printer) => (
              <React.Fragment key={printer.id}>
                <ListItem
                  sx={{
                    borderBottom: 1,
                    borderColor: alpha(theme.palette.primary.main, 0.12),
                    '&:last-child': { borderBottom: 0 }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    {/* Printer Picture Placeholder */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: alpha(theme.palette.primary.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: 10, letterSpacing: '0.08em' }}>
                        {printer.model}
                      </Typography>
                    </Box>

                    {/* Printer Info */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {printer.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={(printer as any).status ?? 'Idle'}
                          sx={{
                            bgcolor: theme.palette.warning.main,
                            color: '#03151f',
                            fontSize: 10,
                            height: 20,
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                        {printer.connectionConfig.ipAddress}
                      </Typography>
                    </Box>
                  </Box>
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => toggleExpanded(printer.id)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main', background: alpha(theme.palette.primary.main, 0.12) }
                      }}
                    >
                      {expandedPrinters.has(printer.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>

                <Collapse in={expandedPrinters.has(printer.id)}>
                  <Box
                    sx={{
                      p: 2,
                      background: alpha(theme.palette.primary.main, 0.05),
                      borderBottom: 1,
                      borderColor: alpha(theme.palette.primary.main, 0.12)
                    }}
                  >
                    <Typography color="text.secondary">
                      Status:{' '}
                      {configuredPrinters.find((p) => p.id === printer.id)?.status || 'unknown'}
                    </Typography>
                  </Box>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* ESP Controllers Section */}
      <Card sx={{ ...panelCardSx, mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: alpha(theme.palette.primary.main, 0.18),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ESP Controllers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provisioned microcontrollers and assignments
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AddIcon />}
              size="small"
              onClick={() => onViewChange('esps')}
            >
              Add ESP Controller
            </Button>
          </Box>

          <List sx={{ p: 0 }}>
            {configuredESPs.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>
                No ESP controllers configured yet. Click &quot;Add ESP Controller&quot; to get started.
              </Alert>
            ) : (
              configuredESPs.map((esp) => {
                const assignedPrinterName = esp.assignedPrinterId
                  ? availablePrinters.find((p) => p.id === esp.assignedPrinterId)?.name ||
                    'Unknown Printer'
                  : null

                return (
                  <ListItem
                    key={esp.id}
                    sx={{
                      borderBottom: 1,
                      borderColor: alpha(theme.palette.primary.main, 0.12),
                      '&:last-child': { borderBottom: 0 }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      {/* ESP Icon */}
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: alpha(theme.palette.secondary.main, 0.12),
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}`
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: 10, letterSpacing: '0.12em' }}>
                          ESP
                        </Typography>
                      </Box>

                      {/* ESP Info */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {esp.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={esp.isProvisioned ? 'Configured' : 'Unprovisioned'}
                            sx={{
                              bgcolor: esp.isProvisioned
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                              color: esp.isProvisioned ? '#041b13' : '#fff',
                              fontSize: 10,
                              height: 20,
                              fontWeight: 600
                            }}
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                          {assignedPrinterName ? `Assigned to: ${assignedPrinterName}` : 'Unassigned'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          IP: {esp.ip}
                        </Typography>
                      </Box>

                      {/* Assignment Button */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {!esp.assignedPrinterId && esp.isProvisioned && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ fontSize: 11 }}
                            onClick={() => onViewChange('esps')}
                          >
                            Assign to Printer
                          </Button>
                        )}
                        {esp.assignedPrinterId && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            sx={{ fontSize: 11 }}
                            onClick={() => onViewChange('esps')}
                          >
                            Reassign
                          </Button>
                        )}
                        {!esp.isProvisioned && (
                          <Typography variant="caption" color="warning.main">
                            Not Provisioned
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                )
              })
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  )
}

export default DashboardView
