'use client';

import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { useWalletStore } from '@/store/useWalletStore';

/**
 * MG Wallet - UI Providers
 * Handles MUI Theme (Dark/Light) and Global Reset
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const storeTheme = useWalletStore((state) => state.theme);
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
    document.documentElement.setAttribute('data-theme', storeTheme);
  }, [storeTheme]);

  const theme = useMemo(() => {
    // During hydration, we must use a stable theme (light) to match the server output
    const activeMode = mounted ? storeTheme : 'light';
    
    return createTheme({
      palette: {
        mode: activeMode,
        primary: {
          main: '#3375BB', // Trust Blue
        },
        secondary: {
          main: '#00BD84', // Success Green
        },
        background: {
          default: activeMode === 'dark' ? '#111111' : '#FFFFFF',
          paper: activeMode === 'dark' ? '#1C1C1E' : '#F5F7F9',
        },
        text: {
          primary: activeMode === 'dark' ? '#F5F7FA' : '#1A1C1E',
        }
      },
      typography: {
        fontFamily: 'inherit',
        button: {
          textTransform: 'none',
          fontWeight: 600,
        }
      },
      shape: {
        borderRadius: 12,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              padding: '12px 24px',
              borderRadius: 12, // Normal rounded corners
            }
          },
          defaultProps: {
            disableElevation: true,
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            }
          }
        }
      }
    });
  }, [mounted, storeTheme]);

  if (!mounted) {
    return <Box sx={{ flex: 1, bgcolor: storeTheme === 'dark' ? '#111111' : '#FFFFFF' }} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
