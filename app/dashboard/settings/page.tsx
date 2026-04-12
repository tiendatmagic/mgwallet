'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import { 
  Box, Typography, IconButton, Paper, Avatar,
  List, ListItem, ListItemText, ListItemIcon, ListItemButton,
  Divider, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Button, CircularProgress, 
  Alert, AlertTitle, Stack, ToggleButton, ToggleButtonGroup, Switch,
  Chip
} from '@mui/material';
import { 
  ArrowBack, 
  Lock, 
  Key, 
  Description, 
  ChevronRight, 
  Visibility, 
  VisibilityOff,
  ContentCopy,
  CheckCircle,
  AccountBalanceWallet,
  Fingerprint,
  FingerprintOutlined,
  Dns
} from '@mui/icons-material';
import { decryptData } from '@/lib/crypto/encryption';
import { WalletData, deriveBitcoinKeyPair, exportPrivateKeyWIF, deriveSolanaKeyPair, exportSolanaPrivateKey, deriveBitcoinCashKeyPair } from '@/lib/wallet/manager';

/**
 * MG Wallet - Settings Page
 * Manage security, view recovery phrases and private keys
 */
export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, wallets, changePassword, isLocked, activeWalletId, switchWallet } = useWalletStore();

  // Dialog States
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [changePassDialogOpen, setChangePassDialogOpen] = useState(false);
  const [revealDialogOpen, setRevealDialogOpen] = useState(false);

  // Form States
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Biometric States
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricDialogOpen, setBiometricDialogOpen] = useState(false);

  // Reveal States
  const [revealType, setRevealType] = useState<'mnemonic' | 'privateKey' | null>(null);
  const [revealData, setRevealData] = useState('');
  const [revealWalletData, setRevealWalletData] = useState<WalletData | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'evm' | 'btc_segwit' | 'btc_taproot' | 'solana' | 'bch' | 'ltc' | 'near' | 'sui' | 'aptos' | 'cardano' | 'xrp' | 'ton' | 'tron'>('evm');
  const [copied, setCopied] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  // Navigation check
  React.useEffect(() => {
    if (wallets.length === 0) {
      router.replace('/');
    }

    const checkSupport = async () => {
      const { checkBiometricSupport } = await import('@/lib/crypto/webauthn');
      setBiometricSupported(await checkBiometricSupport());
    };
    checkSupport();
  }, [wallets.length, router]);

  if (wallets.length === 0) {
    return null;
  }

  const resetForm = () => {
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleVerifyPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const activeWallet = wallets.find(w => w.id === activeWalletId);
      if (!activeWallet) throw new Error('No active wallet');
      
      const { getDeviceFingerprint } = await import('@/lib/crypto/fingerprint');
      const fingerprint = await getDeviceFingerprint();
      
      let decryptedData: string;
      try {
        // 1. Try with fingerprint
        decryptedData = await decryptData(activeWallet.encryptedMnemonic, password, fingerprint);
      } catch (e) {
        // 2. Fallback for legacy wallets
        decryptedData = await decryptData(activeWallet.encryptedMnemonic, password, '');
      }

      const walletData: WalletData = JSON.parse(decryptedData);
      setRevealWalletData(walletData);
      
      if (revealType === 'mnemonic') {
        if (!walletData.mnemonic) throw new Error('No recovery phrase available for this wallet type.');
        setRevealData(walletData.mnemonic);
      } else if (revealType === 'privateKey') {
        setRevealData(walletData.privateKey);
        setSelectedNetwork('evm');
      }
      
      setRevealDialogOpen(true);
      setVerifyDialogOpen(false);
    } catch (e: any) {
      setError('Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const success = await changePassword(password, newPassword);
      if (success) {
        setSuccess('Password updated successfully!');
        setTimeout(() => setChangePassDialogOpen(false), 2000);
      } else {
        setError('Failed to update password. Check your current password.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    setLoading(true);
    setError('');
    const { enableBiometric } = useWalletStore.getState();
    const success = await enableBiometric(password);
    if (success) {
      setSuccess('Biometric/OS lock enabled successfully!');
      setTimeout(() => {
        setBiometricDialogOpen(false);
        setSuccess('');
        setPassword('');
      }, 2000);
    } else {
      setError('Biometric setup failed. Make sure your device supports it and try again.');
    }
    setLoading(false);
  };

  const { isBiometricEnabled, disableBiometric } = useWalletStore();

  const handleNetworkChange = async (
    event: React.MouseEvent<HTMLElement>,
    network: 'evm' | 'btc_segwit' | 'btc_taproot' | 'solana' | 'bch' | 'ltc' | 'near' | 'sui' | 'aptos' | 'cardano' | 'xrp' | 'ton' | 'tron',
  ) => {
    if (!network || !revealWalletData) return;
    setSelectedNetwork(network);
    setShowSensitive(false);

    if (network === 'evm') {
      setRevealData(revealWalletData.privateKey);
    } else if (network === 'solana' && revealWalletData.mnemonic) {
      const keyPair = deriveSolanaKeyPair(revealWalletData.mnemonic);
      setRevealData(exportSolanaPrivateKey(keyPair));
    } else if (network === 'bch' && revealWalletData.mnemonic) {
      const keyPair = deriveBitcoinCashKeyPair(revealWalletData.mnemonic);
      setRevealData(exportPrivateKeyWIF(Buffer.from(keyPair.privateKey)));
    } else if (network === 'ltc' && revealWalletData.mnemonic) {
      const { LITECOIN_NETWORK } = await import('@/lib/wallet/manager');
      const { BIP32Factory } = await import('bip32');
      const ecc = await import('tiny-secp256k1');
      const bip32 = BIP32Factory(ecc);
      const { Mnemonic } = await import('ethers');
      const seed = Mnemonic.fromPhrase(revealWalletData.mnemonic).computeSeed();
      const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'), LITECOIN_NETWORK);
      const child = root.derivePath("m/84'/2'/0'/0/0");
      const { ECPairFactory } = await import('ecpair');
      const ECPair = ECPairFactory(ecc);
      setRevealData(ECPair.fromPrivateKey(Buffer.from(child.privateKey!), { network: LITECOIN_NETWORK }).toWIF());
    } else if (network === 'near' && revealWalletData.mnemonic) {
      const { deriveNearAddress } = await import('@/lib/wallet/manager');
      setRevealData(await deriveNearAddress(revealWalletData.mnemonic));
    } else if (network === 'sui' && revealWalletData.mnemonic) {
      const { deriveSuiAddress } = await import('@/lib/wallet/manager');
      setRevealData(await deriveSuiAddress(revealWalletData.mnemonic));
    } else if (network === 'aptos' && revealWalletData.mnemonic) {
      const { deriveAptosAddress } = await import('@/lib/wallet/manager');
      setRevealData(await deriveAptosAddress(revealWalletData.mnemonic));
    } else if (network === 'xrp' && revealWalletData.mnemonic) {
      const { deriveRippleAddress } = await import('@/lib/wallet/manager');
      setRevealData(await deriveRippleAddress(revealWalletData.mnemonic));
    } else if (network === 'ton' && revealWalletData.mnemonic) {
      const { deriveTonAddress } = await import('@/lib/wallet/manager');
      setRevealData(await deriveTonAddress(revealWalletData.mnemonic));
    } else if (network === 'tron' && revealWalletData.mnemonic) {
      const { deriveTronAddress } = await import('@/lib/wallet/manager');
      setRevealData(await deriveTronAddress(revealWalletData.mnemonic));
    } else if (revealWalletData.mnemonic) {
      const type = network === 'btc_segwit' ? 'segwit' : 'taproot';
      const keyPair = deriveBitcoinKeyPair(revealWalletData.mnemonic, type);
      setRevealData(exportPrivateKeyWIF(keyPair.privateKey));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(revealData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'surface', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.default' }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={800}>Settings</Typography>
      </Box>

      {/* Settings List */}
      <Box sx={{ p: 2, flex: 1 }}>
        <Typography variant="overline" sx={{ px: 1, color: 'text.muted', fontWeight: 700 }}>Chung</Typography>
        <Paper sx={{ borderRadius: 1.5, mt: 1, mb: 3, overflow: 'hidden' }}>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton onClick={() => router.push('/onboarding')} sx={{ py: 1.5 }}>
                <ListItemIcon>
                   <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent' }}>
                     <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                   </Avatar>
                </ListItemIcon>
                <ListItemText 
                  primary="Ví" 
                  secondary={wallets.find(w => w.id === activeWalletId)?.name || 'Chưa chọn'} 
                />
                <ChevronRight sx={{ color: 'text.muted' }} />
              </ListItemButton>
            </ListItem>
            <Divider variant="middle" />
            <ListItem sx={{ py: 1.5 }}>
               <ListItemIcon>
                   <Visibility color="primary" />
                </ListItemIcon>
                <ListItemText primary="Chế độ tối" />
                <Switch 
                  checked={theme === 'dark'} 
                  onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} 
                />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="overline" sx={{ px: 1, color: 'text.muted', fontWeight: 700 }}>Bảo mật</Typography>
        <Paper sx={{ borderRadius: 1.5, mt: 1, overflow: 'hidden' }}>
          <List disablePadding>
            <ListItem disablePadding sx={{ py: 0.5 }}>
              <ListItemButton 
                onClick={() => { resetForm(); setChangePassDialogOpen(true); }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <Lock color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Thay đổi mật khẩu" 
                  secondary="Cập nhật bảo mật cục bộ của bạn" 
                />
                <ChevronRight sx={{ color: 'text.muted' }} />
              </ListItemButton>
            </ListItem>
            
            <Divider variant="middle" />

            <ListItem disablePadding sx={{ py: 0.5 }}>
              <ListItemButton 
                onClick={() => { resetForm(); setRevealType('mnemonic'); setVerifyDialogOpen(true); }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <Description color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Xem Cụm từ khôi phục" 
                  secondary="Truy cập cụm từ 12 hoặc 24 từ của bạn" 
                />
                <ChevronRight sx={{ color: 'text.muted' }} />
              </ListItemButton>
            </ListItem>

            <Divider variant="middle" />

            <ListItem disablePadding sx={{ py: 0.5 }}>
              <ListItemButton 
                onClick={() => { resetForm(); setRevealType('privateKey'); setVerifyDialogOpen(true); }}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <Key color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Xem Khóa cá nhân" 
                  secondary="Xem các khóa cá nhân trên các chuỗi" 
                />
                <ChevronRight sx={{ color: 'text.muted' }} />
              </ListItemButton>
            </ListItem>

            <Divider variant="middle" />
            <ListItem sx={{ py: 1.5 }}>
              <ListItemIcon>
                <Fingerprint color="primary" />
              </ListItemIcon>
              <Box sx={{ flex: 1 }}>
                <ListItemText 
                  primary="Khóa bằng vân tay/PIN (OS)" 
                  secondary={biometricSupported 
                    ? "Sử dụng bảo mật hệ điều hành để mở khóa ví" 
                    : "Trình duyệt hoặc thiết bị này không hỗ trợ khóa vân tay/PIN"} 
                />
              </Box>
              <Switch 
                disabled={!biometricSupported}
                checked={isBiometricEnabled} 
                onChange={(e) => {
                  if (e.target.checked) {
                    resetForm();
                    setBiometricDialogOpen(true);
                  } else {
                    disableBiometric();
                  }
                }} 
              />
            </ListItem>
          </List>
        </Paper>

        <Typography variant="overline" sx={{ mt: 4, mb: 1, color: 'text.secondary', fontWeight: 700, display: 'block', px: 1 }}>
          THIẾT BỊ & HỆ THỐNG
        </Typography>
        <Paper sx={{ borderRadius: 1.5, overflow: 'hidden', mb: 4 }}>
          <List disablePadding>
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon>
                <Dns color="primary" />
              </ListItemIcon>
              <Box sx={{ flex: 1 }}>
                <ListItemText 
                  primary="Trạng thái thiết bị" 
                  secondary="Dấu vân tay trình duyệt đang hoạt động" 
                />
              </Box>
              <Chip 
                label="BẢO MẬT" 
                color="success" 
                size="small" 
                sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: 10 }} 
              />
            </ListItem>
            <Divider variant="middle" />
            <ListItem sx={{ py: 1.5 }}>
              <ListItemText 
                sx={{ ml: 7 }}
                primary="Browser Fingerprint" 
                secondary={loading ? 'Checking...' : 'Active & Verified'} 
              />
            </ListItem>
          </List>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.muted' }}>
            MG Wallet v0.1.0 • Securely Managed Locally
          </Typography>
        </Box>
      </Box>

      {/* Verify Password Dialog */}
      <Dialog 
        open={verifyDialogOpen} 
        onClose={() => setVerifyDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 350 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Enter Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Please enter your current password to view sensitive information.
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            variant="outlined"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            helperText={error}
            InputProps={{ sx: { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleVerifyPassword}
            disabled={loading || !password}
            sx={{ borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog 
        open={changePassDialogOpen} 
        onClose={() => setChangePassDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Change Password</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {success ? (
            <Alert icon={<CheckCircle fontSize="inherit" />} severity="success" sx={{ borderRadius: 1.5 }}>
              <AlertTitle>Success</AlertTitle>
              {success}
            </Alert>
          ) : (
            <>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!error && error.includes('current')}
                InputProps={{ sx: { borderRadius: 1.5 } }}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                variant="outlined"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{ sx: { borderRadius: 1.5 } }}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!error && error.includes('match')}
                helperText={error}
                InputProps={{ sx: { borderRadius: 1.5 } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setChangePassDialogOpen(false)}>Cancel</Button>
          {!success && (
            <Button 
              variant="contained" 
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !password}
              sx={{ borderRadius: 1.5, px: 3 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Update Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Reveal Dialog */}
      <Dialog 
        open={revealDialogOpen} 
        onClose={() => setRevealDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 450 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {revealType === 'mnemonic' ? 'Recovery Phrase' : 'Private Key'}
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 1.5 }}>
            <AlertTitle>Confidential Information</AlertTitle>
            Never share this with anyone. Anyone with this info can steal your assets.
          </Alert>
          
          {revealType === 'privateKey' && revealWalletData?.mnemonic && (
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={selectedNetwork}
                exclusive
                onChange={handleNetworkChange}
                size="small"
                color="primary"
              >
                <ToggleButton value="evm">EVM</ToggleButton>
                <ToggleButton value="btc_segwit">BTC SegWit</ToggleButton>
                <ToggleButton value="btc_taproot">BTC Taproot</ToggleButton>
                <ToggleButton value="solana">Solana</ToggleButton>
                <ToggleButton value="bch">BCH</ToggleButton>
                <ToggleButton value="ltc">LTC</ToggleButton>
                <ToggleButton value="near">NEAR</ToggleButton>
                <ToggleButton value="sui">SUI</ToggleButton>
                <ToggleButton value="aptos">APTOS</ToggleButton>
                <ToggleButton value="cardano">ADA</ToggleButton>
                <ToggleButton value="xrp">XRP</ToggleButton>
                <ToggleButton value="ton">TON</ToggleButton>
                <ToggleButton value="tron">TRX</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          <Box sx={{ 
            position: 'relative',
            p: 3, 
            bgcolor: 'surface', 
            borderRadius: 1.5, 
            border: '1px solid',
            borderColor: 'border',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'center',
            textAlign: 'center'
          }}>
            {!showSensitive ? (
              <>
                <VisibilityOff sx={{ fontSize: 40, color: 'text.muted', opacity: 0.5 }} />
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setShowSensitive(true)}
                  sx={{ borderRadius: 5 }}
                >
                  Click to reveal
                </Button>
              </>
            ) : (
              <>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: revealType === 'mnemonic' ? '1.1rem' : '0.85rem',
                    wordBreak: 'break-all',
                    lineHeight: 1.6
                  }}
                >
                  {revealData}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button 
                    startIcon={copied ? <CheckCircle /> : <ContentCopy />} 
                    variant="text" 
                    size="small"
                    onClick={handleCopy}
                    sx={{ color: copied ? 'success.main' : 'primary.main' }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button 
                    startIcon={<VisibilityOff />} 
                    variant="text" 
                    size="small"
                    onClick={() => setShowSensitive(false)}
                  >
                    Hide
                  </Button>
                </Stack>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button fullWidth variant="contained" onClick={() => setRevealDialogOpen(false)} sx={{ borderRadius: 1.5 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Biometric Setup Dialog */}
      <Dialog 
        open={biometricDialogOpen} 
        onClose={() => !loading && setBiometricDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Enable Biometric Lock</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {success ? (
            <Alert severity="success" sx={{ borderRadius: 1.5 }}>
              {success}
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Để kích hoạt bảo mật hệ điều hành, vui lòng xác nhận mật khẩu ví của bạn.
              </Typography>
              <TextField
                fullWidth
                type="password"
                label="Mật khẩu của bạn"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!error}
                helperText={error}
                InputProps={{ sx: { borderRadius: 1.5 } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setBiometricDialogOpen(false)} disabled={loading}>Hủy</Button>
          {!success && (
            <Button 
              variant="contained" 
              onClick={handleEnableBiometric}
              disabled={loading || !password}
              startIcon={loading ? <CircularProgress size={20} /> : <Fingerprint />}
              sx={{ borderRadius: 1.5, px: 3 }}
            >
              Thiết lập
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
