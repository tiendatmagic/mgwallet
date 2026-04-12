'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Add, Restore, ArrowBack, AccountBalanceWallet } from '@mui/icons-material';

/**
 * MG Wallet - Onboarding Selection
 * Allows user to choose between creating or importing a wallet
 */
export default function OnboardingPage() {
  const router = useRouter();

  return (
    <Box sx={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      p: 3 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 6 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Add Wallet</Typography>
      </Box>

      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        pb: 10
      }}>
        <Box sx={{ 
          width: 80, 
          height: 80, 
          borderRadius: 1.5, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 4,
          overflow: 'hidden'
        }}>
        <img src="/logo.png" alt="MG Wallet Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </Box>

        <Typography variant="h4" fontWeight={800} gutterBottom>
          New Wallet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.muted', maxWidth: 260, mb: 6 }}>
          Would you like to generate a new secret phrase or import an existing one?
        </Typography>

        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            color="primary"
            startIcon={<Add />}
            onClick={() => router.push('/onboarding/create')}
            sx={{ py: 2, fontSize: '1.1rem' }}
          >
            Create New Wallet
          </Button>
          <Button 
            variant="outlined" 
            fullWidth 
            size="large"
            startIcon={<Restore />}
            onClick={() => router.push('/onboarding/import')}
            sx={{ py: 2, fontSize: '1.1rem' }}
          >
            Import Secret Phrase
          </Button>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.muted' }}>
        MG Wallet supports BIP39 standard phrases.
      </Typography>
    </Box>
  );
}
