'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import { 
  Box, Typography, Button, IconButton, Paper, 
  Avatar, CircularProgress, TextField, InputAdornment, 
  Stack, Divider, List, ListItem, ListItemAvatar, ListItemText,
  Badge, Menu, MenuItem, Dialog, DialogTitle, DialogContent, 
  DialogActions, Tooltip
} from '@mui/material';
import { 
  LockOutlined, 
  CopyAll, 
  QrCode2, 
  Send, 
  CallReceived, 
  Settings, 
  Refresh, 
  CheckCircle,
  AccountBalanceWallet,
  ExpandMore,
  History,
  NorthEast,
  SouthWest,
  Logout
} from '@mui/icons-material';
import { getChain, CHAINS } from '@/lib/blockchain/chains';
import { QRCodeSVG } from 'qrcode.react';

/**
 * MG Wallet - Dashboard
 * Main interaction hub for the wallet
 */
export default function DashboardPage() {
  const router = useRouter();
  const { 
    address, encryptedWallet, isLocked, chainId, balance,
    unlock, lock, updateBalance, setChainId, reset
  } = useWalletStore();

  const [password, setPassword] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkMenuAnchor, setNetworkMenuAnchor] = useState<null | HTMLElement>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!encryptedWallet || !address) {
      router.replace('/');
    } else if (!isLocked) {
      updateBalance();
    }
  }, [encryptedWallet, address, isLocked, router, updateBalance]);

  const { decryptedWallet } = useWalletStore();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockLoading(true);
    setError('');
    const success = await unlock(password);
    if (!success) {
      setError('Incorrect password');
    }
    setUnlockLoading(false);
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 20000);
    }
  };

  const handleSend = async () => {
    if (!decryptedWallet || !recipient || !amount) return;
    
    setTxLoading(true);
    setError('');
    try {
      const { JsonRpcProvider, parseUnits } = await import('ethers');
      const provider = new JsonRpcProvider(currentChain.rpc);
      const walletWithProvider = decryptedWallet.connect(provider);
      
      const tx = await walletWithProvider.sendTransaction({
        to: recipient,
        value: parseUnits(amount, 'ether'),
      });
      
      setTxHash(tx.hash);
      await tx.wait();
      updateBalance();
      setSendDialogOpen(false);
      alert(`Transaction successful! Hash: ${tx.hash}`);
    } catch (e: any) {
      setError(e.message || 'Transaction failed');
    } finally {
      setTxLoading(false);
    }
  };

  const currentChain = getChain(chainId);

  // --- UNLOCK SCREEN ---
  if (isLocked) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4, pt: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box className="gradient-bg" sx={{ 
            width: 80, height: 80, borderRadius: '20px', 
            mx: 'auto', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <LockOutlined sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={800}>Unlock MG Wallet</Typography>
          <Typography variant="body2" sx={{ color: 'text.muted', mt: 1 }}>
            Enter your password to access your wallet
          </Typography>
        </Box>

        <form onSubmit={handleUnlock}>
          <TextField
            fullWidth
            label="Password"
            type="password"
            autoFocus
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
            helperText={error}
            InputProps={{ sx: { borderRadius: 3 } }}
          />
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            color="primary"
            type="submit"
            disabled={unlockLoading || !password}
            sx={{ borderRadius: '16px', py: 2, fontSize: '1.1rem', mt: 4 }}
          >
            {unlockLoading ? <CircularProgress size={24} color="inherit" /> : 'Unlock'}
          </Button>
        </form>

        <Box sx={{ mt: 'auto', textAlign: 'center' }}>
          <Button onClick={reset} color="error" size="small">Reset Wallet</Button>
        </Box>
      </Box>
    );
  }

  // --- DASHBOARD UI ---
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'surface' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 16 }}>MG</Avatar>
          <Typography variant="subtitle1" fontWeight={700}>MG Wallet</Typography>
        </Box>
        <Box>
          <Button 
            size="small" 
            variant="outlined" 
            endIcon={<ExpandMore />}
            onClick={(e) => setNetworkMenuAnchor(e.currentTarget)}
            sx={{ borderRadius: 20, borderColor: 'border', color: 'text.primary', bgcolor: 'surface' }}
          >
            {currentChain.name}
          </Button>
          <Menu
            anchorEl={networkMenuAnchor}
            open={Boolean(networkMenuAnchor)}
            onClose={() => setNetworkMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: 3, mt: 1, minWidth: 200 } }}
          >
            {Object.values(CHAINS).map((chain) => (
              <MenuItem 
                key={chain.id} 
                onClick={() => { setChainId(chain.id); setNetworkMenuAnchor(null); }}
                selected={chainId === chain.id}
              >
                <ListItemAvatar sx={{ minWidth: 36 }}>
                  <Avatar src={chain.logo} sx={{ width: 24, height: 24 }} />
                </ListItemAvatar>
                <ListItemText primary={chain.name} />
              </MenuItem>
            ))}
          </Menu>
          <IconButton size="small" onClick={lock} sx={{ ml: 1 }}>
            <Logout sx={{ fontSize: 20, color: 'text.muted' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Balance Card */}
      <Box sx={{ p: 3, pt: 4, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.muted', letterSpacing: 1, fontWeight: 700 }}>
          TOTAL BALANCE
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, mt: 1, mb: 1 }}>
          {balance} <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>{currentChain.symbol}</span>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.muted', fontFamily: 'monospace' }}>
            {address?.slice(0, 6)}...{address?.slice(-6)}
          </Typography>
          <IconButton size="small" onClick={handleCopy}>
            {copied ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} /> : <CopyAll sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-around', gap: 2 }}>
        <Stack alignItems="center" gap={1}>
          <Box className="gradient-bg" sx={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 16px rgba(255, 0, 122, 0.2)' }} onClick={() => setSendDialogOpen(true)}>
            <Send sx={{ color: 'white' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Send</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setReceiveDialogOpen(true)}>
            <CallReceived sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Receive</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => updateBalance()}>
            <Refresh sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Refresh</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Settings sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Settings</Typography>
        </Stack>
      </Box>

      {/* Assets / Activity Tabs */}
      <Paper sx={{ mt: 3, flex: 1, borderRadius: '32px 32px 0 0', p: 2, boxShadow: '0 -4px 20px rgba(0,0,0,0.03)' }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', gap: 3, borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ pb: 1, borderBottom: 2, borderColor: 'primary.main', color: 'primary.main' }}>Assets</Typography>
          <Typography variant="subtitle2" fontWeight={700} sx={{ pb: 1, color: 'text.muted' }}>Activity</Typography>
        </Box>

        <List>
          <ListItem 
            sx={{ px: 1, borderRadius: 3, '&:hover': { bgcolor: 'surface' } }}
            secondaryAction={
              <Box textAlign="right">
                <Typography fontWeight={700}>{balance}</Typography>
                <Typography variant="caption" color="text.muted">$0.00</Typography>
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar src={currentChain.logo} />
            </ListItemAvatar>
            <ListItemText primary={currentChain.symbol} secondary={currentChain.name} />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, textAlign: 'center', p: 4 }}>
          <History sx={{ fontSize: 48, color: 'text.muted', opacity: 0.3, mb: 1 }} />
          <Typography variant="body2" color="text.muted">No recent activity</Typography>
        </Box>
      </Paper>

      {/* Receive Dialog */}
      <Dialog 
        open={receiveDialogOpen} 
        onClose={() => setReceiveDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 350 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Receive {currentChain.symbol}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 3, border: '1px solid', borderColor: 'border', mb: 3 }}>
            <QRCodeSVG value={address || ''} size={200} />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.muted', mb: 1 }}>WALLET ADDRESS</Typography>
          <Paper 
            onClick={handleCopy}
            sx={{ 
              p: 1.5, px: 2, borderRadius: 3, bgcolor: 'surface', 
              border: '1px solid', borderColor: 'border', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 1, maxWidth: '100%',
              '&:active': { bgcolor: 'divider' }
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
              {address}
            </Typography>
            <CopyAll sx={{ fontSize: 16, color: 'primary.main' }} />
          </Paper>
          {copied && (
            <Typography variant="caption" sx={{ color: 'success.main', mt: 1, fontWeight: 700 }}>
              Address copied to clipboard!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button fullWidth variant="contained" onClick={() => setReceiveDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
      {/* Send Dialog */}
      <Dialog 
        open={sendDialogOpen} 
        onClose={() => setSendDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Send {currentChain.symbol}</DialogTitle>
        <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="Recipient Address"
            placeholder="0x..."
            variant="outlined"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            InputProps={{ sx: { borderRadius: 3 } }}
          />
          <TextField
            fullWidth
            label="Amount"
            placeholder="0.0"
            variant="outlined"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputProps={{ 
              sx: { borderRadius: 3 },
              endAdornment: <InputAdornment position="end">{currentChain.symbol}</InputAdornment>
            }}
          />
          {error && (
            <Typography variant="caption" color="error" sx={{ px: 1 }}>{error}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setSendDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            disableElevation
            onClick={handleSend}
            disabled={txLoading || !recipient || !amount}
            sx={{ borderRadius: 3, px: 4 }}
          >
            {txLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
