'use client';

import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useWalletStore } from '@/store/useWalletStore';

/**
 * MG Wallet - UI Providers
 * Handles MUI Theme (Dark/Light) and Global Reset
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // We could use a theme setting from the store if needed, 
  // but let's stick to system default for now or a custom MG theme.
  
  const theme = useMemo(() => createTheme({
    palette: {
      mode: 'light', // Force light for now or handle dynamic switching
      primary: {
        main: '#FF007A',
      },
      secondary: {
        main: '#FF8A00',
      },
      background: {
        default: '#FFFFFF',
        paper: '#F8F9FA',
      },
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
          }
        },
        defaultProps: {
          disableElevation: true,
        }
      }
    }
  }), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
