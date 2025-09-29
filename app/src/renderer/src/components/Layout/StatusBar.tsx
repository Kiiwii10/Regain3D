import React from 'react'
import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Circle as StatusIcon,
  Notifications as NotificationsIcon,
  BugReport as LogsIcon
} from '@mui/icons-material'
import { usePrinterContext } from '@renderer/context/PrinterContext'

const StatusBar: React.FC = () => {
  const { configuredPrinters } = usePrinterContext()
  const theme = useTheme()

  return (
    <Box
      sx={{
        height: 28,
        minHeight: 28,
        maxHeight: 28,
        background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.82)} 0%, ${alpha(theme.palette.secondary.main, 0.78)} 100%)`,
        color: '#031b2f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        fontSize: 12,
        borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.32)}`,
        boxShadow: '0 -18px 38px -30px rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <StatusIcon sx={{ fontSize: 9, color: '#1a3a4a' }} />
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
            {configuredPrinters.length} Printers Configured
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <StatusIcon sx={{ fontSize: 9, color: '#1a3a4a' }} />
          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
            0 ESPs Online
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
          Regain3D v2.2.0
        </Typography>

        <Tooltip title="View Logs">
          <IconButton
            size="small"
            sx={{
              color: '#06263a',
              p: 0.25,
              borderRadius: 10,
              '&:hover': {
                background: alpha(theme.palette.primary.contrastText, 0.12)
              },
              '& .MuiSvgIcon-root': {
                fontSize: 15
              }
            }}
          >
            <LogsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Notifications">
          <IconButton
            size="small"
            sx={{
              color: '#06263a',
              p: 0.25,
              borderRadius: 10,
              '&:hover': {
                background: alpha(theme.palette.primary.contrastText, 0.12)
              },
              '& .MuiSvgIcon-root': {
                fontSize: 15
              }
            }}
          >
            <NotificationsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default StatusBar
