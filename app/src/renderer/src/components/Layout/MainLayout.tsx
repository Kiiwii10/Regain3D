import React, { useState } from 'react'
import { Box } from '@mui/material'
import ActivityBar from './ActivityBar.js'
import SideBar from './SideBar.js'
import MainView from './MainView.js'
import StatusBar from './StatusBar.js'
import TitleBar from './TitleBar.js'
import { ActiveView } from '@renderer/types/ui'

// Theme is provided at the application root

export interface MainLayoutProps {}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [sideBarOpen, setSideBarOpen] = useState(true)
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

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

  const handleViewChange = (view: ActiveView): void => {
    setActiveView(view)
    setSelectedItem(null) // Reset selection when changing views

    // Update window title
    const title = getViewTitle(view)
    if (window.electronAPI?.setWindowTitle) {
      window.electronAPI.setWindowTitle(title)
    }
  }

  const handleSideBarToggle = (): void => {
    setSideBarOpen(!sideBarOpen)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: 'background.default',
        position: 'fixed',
        top: 0,
        left: 0
      }}
    >
      {/* Custom Title Bar */}
      <TitleBar activeView={activeView} />

      {/* Main Content Row */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}
      >
        {/* Activity Bar - Fixed left side */}
        <ActivityBar
          activeView={activeView}
          onViewChange={handleViewChange}
          sideBarOpen={sideBarOpen}
          onSideBarToggle={handleSideBarToggle}
        />

        {/* Side Bar - Collapsible */}
        <SideBar
          open={sideBarOpen}
          activeView={activeView}
          selectedItem={selectedItem}
          onSelectedItemChange={setSelectedItem}
          onToggle={handleSideBarToggle}
        />

        {/* Main Content Area */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {/* Main View */}
          <MainView
            activeView={activeView}
            selectedItem={selectedItem}
            onSideBarToggle={handleSideBarToggle}
            sideBarOpen={sideBarOpen}
            onViewChange={handleViewChange}
          />
        </Box>
      </Box>

      {/* Status Bar - Full width below everything */}
      <StatusBar />
    </Box>
  )
}

export default MainLayout

