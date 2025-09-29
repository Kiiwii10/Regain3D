import React from 'react'
import { Box, Typography, IconButton } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Minimize as MinimizeIcon,
  CropSquare as MaximizeIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { ActiveView } from '@renderer/types/ui'

interface TitleBarProps {
  activeView: ActiveView
}

const TitleBar: React.FC<TitleBarProps> = ({ activeView }) => {
  const theme = useTheme()

  const getViewTitle = (view: ActiveView): string => {
    switch (view) {
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
        return 'Dashboard'
    }
  }

  const handleMinimize = () => {
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize()
    }
  }

  const handleMaximize = () => {
    if (window.electronAPI?.maximize) {
      window.electronAPI.maximize()
    }
  }

  const handleClose = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close()
    }
  }

  const controlBaseStyles = {
    width: 48,
    height: 38,
    borderRadius: 12,
    color: alpha(theme.palette.text.secondary, 0.75),
    transition: 'all 0.18s ease',
    '&:focus': {
      outline: 'none',
      boxShadow: 'none'
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 2px rgba(24,166,242,0.35)'
    },
    '& .MuiSvgIcon-root': {
      fontSize: 16
    }
  } as const

  return (
    <Box
      sx={{
        height: 40,
        minHeight: 40,
        maxHeight: 40,
        background: 'linear-gradient(90deg, rgba(6,11,18,0.95) 0%, rgba(8,24,36,0.82) 100%)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        boxShadow: '0 20px 40px -36px rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
        px: 2
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontSize: 12,
          letterSpacing: '0.28em',
          color: alpha(theme.palette.text.secondary, 0.85),
          userSelect: 'none'
        }}
      >
        {getViewTitle(activeView)} · Regain3D
      </Typography>

      <Box
        sx={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          WebkitAppRegion: 'no-drag'
        }}
      >
        <IconButton
          onClick={handleMinimize}
          sx={{
            ...controlBaseStyles,
            '&:hover': {
              background: alpha(theme.palette.primary.main, 0.18),
              color: theme.palette.primary.main,
              boxShadow: `0 16px 32px -18px ${alpha(theme.palette.primary.main, 0.6)}`
            }
          }}
        >
          <MinimizeIcon />
        </IconButton>

        <IconButton
          onClick={handleMaximize}
          sx={{
            ...controlBaseStyles,
            '&:hover': {
              background: alpha(theme.palette.secondary.main, 0.16),
              color: theme.palette.secondary.main,
              boxShadow: `0 16px 32px -18px ${alpha(theme.palette.secondary.main, 0.55)}`
            }
          }}
        >
          <MaximizeIcon />
        </IconButton>

        <IconButton
          onClick={handleClose}
          sx={{
            ...controlBaseStyles,
            '&:hover': {
              background: alpha(theme.palette.error.main, 0.32),
              color: theme.palette.error.contrastText ?? '#fff',
              boxShadow: `0 18px 38px -18px ${alpha(theme.palette.error.main, 0.75)}`
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  )
}

export default TitleBar

