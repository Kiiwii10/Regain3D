// import React from 'react'
// import MainLayout from './components/Layout/MainLayout.js'

// function App() {
//   return <MainLayout />
// }

// export default App

import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'

// CLI mode view
import GCodeProcessorWindow from './windows/GCodeProcessorWindow'

// Layout components
import MainLayout from './components/Layout/MainLayout'

function App(): React.ReactElement {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* CLI Mode Route - No layout wrapper */}
          <Route path="/gcode-cli" element={<GCodeProcessorWindow />} />

          {/* Regular App Routes with Layout */}
          <Route path="/" element={<MainLayout />}></Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
