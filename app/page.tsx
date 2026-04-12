'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { AccountBalanceWallet, Add, ArrowForward, Restore } from '@mui/icons-material';

/**
 * MG Wallet - Main Page
 * Redirects to onboarding or dashboard
 */
export default function MainPage() {
  const router = useRouter();
  const { wallets } = useWalletStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallets.length > 0) {
      router.push('/dashboard');
    } else {
      setLoading(false);
    }
  }, [wallets, router]);

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 4,
      textAlign: 'center',
      gap: 6
    }}>
      <Box className="gradient-bg" sx={{ 
        width: 100, 
        height: 100, 
        borderRadius: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(255, 0, 122, 0.4)',
        mb: 2
      }}>
        <AccountBalanceWallet sx={{ fontSize: 60, color: 'white' }} />
      </Box>

      <Box>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }} className="gradient-text">
          MG Wallet
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 280, mx: 'auto' }}>
          Your ultra-secure gateway to the decentralized world.
        </Typography>
      </Box>

      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          color="primary"
          startIcon={<Add />}
          onClick={() => router.push('/onboarding/create')}
          sx={{ borderRadius: 1.5, py: 2, fontSize: '1.1rem' }}
        >
          Create New Wallet
        </Button>
        <Button 
          variant="outlined" 
          fullWidth 
          size="large"
          startIcon={<Restore />}
          onClick={() => router.push('/onboarding/import')}
          sx={{ borderRadius: '16px', py: 2, fontSize: '1.1rem', borderColor: '#E9ECEF', color: 'text.primary' }}
        >
          Import Existing Wallet
        </Button>
      </Box>

      <Typography variant="caption" sx={{ color: 'text.muted', mt: 4 }}>
        Trust Wallet & MetaMask compatible
      </Typography>
    </Box>
  );
}
