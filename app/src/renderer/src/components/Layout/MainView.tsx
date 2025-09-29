import React from 'react'
import { Box, Typography } from '@mui/material'
import { ActiveView } from '@renderer/types/ui'
import DashboardView from '@renderer/components/Views/DashboardView'
import PrintersView from '@renderer/components/Views/PrintersView'
import ESPsView from '@renderer/components/Views/ESPsView'
import GcodeToolsView from '@renderer/components/Views/GcodeToolsView'
import SettingsView from '@renderer/components/Views/SettingsView'
import AddPrinterView from '@renderer/components/Views/AddPrinterView'

interface MainViewProps {
  activeView: ActiveView
  selectedItem: string | null
  onSideBarToggle: () => void
  sideBarOpen: boolean
  onViewChange: (view: ActiveView) => void
}

const MainView: React.FC<MainViewProps> = ({
  activeView,
  selectedItem,
  onSideBarToggle: _onSideBarToggle,
  sideBarOpen: _sideBarOpen,
  onViewChange
}) => {
  const renderView = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onViewChange={onViewChange} />
      case 'printers':
        return <PrintersView onViewChange={onViewChange} />
      case 'esps':
        return <ESPsView selectedESP={selectedItem} />
      case 'gcode-tools':
        return <GcodeToolsView />
      case 'settings':
        return <SettingsView />
      case 'add-printer':
        return <AddPrinterView onViewChange={onViewChange} />
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Typography>Unknown view: {activeView}</Typography>
          </Box>
        )
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0, // Important for flex shrinking
        overflow: 'hidden',
        height: '100%'
      }}
    >
      {/* Main Content - No title bar */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: 'background.default',
          minHeight: 0, // Important for flex shrinking
          width: '100%'
        }}
      >
        {renderView()}
      </Box>
    </Box>
  )
}

export default MainView

