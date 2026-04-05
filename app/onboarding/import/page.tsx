'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, IconButton, TextField, Paper, Tabs, Tab } from '@mui/material';
import { ArrowBack, Security, VpnKey, Warning } from '@mui/icons-material';
import { validateMnemonic, deriveWalletFromMnemonic, deriveWalletFromPrivateKey } from '@/lib/wallet/manager';

/**
 * MG Wallet - Import Wallet Screen
 * Import via mnemonic phrase or private key
 */
export default function ImportWalletPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    const trimmedInput = input.trim();

    try {
      if (tab === 0) {
        // Mnemonic
        if (!validateMnemonic(trimmedInput)) {
          setError('Invalid mnemonic phrase. Please check the spelling and order.');
          return;
        }
        sessionStorage.setItem('temp_mnemonic', trimmedInput);
      } else {
        // Private Key
        try {
          const wallet = deriveWalletFromPrivateKey(trimmedInput.startsWith('0x') ? trimmedInput : `0x${trimmedInput}`);
          // For consistency with the password page which expects a mnemonic, 
          // let's pass a specific type of storage for private keys.
          sessionStorage.setItem('temp_private_key', wallet.privateKey);
        } catch (e) {
          setError('Invalid private key. Must be a 64-character hex string.');
          return;
        }
      }
      
      router.push('/onboarding/password');
    } catch (e) {
      setError('An error occurred during import.');
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Import Wallet</Typography>
      </Box>

      <Tabs 
        value={tab} 
        onChange={(_, v) => { setTab(v); setError(''); setInput(''); }} 
        variant="fullWidth" 
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Secret Phrase" icon={<Security sx={{ fontSize: 20 }} />} iconPosition="start" />
        <Tab label="Private Key" icon={<VpnKey sx={{ fontSize: 20 }} />} iconPosition="start" />
      </Tabs>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {tab === 0 ? 'Recovery Phrase' : 'Secret Private Key'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.muted' }}>
          {tab === 0 
            ? 'Typically 12 or 24 words separated by single spaces.' 
            : 'Enter your 64-character private key hex string.'}
        </Typography>
      </Box>

      <TextField
        fullWidth
        multiline
        rows={4}
        placeholder={tab === 0 ? "word1 word2 word3..." : "0x123..."}
        variant="outlined"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        error={!!error}
        helperText={error}
        InputProps={{ sx: { borderRadius: 3, bgcolor: 'surface' } }}
      />

      {tab === 1 && (
        <Paper sx={{ p: 2, bgcolor: 'rgba(255, 138, 0, 0.05)', borderRadius: 3, mt: 3, display: 'flex', gap: 2, border: '1px solid', borderColor: 'secondary.light' }}>
          <Warning sx={{ color: 'secondary.main', mt: 0.5 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Private keys do not contain mnemonic phrases. If you lose this key, you lose access to the wallet.
          </Typography>
        </Paper>
      )}

      <Box sx={{ mt: 'auto', pt: 4 }}>
        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          color="primary"
          onClick={handleImport}
          disabled={!input.trim()}
          sx={{ borderRadius: '16px', py: 2, fontSize: '1.1rem' }}
        >
          Import Wallet
        </Button>
      </Box>
    </Box>
  );
}
