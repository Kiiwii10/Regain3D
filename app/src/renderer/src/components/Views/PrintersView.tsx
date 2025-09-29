import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  Collapse,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  // TextField,
  List,
  ListItem,
  Chip
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material'
import { usePrinterContext } from '@renderer/context/PrinterContext'
import { PrinterConfig, PrinterCommand } from '@shared/types/printer'
import { ActiveView } from '@renderer/types/ui'

interface PrintersViewProps {
  onViewChange: (view: ActiveView) => void
}

const PrintersView: React.FC<PrintersViewProps> = ({ onViewChange }) => {
  const theme = useTheme()
  const { configuredPrinters, removeConfiguredPrinter } = usePrinterContext()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterConfig | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingPrinterId, setPendingPrinterId] = useState<string | null>(null)
  const [pendingCommand, setPendingCommand] = useState<PrinterCommand | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')

  const isInterfering = (cmd: PrinterCommand): boolean => {
    switch (cmd.command) {
      case 'home':
      case 'moveBaseToZ':
      case 'moveHeadToZ':
      case 'retractFilament':
      case 'cutAndRetractFilament':
      case 'filamentSwap':
      case 'moveToChuteArea':
      case 'cutFilament':
        return true
      default:
        return false
    }
  }

  const runWithIdleCheck = async (printerId: string, command: PrinterCommand): Promise<void> => {
    try {
      if (isInterfering(command)) {
        const telemetry = await window.electronAPI.getPrinterTelemetry(printerId)
        if (telemetry && telemetry.state && telemetry.state !== 'IDLE') {
          setConfirmMessage(
            'This action may interrupt or stop the current print. Do you want to continue?'
          )
          setPendingPrinterId(printerId)
          setPendingCommand(command)
          setConfirmOpen(true)
          return
        }
      }
      await window.electronAPI?.sendPrinterCommand(printerId, command)
    } catch (err) {
      console.error('Failed to send command:', err)
    }
  }

  const handleConfirmProceed = async (): Promise<void> => {
    setConfirmOpen(false)
    if (pendingPrinterId && pendingCommand) {
      await window.electronAPI?.sendPrinterCommand(pendingPrinterId, pendingCommand)
      setPendingPrinterId(null)
      setPendingCommand(null)
    }
  }

  const handleConfirmCancel = (): void => {
    setConfirmOpen(false)
    setPendingPrinterId(null)
    setPendingCommand(null)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, printer: PrinterConfig): void => {
    setAnchorEl(event.currentTarget)
    setSelectedPrinter(printer)
  }

  const handleMenuClose = (): void => {
    setAnchorEl(null)
    setSelectedPrinter(null)
  }

  const handleDeleteClick = (): void => {
    setDeleteConfirmOpen(true)
    setAnchorEl(null)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedPrinter && window.electronAPI) {
      try {
        await window.electronAPI.removePrinter(selectedPrinter.id)
        removeConfiguredPrinter(selectedPrinter.id)
      } catch (error) {
        console.error('Failed to delete printer:', error)
      }
    }
    setDeleteConfirmOpen(false)
    setSelectedPrinter(null)
  }

  const handleDeleteCancel = (): void => {
    setDeleteConfirmOpen(false)
    setSelectedPrinter(null)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          My Printers
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => onViewChange('add-printer')}
        >
          Add Printer
        </Button>
      </Box>

      {configuredPrinters.length === 0 ? (
        <Alert severity="info">
          You haven&apos;t added any printers yet. Click &quot;Add Printer&quot; to get started.
        </Alert>
      ) : (
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(24,166,242,0.12) 0%, rgba(4,9,15,0.95) 100%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
            boxShadow: '0 40px 80px -50px rgba(0,0,0,0.78)',
            backdropFilter: 'blur(20px)'
          }}
        >
          <CardContent sx={{ p: 0 }}>
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
                        <Typography variant="caption" sx={{ fontSize: 10 }}>
                          {printer.model}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {printer.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={printer.status || 'unknown'}
                            sx={{
                              bgcolor:
                                printer.status === 'online'
                                  ? theme.palette.success.main
                                  : theme.palette.error.main,
                              color: printer.status === 'online' ? '#041b13' : '#fff',
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
                    <CardActions>
                      <IconButton
                        edge="end"
                        onClick={() => setExpandedId(expandedId === printer.id ? null : printer.id)}
                        sx={{ color: 'text.secondary' }}
                      >
                        {expandedId === printer.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, printer)}>
                        <MoreVertIcon />
                      </IconButton>
                    </CardActions>
                  </ListItem>
                  <Collapse in={expandedId === printer.id} timeout="auto" unmountOnExit>
                    <Stack direction="row" flexWrap="wrap" gap={1} p={2}>
                      <Button
                        size="small"
                        disabled={printer.status !== 'online'}
                        onClick={() =>
                          window.electronAPI?.sendPrinterCommand(printer.id, {
                            command: 'setLight',
                            on: true
                          })
                        }
                      >
                        Light On
                      </Button>
                      <Button
                        size="small"
                        disabled={printer.status !== 'online'}
                        onClick={() =>
                          window.electronAPI?.sendPrinterCommand(printer.id, {
                            command: 'setLight',
                            on: false
                          })
                        }
                      >
                        Light Off
                      </Button>
                      <Button
                        size="small"
                        disabled={printer.status !== 'online'}
                        onClick={() => runWithIdleCheck(printer.id, { command: 'home' })}
                      >
                        Home
                      </Button>
                      <Button
                        size="small"
                        disabled={printer.status !== 'online'}
                        onClick={() => runWithIdleCheck(printer.id, { command: 'moveToChuteArea' })}
                      >
                        Move to Chute
                      </Button>
                      <Button
                        size="small"
                        disabled={printer.status !== 'online'}
                        onClick={() => runWithIdleCheck(printer.id, { command: 'wipeNozzle' })}
                      >
                        Wipe Nozzle
                      </Button>
                      <Button
                        size="small"
                        disabled={printer.status !== 'online'}
                        onClick={() => runWithIdleCheck(printer.id, { command: 'cutFilament' })}
                      >
                        Cut Filament
                      </Button>
                    </Stack>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} disableRestoreFocus>
        <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
      </Menu>

      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Printer?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{selectedPrinter?.name}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} autoFocus>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={handleConfirmCancel}>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel}>Cancel</Button>
          <Button color="error" onClick={handleConfirmProceed}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PrintersView
