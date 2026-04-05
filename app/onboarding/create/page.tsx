'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, IconButton, Tabs, Tab, Paper } from '@mui/material';
import { ArrowBack, Security, VerifiedUser } from '@mui/icons-material';

/**
 * MG Wallet - Create Wallet Screen
 * Choose mnemonic length (12 or 24 words)
 */
export default function CreateWalletPage() {
  const router = useRouter();
  const [wordCount, setWordCount] = useState<12 | 24>(12);

  const handleNext = () => {
    router.push(`/onboarding/create/mnemonic?length=${wordCount}`);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Create New Wallet</Typography>
      </Box>

      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Mnemonic Phrase</Typography>
        <Typography variant="body2" sx={{ color: 'text.muted' }}>
          This is a secret 12 or 24-word phrase that allows you to recover your wallet.
        </Typography>
      </Box>

      <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'surface', mb: 6 }}>
        <Security sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" fontWeight={700} gutterBottom>Select Phrase Length</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button 
            variant={wordCount === 12 ? 'contained' : 'outlined'} 
            fullWidth 
            onClick={() => setWordCount(12)}
            sx={{ borderRadius: '12px', py: 1.5 }}
          >
            12 Words
          </Button>
          <Button 
            variant={wordCount === 24 ? 'contained' : 'outlined'} 
            fullWidth 
            onClick={() => setWordCount(24)}
            sx={{ borderRadius: '12px', py: 1.5 }}
          >
            24 Words
          </Button>
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.muted' }}>
          {wordCount === 12 ? 'Standard security (128-bit)' : 'Maximum security (256-bit)'}
        </Typography>
      </Paper>

      <Box sx={{ mt: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255, 138, 0, 0.1)' }}>
          <VerifiedUser sx={{ color: 'secondary.main', fontSize: 20 }} />
          <Typography variant="caption" fontWeight={600} sx={{ color: 'secondary.main' }}>
            We do not store your phrase on our servers.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          color="primary"
          onClick={handleNext}
          sx={{ borderRadius: '16px', py: 2, fontSize: '1.1rem' }}
        >
          Create Wallet
        </Button>
      </Box>
    </Box>
  );
}
