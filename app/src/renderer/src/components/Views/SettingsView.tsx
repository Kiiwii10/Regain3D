import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Switch,
  Button,
  Chip,
  Divider,
  Alert
} from '@mui/material'
import {
  AccountCircle as AccountIcon,
  Palette as ThemeIcon,
  Storage as DatabaseIcon,
  Wifi as NetworkIcon,
  Security as SecurityIcon,
  Upgrade as UpgradeIcon
} from '@mui/icons-material'

const SettingsView: React.FC = () => {
  const [darkMode, setDarkMode] = React.useState(true)
  const [notifications, setNotifications] = React.useState(true)
  const [autoBackup, setAutoBackup] = React.useState(false)

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Settings
      </Typography>

      {/* Account & Subscription */}
      <Card sx={{ bgcolor: '#2d2d2d', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <AccountIcon color="primary" />
            <Typography variant="h6">Account & Subscription</Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            You are currently on the <strong>Free Tier</strong>. Upgrade to Premium for advanced
            monitoring and management features.
          </Alert>

          <List>
            <ListItem>
              <ListItemText
                primary="Subscription Status"
                secondary="Free Tier - Core functionality enabled"
              />
              <ListItemSecondaryAction>
                <Chip label="Free" color="default" size="small" />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText primary="Account Email" secondary="user@example.com" />
            </ListItem>
          </List>

          <Button variant="contained" startIcon={<UpgradeIcon />} sx={{ mt: 2 }}>
            Upgrade to Premium
          </Button>
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card sx={{ bgcolor: '#2d2d2d', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <ThemeIcon color="primary" />
            <Typography variant="h6">Application</Typography>
          </Box>

          <List>
            <ListItem>
              <ListItemText primary="Dark Mode" secondary="Use dark theme for the interface" />
              <ListItemSecondaryAction>
                <Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemText
                primary="Notifications"
                secondary="Show system notifications for print status"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemText primary="Language" secondary="English (US)" />
              <ListItemSecondaryAction>
                <Button size="small" variant="outlined">
                  Change
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemText primary="Startup Behavior" secondary="Launch on system startup" />
              <ListItemSecondaryAction>
                <Switch defaultChecked />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card sx={{ bgcolor: '#2d2d2d', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Advanced
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DatabaseIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Database Management"
                secondary="Backup and restore application data"
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined">
                    Backup
                  </Button>
                  <Button size="small" variant="outlined">
                    Restore
                  </Button>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DatabaseIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Auto Backup" secondary="Automatically backup data daily" />
              <ListItemSecondaryAction>
                <Switch checked={autoBackup} onChange={(e) => setAutoBackup(e.target.checked)} />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <NetworkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Local MQTT Broker"
                secondary="Enable local MQTT broker for ESP communication"
              />
              <ListItemSecondaryAction>
                <Switch defaultChecked={false} />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SecurityIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Certificate Management"
                secondary="Manage trusted device certificates"
              />
              <ListItemSecondaryAction>
                <Button size="small" variant="outlined">
                  Manage
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemText primary="Logging Level" secondary="Current: Info" />
              <ListItemSecondaryAction>
                <Button size="small" variant="outlined">
                  Configure
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider />

            <ListItem>
              <ListItemText
                primary="Export Logs"
                secondary="Export application logs for debugging"
              />
              <ListItemSecondaryAction>
                <Button size="small" variant="outlined">
                  Export
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* About */}
      <Card sx={{ bgcolor: '#2d2d2d' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            About
          </Typography>

          <List>
            <ListItem>
              <ListItemText primary="Application Version" secondary="Regain3D v2.2.0" />
            </ListItem>

            <ListItem>
              <ListItemText primary="Build Date" secondary="January 2025" />
            </ListItem>

            <ListItem>
              <ListItemText primary="License" secondary="Proprietary Software" />
            </ListItem>
          </List>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button size="small" variant="outlined">
              Check for Updates
            </Button>
            <Button size="small" variant="outlined">
              Release Notes
            </Button>
            <Button size="small" variant="outlined">
              Contact Support
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default SettingsView
