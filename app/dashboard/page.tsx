'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import { CHAIN_PRICE_IDS } from '@/lib/blockchain/prices';
import { 
  Box, Typography, Button, IconButton, Paper, 
  Avatar, CircularProgress, TextField, InputAdornment, 
  Stack, Divider, List, ListItem, ListItemAvatar, ListItemText,
  Badge, Menu, MenuItem, Dialog, DialogTitle, DialogContent, 
  DialogActions, Tooltip, ToggleButton, ToggleButtonGroup, Chip
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
  Logout,
  Person,
  SwapHoriz,
  Edit,
  Delete
} from '@mui/icons-material';
import { getChain, DEFAULT_CHAINS } from '@/lib/blockchain/chains';
import { QRCodeSVG } from 'qrcode.react';

/**
 * MG Wallet - Dashboard
 * Main interaction hub for the wallet
 */
export default function DashboardPage() {
  const router = useRouter();
  const { 
    address, encryptedWallet, isLocked, chainId, balance, tokenBalances,
    unlock, lock, updateBalance, setChainId, reset, prices, transactions,
    addToken, addressBook, networks, removeNetwork
  } = useWalletStore();

  const [password, setPassword] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkMenuAnchor, setNetworkMenuAnchor] = useState<null | HTMLElement>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [addTokenDialogOpen, setAddTokenDialogOpen] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [gasPriority, setGasPriority] = useState<'slow' | 'average' | 'fast'>('average');
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'activity'>('assets');

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
  const cgId = CHAIN_PRICE_IDS[chainId];
  const nativePrice = prices[cgId] || 0;
  
  // Calculate total portfolio USD value (native + tokens)
  const nativeUsd = parseFloat(balance) * nativePrice;
  const tokensUsd = tokenBalances.reduce((sum, token) => {
    // Note: In a real app, you'd fetch prices for each token contract address
    // For now, we'll use the native price as a placeholder or 0 if not available
    return sum + (parseFloat(token.balance) * 0); // Placeholder for token pricing
  }, 0);
  
  const portfolioUsd = (nativeUsd + tokensUsd).toFixed(2);

  // --- UNLOCK SCREEN ---
  if (isLocked) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4, pt: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box className="gradient-bg" sx={{ 
            width: 80, height: 80, borderRadius: 2, 
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
            InputProps={{ sx: { borderRadius: 1.5 } }}
          />
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            color="primary"
            type="submit"
            disabled={unlockLoading || !password}
            sx={{ borderRadius: 1.5, py: 2, fontSize: '1.1rem', mt: 4 }}
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
            sx={{ borderRadius: 1, borderColor: 'border', color: 'text.primary', bgcolor: 'surface' }}
          >
            {currentChain.name}
          </Button>
          <Menu
            anchorEl={networkMenuAnchor}
            open={Boolean(networkMenuAnchor)}
            onClose={() => setNetworkMenuAnchor(null)}
            PaperProps={{ sx: { borderRadius: 1.5, mt: 1, minWidth: 220 } }}
          >
            <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.muted' }}>Network Selection</Typography>
            {networks.map((chain: any) => (
              <MenuItem 
                key={chain.id} 
                selected={chainId === chain.id}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  gap: 1,
                  py: 1.5
                }}
              >
                <Box 
                  onClick={() => { setChainId(chain.id); setNetworkMenuAnchor(null); }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}
                >
                  <Avatar 
                    src={chain.logo} 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      bgcolor: chain.logo ? 'transparent' : 'secondary.main',
                      fontSize: 12
                    }}
                  >
                    {!chain.logo && chain.symbol[0]}
                  </Avatar>
                  <ListItemText 
                    primary={chain.name} 
                    secondary={chain.rpc.length > 25 ? chain.rpc.substring(0, 22) + '...' : chain.rpc}
                    secondaryTypographyProps={{ fontSize: '0.65rem' }} 
                  />
                </Box>
                <Stack direction="row">
                  <IconButton 
                    size="small" 
                    onClick={(e) => { e.stopPropagation(); router.push('/dashboard/networks'); setNetworkMenuAnchor(null); }}
                  >
                    <Edit sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={(e) => { e.stopPropagation(); removeNetwork(chain.id); }}
                    disabled={networks.length <= 1}
                  >
                    <Delete sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              </MenuItem>
            ))}
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={() => { router.push('/dashboard/networks'); setNetworkMenuAnchor(null); }}>
              <ListItemAvatar sx={{ minWidth: 36 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent', border: '1px dashed', borderColor: 'primary.main' }}>
                  <Settings sx={{ fontSize: 14, color: 'primary.main' }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Manage Networks" sx={{ color: 'primary.main' }} />
            </MenuItem>
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
        <Typography variant="h2" sx={{ fontWeight: 800, mt: 1, mb: 0 }}>
          {parseFloat(balance).toFixed(6)} <span style={{ fontSize: '1.5rem', fontWeight: 500 }}>{currentChain.symbol}</span>
        </Typography>
        <Typography variant="h6" sx={{ color: 'text.muted', fontWeight: 600, mb: 1 }}>
          ${portfolioUsd}
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
          <Box className="gradient-bg" sx={{ width: 56, height: 56, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 16px rgba(255, 0, 122, 0.2)' }} onClick={() => setSendDialogOpen(true)}>
            <Send sx={{ color: 'white' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Send</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setReceiveDialogOpen(true)}>
            <CallReceived sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Receive</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => router.push('/dashboard/swap')}>
            <SwapHoriz sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Swap</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => updateBalance()}>
            <Refresh sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Refresh</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <Box 
            onClick={() => router.push('/dashboard/address-book')}
            sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'border', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Person sx={{ color: 'primary.main' }} />
          </Box>
          <Typography variant="caption" fontWeight={600}>Contacts</Typography>
        </Stack>
      </Box>

      {/* Assets / Activity Tabs */}
      <Paper sx={{ mt: 3, flex: 1, borderRadius: '12px 12px 0 0', p: 2, boxShadow: '0 -4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', gap: 3, borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Typography 
            variant="subtitle2" 
            fontWeight={700} 
            onClick={() => setActiveTab('assets')}
            sx={{ 
              pb: 1, cursor: 'pointer',
              borderBottom: activeTab === 'assets' ? 2 : 0, 
              borderColor: 'primary.main', 
              color: activeTab === 'assets' ? 'primary.main' : 'text.muted' 
            }}
          >
            Assets
          </Typography>
          <Typography 
            variant="subtitle2" 
            fontWeight={700} 
            onClick={() => setActiveTab('activity')}
            sx={{ 
              pb: 1, cursor: 'pointer',
              borderBottom: activeTab === 'activity' ? 2 : 0, 
              borderColor: 'primary.main', 
              color: activeTab === 'activity' ? 'primary.main' : 'text.muted' 
            }}
          >
            Activity
          </Typography>
        </Box>

        {activeTab === 'assets' ? (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List>
              {/* Native Asset */}
              <ListItem 
                sx={{ px: 1, borderRadius: 1.5, '&:hover': { bgcolor: 'surface' } }}
                secondaryAction={
                  <Box textAlign="right">
                    <Typography fontWeight={700}>{parseFloat(balance).toFixed(6)}</Typography>
                    <Typography variant="caption" color="text.muted">${portfolioUsd}</Typography>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar src={currentChain.logo} />
                </ListItemAvatar>
                <ListItemText primary={currentChain.symbol} secondary={currentChain.name} />
              </ListItem>

              {/* ERC20 Tokens */}
              {tokenBalances.map((token) => (
                <ListItem 
                  key={token.address}
                  sx={{ px: 1, borderRadius: 3, '&:hover': { bgcolor: 'surface' } }}
                  secondaryAction={
                    <Box textAlign="right">
                      <Typography fontWeight={700}>{parseFloat(token.balance).toFixed(4)}</Typography>
                      <Typography variant="caption" color="text.muted">$0.00</Typography>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar 
                      src={token.logo} 
                      sx={{ bgcolor: 'surface', color: 'text.primary', border: '1px solid', borderColor: 'border' }}
                    >
                      {token.symbol?.[0] || 'T'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={token.symbol} secondary={token.name} />
                </ListItem>
              ))}
            </List>
            <Button 
              fullWidth 
              variant="text" 
              size="small" 
              sx={{ mt: 2, color: 'primary.main', fontWeight: 700 }}
              onClick={() => setAddTokenDialogOpen(true)}
            >
              + Add Token
            </Button>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {transactions.length > 0 ? (
              <List>
                {transactions.map((tx) => (
                  <ListItem key={tx.hash} sx={{ px: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: tx.from.toLowerCase() === address?.toLowerCase() ? 'rgba(255, 0, 122, 0.1)' : 'rgba(76, 175, 80, 0.1)' }}>
                        {tx.from.toLowerCase() === address?.toLowerCase() ? 
                          <NorthEast sx={{ color: 'primary.main', fontSize: 20 }} /> : 
                          <SouthWest sx={{ color: 'success.main', fontSize: 20 }} />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={tx.from.toLowerCase() === address?.toLowerCase() ? 'Sent' : 'Received'} 
                      secondary={new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString()} 
                    />
                    <Box textAlign="right">
                      <Typography variant="body2" fontWeight={700}>
                        {(parseFloat(tx.value) / 1e18).toFixed(4)} {currentChain.symbol}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ mt: 4, textAlign: 'center', p: 4 }}>
                <History sx={{ fontSize: 48, color: 'text.muted', opacity: 0.3, mb: 1 }} />
                <Typography variant="body2" color="text.muted">No recent activity</Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Receive Dialog */}
      <Dialog 
        open={receiveDialogOpen} 
        onClose={() => setReceiveDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, width: '100%', maxWidth: 350 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Receive {currentChain.symbol}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1.5, border: '1px solid', borderColor: 'border', mb: 3 }}>
            <QRCodeSVG value={address || ''} size={200} />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.muted', mb: 1 }}>WALLET ADDRESS</Typography>
          <Paper 
            onClick={handleCopy}
            sx={{ 
              p: 1.5, px: 2, borderRadius: 1.5, bgcolor: 'surface', 
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
        PaperProps={{ sx: { borderRadius: 2, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Send {currentChain.symbol}</DialogTitle>
        <DialogContent sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.muted', mb: 1, display: 'block' }}>RECIPIENT</Typography>
            <TextField
              fullWidth
              placeholder="0x... or contact name"
              variant="outlined"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              InputProps={{ sx: { borderRadius: 1.5 } }}
            />
            {Object.keys(addressBook).length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(addressBook).slice(0, 3).map(([name, addr]) => (
                  <Chip 
                    key={addr} 
                    label={name} 
                    size="small" 
                    onClick={() => setRecipient(addr)}
                    sx={{ bgcolor: 'surface', border: '1px solid', borderColor: 'border' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.muted', mb: 1, display: 'block' }}>AMOUNT</Typography>
            <TextField
              fullWidth
              placeholder="0.0"
              variant="outlined"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{ 
                sx: { borderRadius: 3 },
                endAdornment: <InputAdornment position="end">{currentChain.symbol}</InputAdornment>
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.muted', mb: 1, display: 'block' }}>GAS PRIORITY</Typography>
            <ToggleButtonGroup
              fullWidth
              value={gasPriority}
              exclusive
              onChange={(_, v) => v && setGasPriority(v)}
              sx={{ bgcolor: 'surface', borderRadius: 1.5 }}
            >
              <ToggleButton value="slow" sx={{ py: 1 }}>Slow</ToggleButton>
              <ToggleButton value="average" sx={{ py: 1 }}>Avg</ToggleButton>
              <ToggleButton value="fast" sx={{ py: 1 }}>Fast</ToggleButton>
            </ToggleButtonGroup>
          </Box>

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
      {/* Add Token Dialog */}
      <Dialog 
        open={addTokenDialogOpen} 
        onClose={() => setAddTokenDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add Custom Token</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 0, 122, 0.05)', borderRadius: 2, display: 'flex', gap: 2 }}>
            <AccountBalanceWallet sx={{ color: 'primary.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Import tokens by entering their verified contract address.
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Contract Address"
            placeholder="0x..."
            variant="outlined"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            InputProps={{ sx: { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAddTokenDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              addToken({
                address: newTokenAddress,
                symbol: 'TOKEN',
                name: 'Imported Token',
                decimals: 18,
                chainId: chainId
              });
              setAddTokenDialogOpen(false);
              setNewTokenAddress('');
            }}
            disabled={!newTokenAddress.startsWith('0x')}
            sx={{ borderRadius: 3, px: 4 }}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
