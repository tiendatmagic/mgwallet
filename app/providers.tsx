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

  const theme = useMemo(() => createTheme({
    palette: {
      mode: storeTheme,
      primary: {
        main: '#3375BB', // Trust Blue
      },
      secondary: {
        main: '#00BD84', // Success Green
      },
      background: {
        default: storeTheme === 'dark' ? '#111111' : '#FFFFFF',
        paper: storeTheme === 'dark' ? '#1C1C1E' : '#F5F7F9',
      },
      text: {
        primary: storeTheme === 'dark' ? '#F5F7FA' : '#1A1C1E',
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
      borderRadius: 16,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            padding: '12px 24px',
            borderRadius: 100, // Rounded buttons like Trust
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
  }), [storeTheme]);

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
