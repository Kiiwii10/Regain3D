import { alpha, createTheme } from "@mui/material/styles"

const baseBackground = '#05070d'
const surface = 'rgba(12, 19, 27, 0.96)'
const primary = '#18a6f2'
const secondary = '#1ad2a4'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: primary,
      contrastText: '#e8f6ff'
    },
    secondary: {
      main: secondary,
      contrastText: '#031c16'
    },
    background: {
      default: baseBackground,
      paper: surface
    },
    divider: 'rgba(56, 208, 215, 0.22)',
    text: {
      primary: '#e6eef9',
      secondary: '#9aa6bb',
      disabled: '#5a6782'
    },
    success: {
      main: '#1ad890'
    },
    warning: {
      main: '#ffb547'
    },
    error: {
      main: '#ff5f57'
    },
    info: {
      main: '#38d0d7'
    }
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontSize: 13,
    h5: {
      fontWeight: 600,
      letterSpacing: '0.02em'
    },
    h6: {
      fontSize: '0.85rem',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase'
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      fontSize: '0.72rem'
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'none'
    }
  },
  shape: {
    borderRadius: 16
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: baseBackground,
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(26,210,164,0.08), transparent 45%), radial-gradient(circle at 80% 0%, rgba(24,166,242,0.08), transparent 45%), linear-gradient(180deg, #05070d 0%, #04050a 100%)',
          color: '#e6eef9',
          scrollbarWidth: 'thin',
          scrollbarColor: '#212e40 rgba(7,11,16,0.7)'
        },
        '*::selection': {
          backgroundColor: alpha(primary, 0.3),
          color: '#e6eef9'
        },
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8
        },
        '*::-webkit-scrollbar-thumb': {
          borderRadius: 8,
          backgroundColor: '#1f2c3d'
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(7,11,16,0.7)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: surface,
          backgroundImage:
            'linear-gradient(135deg, rgba(24,166,242,0.12) 0%, rgba(15,31,45,0.92) 65%)',
          border: '1px solid rgba(56, 208, 215, 0.12)',
          backdropFilter: 'blur(18px)',
          boxShadow:
            '0 24px 50px -40px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.03)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          padding: '0.25rem'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: '1.1rem',
          paddingBlock: '0.6rem',
          boxShadow: '0 18px 30px -18px rgba(24,166,242,0.75)'
        },
        containedPrimary: {
          color: '#031b2f'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(primary, 0.18),
            boxShadow: '0 20px 34px -18px rgba(24,166,242,0.55)'
          }
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginInline: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(secondary, 0.16),
            boxShadow: '0 18px 32px -26px rgba(26,210,164,0.8)'
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha(secondary, 0.23)
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(56, 208, 215, 0.14)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontSize: '0.62rem'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 10,
          backgroundColor: 'rgba(8, 12, 18, 0.9)',
          border: '1px solid rgba(24,166,242,0.2)',
          backdropFilter: 'blur(12px)'
        }
      }
    }
  }
})

export default theme
