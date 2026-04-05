'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, Button, IconButton, Paper, Grid } from '@mui/material';
import { ArrowBack, Visibility, VisibilityOff, CopyAll, CheckCircle } from '@mui/icons-material';
import { generateMnemonic } from '@/lib/wallet/manager';

/**
 * MG Wallet - Mnemonic Step
 * Displays the newly generated secret phrase
 */
function MnemonicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const length = parseInt(searchParams.get('length') || '12') as 12 | 24;
  
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const phrase = generateMnemonic(length);
    setMnemonic(phrase.split(' '));
  }, [length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = () => {
    // Navigate to password screen, passing mnemonic in state or via a temporary store
    // For simplicity in this demo, we'll store it in sessionStorage temporarily
    sessionStorage.setItem('temp_mnemonic', mnemonic.join(' '));
    router.push('/onboarding/password');
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Back Up Phrase</Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>Secret Phrase</Typography>
        <Typography variant="body2" sx={{ color: 'text.muted' }}>
          Write down or copy these words in the right order and save them somewhere safe.
        </Typography>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <Paper sx={{ 
          p: 3, 
          borderRadius: 4, 
          bgcolor: 'surface', 
          border: '1px solid', 
          borderColor: 'border',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          blur: visible ? 'none' : '8px',
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {!visible && (
            <Box 
              sx={{ 
                position: 'absolute', 
                inset: 0, 
                backdropFilter: 'blur(10px)', 
                zIndex: 10, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                p: 4,
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.4)'
              }}
            >
              <VisibilityOff sx={{ fontSize: 48, mb: 2, color: 'text.muted' }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Tap to Reveal</Typography>
              <Typography variant="caption" sx={{ color: 'text.muted', mb: 3 }}>Make sure no one is looking at your screen.</Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setVisible(true)}
                sx={{ borderRadius: '12px' }}
              >
                Reveal Phrase
              </Button>
            </Box>
          )}

          <Grid container spacing={1.5} sx={{ opacity: visible ? 1 : 0.05 }}>
            {mnemonic.map((word, index) => (
              <Grid key={index} size={{ xs: 4 }}>
                <Box sx={{ 
                  p: 1.2, 
                  borderRadius: 2, 
                  bgcolor: 'background.default', 
                  border: '1px solid', 
                  borderColor: 'border',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Typography variant="caption" sx={{ color: 'text.muted', width: 14 }}>{index + 1}</Typography>
                  <Typography variant="body2" fontWeight={600}>{word}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {visible && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
            <Button 
              size="small" 
              startIcon={copied ? <CheckCircle /> : <CopyAll />} 
              onClick={handleCopy}
              disabled={copied}
              sx={{ color: copied ? 'success.main' : 'primary.main' }}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <IconButton size="small" onClick={() => setVisible(false)}>
              <VisibilityOff />
            </IconButton>
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 'auto', pt: 4 }}>
        <Paper sx={{ p: 2, bgcolor: 'rgba(255, 0, 122, 0.05)', border: '1px dashed', borderColor: 'primary.main', mb: 3 }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            ⚠️ NEVER share your recovery phrase with anyone. Anyone with this phrase can take your funds forever.
          </Typography>
        </Paper>
        <Button 
          variant="contained" 
          fullWidth 
          size="large"
          color="primary"
          onClick={handleNext}
          disabled={!visible}
          sx={{ borderRadius: '16px', py: 2, fontSize: '1.1rem' }}
        >
          I've Backed Up My Phrase
        </Button>
      </Box>
    </Box>
  );
}

export default function MnemonicPage() {
  return (
    <Suspense fallback={null}>
      <MnemonicContent />
    </Suspense>
  );
}
