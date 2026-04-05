'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, IconButton, TextField, InputAdornment, LinearProgress, Paper } from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff, Lock, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useWalletStore } from '@/store/useWalletStore';
import { encryptData } from '@/lib/crypto/encryption';
import { deriveWalletFromMnemonic, deriveWalletFromPrivateKey, WalletData } from '@/lib/wallet/manager';

/**
 * MG Wallet - Unified Password Setting
 * Securely encrypts the newly created or imported wallet.
 */
export default function UniversalPasswordPage() {
  const router = useRouter();
  const setWallet = useWalletStore(state => state.setWallet);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{ type: 'mnemonic' | 'private-key', data: string } | null>(null);

  useEffect(() => {
    const tempMnemonic = sessionStorage.getItem('temp_mnemonic');
    const tempPrivateKey = sessionStorage.getItem('temp_private_key');
    
    if (tempMnemonic) {
      setWalletInfo({ type: 'mnemonic', data: tempMnemonic });
    } else if (tempPrivateKey) {
      setWalletInfo({ type: 'private-key', data: tempPrivateKey });
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletInfo || password !== confirmPassword || password.length < 8) return;

    setLoading(true);
    try {
      let address = '';
      let privateKey = '';
      let mnemonic = undefined;

      if (walletInfo.type === 'mnemonic') {
        const wallet = deriveWalletFromMnemonic(walletInfo.data);
        address = wallet.address;
        privateKey = wallet.privateKey;
        mnemonic = walletInfo.data;
      } else {
        const wallet = deriveWalletFromPrivateKey(walletInfo.data);
        address = wallet.address;
        privateKey = wallet.privateKey;
      }

      const walletData: WalletData = {
        type: walletInfo.type,
        address,
        privateKey,
        mnemonic,
      };

      const encrypted = await encryptData(JSON.stringify(walletData), password);
      setWallet(encrypted, address);

      sessionStorage.removeItem('temp_mnemonic');
      sessionStorage.removeItem('temp_private_key');
      router.push('/dashboard');
    } catch (error) {
      console.error('Finalization failed:', error);
      alert('Failed to secure your wallet.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength();

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Complete Setup</Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Create Master Password</Typography>
        <Typography variant="body2" sx={{ color: 'text.muted' }}>
          This password will be used to protect your wallet on this browser.
        </Typography>
      </Box>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                sx: { borderRadius: 3 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ mt: 1, px: 0.5 }}>
              <LinearProgress 
                variant="determinate" 
                value={strength} 
                sx={{ 
                  height: 4, 
                  borderRadius: 2, 
                  bgcolor: 'border',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: strength < 50 ? 'error.main' : strength < 100 ? 'warning.main' : 'success.main'
                  }
                }} 
              />
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword.length > 0 && confirmPassword !== password}
            InputProps={{ sx: { borderRadius: 3 } }}
          />
        </Box>

        <Paper sx={{ p: 2, bgcolor: 'surface', borderRadius: 3, mt: 4, display: 'flex', gap: 1.5, border: '1px solid', borderColor: 'border' }}>
          <Lock sx={{ color: 'secondary.main', fontSize: 24 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            We cannot recover this password. If you forget it, you will need to re-import your wallet using your secret phrase.
          </Typography>
        </Paper>

        <Box sx={{ mt: 'auto', pt: 4 }}>
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            color="primary"
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword}
            sx={{ borderRadius: '16px', py: 2, fontSize: '1.1rem' }}
          >
            {loading ? 'Processing...' : 'Secure My Wallet'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
