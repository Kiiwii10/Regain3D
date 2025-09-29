import React from 'react'
import { Box, IconButton, Tooltip, Divider } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Dashboard as DashboardIcon,
  Print as PrintIcon,
  Memory as EspIcon,
  Code as GcodeIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material'
import { ActiveView } from '@renderer/types/ui'

interface ActivityBarProps {
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  sideBarOpen: boolean
  onSideBarToggle: () => void
}

interface ActivityItem {
  id: ActiveView
  icon: React.ReactElement
  label: string
}

const activityItems: ActivityItem[] = [
  { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
  { id: 'printers', icon: <PrintIcon />, label: 'Printers' },
  { id: 'esps', icon: <EspIcon />, label: 'ESP Controllers' },
  { id: 'gcode-tools', icon: <GcodeIcon />, label: 'G-code Tools' }
]

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange, onSideBarToggle }) => {
  const theme = useTheme()

  const handleItemClick = (view: ActiveView): void => {
    if (activeView === view) {
      onSideBarToggle()
    } else {
      onViewChange(view)
    }
  }

  const renderButton = (item: ActivityItem, isFooter = false) => {
    const isActive = activeView === item.id
    return (
      <Tooltip key={item.id} title={item.label} placement="right">
        <IconButton
          aria-label={item.label}
          onClick={() => handleItemClick(item.id)}
          sx={{
            position: 'relative',
            width: 46,
            height: 46,
            borderRadius: 14,
            color: isActive ? 'primary.main' : 'text.secondary',
            background: isActive
              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.24)} 0%, ${alpha(theme.palette.secondary.main, 0.22)} 100%)`
              : 'transparent',
            boxShadow: isActive
              ? `0 20px 36px -20px ${alpha(theme.palette.primary.main, 0.75)}`
              : 'none',
            transition: 'all 0.22s ease',
            '&:hover': {
              color: 'primary.main',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)} 0%, rgba(10, 18, 26, 0.9) 100%)`,
              boxShadow: `0 22px 40px -24px ${alpha(theme.palette.primary.main, 0.7)}`
            },
            '&::after': isActive
              ? {
                  content: "''",
                  position: 'absolute',
                  left: -12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 4,
                  height: 26,
                  borderRadius: 999,
                  background: `linear-gradient(180deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.5)}`
                }
              : undefined,
            '& .MuiSvgIcon-root': {
              fontSize: 22
            },
            mt: isFooter ? 0 : 0.25
          }}
        >
          {item.icon}
        </IconButton>
      </Tooltip>
    )
  }

  return (
    <Box
      sx={{
        width: 72,
        minWidth: 72,
        maxWidth: 72,
        background: 'linear-gradient(180deg, rgba(7,11,16,0.9) 0%, rgba(4,7,12,0.92) 100%)',
        borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        boxShadow: 'inset -1px 0 0 rgba(26,210,164,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        zIndex: 1000,
        height: '100%',
        flexShrink: 0,
        gap: 1.5,
        backdropFilter: 'blur(22px)'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {activityItems.map((item) => renderButton(item))}
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {renderButton({ id: 'add-printer', icon: <AddIcon />, label: 'Add Printer' })}
        <Divider sx={{ width: 36, alignSelf: 'center', borderColor: alpha(theme.palette.primary.main, 0.14) }} />
        {renderButton({ id: 'settings', icon: <SettingsIcon />, label: 'Settings' }, true)}
      </Box>
    </Box>
  )
}

export default ActivityBar
