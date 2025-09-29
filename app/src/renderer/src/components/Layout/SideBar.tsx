import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  TextField,
  InputAdornment,
  Chip,
  Button
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  ChevronLeft as ChevronLeftIcon,
  Search as SearchIcon,
  Add as AddIcon,
  FolderOpen as FolderIcon,
  Circle as StatusIcon
} from '@mui/icons-material'
import { ActiveView } from '@renderer/types/ui'
import { usePrinterContext } from '@renderer/context/PrinterContext'
import { ESPConfig } from '@shared/types/esp'

interface SideBarProps {
  open: boolean
  activeView: ActiveView
  selectedItem: string | null
  onSelectedItemChange: (item: string | null) => void
  onToggle: () => void
}

const SideBar: React.FC<SideBarProps> = ({
  open,
  activeView,
  selectedItem,
  onSelectedItemChange,
  onToggle
}) => {
  const theme = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [configuredESPs, setConfiguredESPs] = useState<ESPConfig[]>([])
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([])
  const { discoveredPrinters, configuredPrinters } = usePrinterContext()

  const statusColor = (status: string): string => {
    switch (status) {
      case 'printing':
      case 'online':
        return theme.palette.success.main
      case 'idle':
        return theme.palette.warning.main
      case 'offline':
      case 'error':
        return theme.palette.error.main
      default:
        return alpha(theme.palette.text.secondary, 0.6)
    }
  }

  useEffect(() => {
    const loadESPData = async () => {
      if (window.electronAPI) {
        try {
          const esps = await window.electronAPI.getAllESPs()
          setConfiguredESPs(esps || [])

          const printers = await window.electronAPI.getAllPrinters()
          setAvailablePrinters(printers || [])
        } catch (error) {
          console.error('Failed to load ESP data in sidebar:', error)
        }
      }
    }

    loadESPData()

    if (activeView === 'esps') {
      loadESPData()
    }
  }, [activeView])

  const renderDashboardContent = (): React.ReactNode => (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Quick Stats
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <Chip
          size="small"
          label={`${configuredPrinters.length} Configured Printers`}
          variant="outlined"
          sx={{ justifyContent: 'flex-start', borderColor: alpha(theme.palette.primary.main, 0.25) }}
        />
        <Chip
          size="small"
          label={`${discoveredPrinters.length} Printers Discovered`}
          variant="outlined"
          sx={{ justifyContent: 'flex-start', borderColor: alpha(theme.palette.secondary.main, 0.25) }}
        />
        <Chip
          size="small"
          label={`${configuredESPs.length} ESP Controllers`}
          variant="outlined"
          sx={{ justifyContent: 'flex-start', borderColor: alpha(theme.palette.info.main, 0.25) }}
        />
      </Box>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<SearchIcon />}
        size="small"
        fullWidth
        sx={{ mb: 1 }}
      >
        Scan for Devices
      </Button>
    </Box>
  )

  const renderAddPrinterContent = (): React.ReactNode => {
    const filteredPrinters = discoveredPrinters.filter((printer) =>
      printer.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <Box>
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            size="small"
            placeholder="Search network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            fullWidth
          />
        </Box>
        <List dense>
          {filteredPrinters.map((printer) => (
            <ListItemButton key={printer.serial} sx={{ px: 2 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <StatusIcon
                  sx={{
                    fontSize: 12,
                    color: theme.palette.info.main
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={printer.name}
                secondary={printer.ip}
                primaryTypographyProps={{ fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    )
  }

  const renderPrintersContent = (): React.ReactNode => (
    <Box>
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          size="small"
          placeholder="Search printers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 1 }}
          fullWidth
        />
        <Button variant="outlined" color="secondary" startIcon={<AddIcon />} size="small" fullWidth>
          Add Printer
        </Button>
      </Box>

      <List dense>
        {configuredPrinters
          .filter((printer) => printer.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((printer) => (
            <ListItemButton
              key={printer.id}
              selected={selectedItem === printer.id}
              onClick={() => onSelectedItemChange(selectedItem === printer.id ? null : printer.id)}
              sx={{ px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <StatusIcon sx={{ fontSize: 12, color: statusColor((printer as any).status || 'unknown') }} />
              </ListItemIcon>
              <ListItemText
                primary={printer.name}
                secondary={`${printer.model} • ${(printer as any).status || 'unknown'}`}
                primaryTypographyProps={{ fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
            </ListItemButton>
          ))}
      </List>
    </Box>
  )

  const renderESPsContent = (): React.ReactNode => (
    <Box>
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          size="small"
          placeholder="Search ESP controllers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 1 }}
          fullWidth
        />
        <Button variant="outlined" color="secondary" startIcon={<AddIcon />} size="small" fullWidth>
          Add ESP Controller
        </Button>
      </Box>

      <List dense>
        {configuredESPs
          .filter((esp) => esp.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((esp) => {
            const assignedPrinterName = esp.assignedPrinterId
              ? availablePrinters.find((p) => p.id === esp.assignedPrinterId)?.name || 'Unknown Printer'
              : 'Unassigned'

            return (
              <ListItemButton
                key={esp.id}
                selected={selectedItem === esp.id}
                onClick={() => onSelectedItemChange(selectedItem === esp.id ? null : esp.id)}
                sx={{ px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <StatusIcon
                    sx={{
                      fontSize: 12,
                      color: esp.isProvisioned ? theme.palette.success.main : theme.palette.error.main
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={esp.name}
                  secondary={assignedPrinterName}
                  primaryTypographyProps={{ fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
              </ListItemButton>
            )
          })}
        {configuredESPs.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No ESP controllers"
              secondary="Add ESP controllers to get started"
              primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
              secondaryTypographyProps={{ fontSize: 11, color: 'text.secondary' }}
            />
          </ListItem>
        )}
      </List>
    </Box>
  )

  const renderGcodeToolsContent = (): React.ReactNode => (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Recent Files
      </Typography>
      <List dense>
        <ListItem>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="model_v2.gcode"
            secondary="2 hours ago"
            primaryTypographyProps={{ fontSize: 13 }}
            secondaryTypographyProps={{ fontSize: 11 }}
          />
        </ListItem>
      </List>
    </Box>
  )

  const renderSettingsContent = (): React.ReactNode => (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Quick Settings
      </Typography>
      <List dense>
        <ListItem>
          <ListItemText
            primary="Account"
            secondary="Free Tier"
            primaryTypographyProps={{ fontSize: 13 }}
            secondaryTypographyProps={{ fontSize: 11 }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Theme"
            secondary="Dark"
            primaryTypographyProps={{ fontSize: 13 }}
            secondaryTypographyProps={{ fontSize: 11 }}
          />
        </ListItem>
      </List>
    </Box>
  )

  const getViewTitle = (): string => {
    switch (activeView) {
      case 'dashboard':
        return 'Dashboard'
      case 'printers':
        return 'Printers'
      case 'esps':
        return 'ESP Controllers'
      case 'gcode-tools':
        return 'G-code Tools'
      case 'settings':
        return 'Settings'
      case 'add-printer':
        return 'Add Printer'
      default:
        return 'Unknown'
    }
  }

  const renderContent = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard':
        return renderDashboardContent()
      case 'printers':
        return renderPrintersContent()
      case 'esps':
        return renderESPsContent()
      case 'gcode-tools':
        return renderGcodeToolsContent()
      case 'settings':
        return renderSettingsContent()
      case 'add-printer':
        return renderAddPrinterContent()
      default:
        return null
    }
  }

  return (
    <Collapse in={open} orientation="horizontal">
      <Box
        sx={{
          width: {
            xs: 'min(200px, calc(100vw - 64px - 20px))',
            sm: 'min(240px, calc(100vw - 64px - 200px))',
            md: 240
          },
          minWidth: { xs: 180, sm: 200, md: 240 },
          maxWidth: { xs: 200, sm: 240, md: 240 },
          background: 'linear-gradient(180deg, rgba(8,14,20,0.92) 0%, rgba(6,10,15,0.94) 100%)',
          borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
          boxShadow: 'inset -1px 0 0 rgba(26,210,164,0.14)',
          backdropFilter: 'blur(20px)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 1
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: alpha(theme.palette.primary.main, 0.18),
            background: 'linear-gradient(135deg, rgba(14,24,34,0.82) 0%, rgba(8,14,22,0.72) 100%)',
            boxShadow: '0 12px 40px -32px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            height: 56,
            minHeight: 56
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13, letterSpacing: '0.1em' }}>
            {getViewTitle()}
          </Typography>
          <IconButton
            onClick={onToggle}
            sx={{
              color: alpha(theme.palette.text.secondary, 0.75),
              width: 34,
              height: 34,
              borderRadius: 12,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
              background: alpha(theme.palette.primary.main, 0.05),
              transition: 'all 0.22s ease',
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.18),
                color: 'primary.main',
                boxShadow: '0 16px 30px -18px rgba(24,166,242,0.35)'
              },
              '&:focus': {
                outline: 'none',
                boxShadow: 'none'
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: 'none'
              }
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>{renderContent()}</Box>
      </Box>
    </Collapse>
  )
}

export default SideBar
