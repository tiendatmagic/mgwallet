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
  Delete,
  Add,
  PhonelinkLock,
  Fingerprint
} from '@mui/icons-material';
import { getChain, DEFAULT_CHAINS, ALL_NETWORKS_ID } from '@/lib/blockchain/chains';
import { QRCodeSVG } from 'qrcode.react';

/**
 * MG Wallet - Dashboard
 * Main interaction hub for the wallet
 */
export default function DashboardPage() {
  const router = useRouter();
  const { 
    wallets, activeWalletId, chainId, balance, tokenBalances, isLocked,
    unlock, lock, updateBalance, setChainId, reset, prices, transactions,
    addToken, addressBook, networks, removeNetwork, sendBitcoin, sendSolana, sendBitcoinCash, sendLitecoin,
    switchWallet, addWallet, theme
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
  
  // Wallet Management State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [walletToManage, setWalletToManage] = useState<{id: string, name: string} | null>(null);
  const [newWalletName, setNewWalletName] = useState('');

  useEffect(() => {
    if (wallets.length === 0) {
      router.replace('/');
    } else if (!isLocked) {
      updateBalance();
    }
  }, [wallets.length, isLocked, router, updateBalance]);

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

  const handleBiometricUnlock = async () => {
    setUnlockLoading(true);
    setError('');
    try {
      const { unlockWithBiometric } = useWalletStore.getState();
      const success = await unlockWithBiometric();
      if (!success) {
        setError('Xác thực thất bại');
      }
    } catch (e: any) {
      setError(e.message || 'Xác thực thất bại');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleCopy = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = async () => {
    if (!decryptedWallet || !recipient || !amount) return;
    
    setTxLoading(true);
    setError('');
    
    try {
      if (currentChain.type === 'bitcoin') {
        // Need mnemonic for BTC signing
        const mnemonic = (decryptedWallet as any).mnemonic?.phrase;
        if (!mnemonic) {
          throw new Error('Bitcoin transactions require a mnemonic-based wallet. Private key imports are not supported for BTC yet.');
        }

        const txHash = await sendBitcoin(recipient, amount, mnemonic, gasPriority as any);
        setTxHash(txHash);
        updateBalance();
        setSendDialogOpen(false);
        alert(`Bitcoin transaction broadcasted! Hash: ${txHash}`);
        return;
      }

      if (currentChain.type === 'solana') {
        const mnemonic = (decryptedWallet as any).mnemonic?.phrase;
        if (!mnemonic) {
          throw new Error('Solana transactions require a mnemonic-based wallet.');
        }

        const signature = await sendSolana(recipient, amount, mnemonic);
        setTxHash(signature);
        updateBalance();
        setSendDialogOpen(false);
        alert(`Solana transaction successful! Signature: ${signature}`);
        return;
      }

      if (currentChain.type === 'bitcoin-cash') {
        const mnemonic = (decryptedWallet as any).mnemonic?.phrase;
        if (!mnemonic) {
          throw new Error('Bitcoin Cash transactions require a mnemonic-based wallet.');
        }

        const txid = await sendBitcoinCash(recipient, amount, mnemonic);
        setTxHash(txid);
        updateBalance();
        setSendDialogOpen(false);
        alert(`BCH transaction successful! TXID: ${txid}`);
        return;
      }

      if (currentChain.symbol === 'LTC') {
        const mnemonic = (decryptedWallet as any).mnemonic?.phrase;
        if (!mnemonic) {
          throw new Error('Litecoin transactions require a mnemonic-based wallet.');
        }

        const txid = await sendLitecoin(recipient, amount, mnemonic);
        setTxHash(txid);
        updateBalance();
        setSendDialogOpen(false);
        alert(`LTC transaction successful! TXID: ${txid}`);
        return;
      }

      const { JsonRpcProvider, parseUnits } = await import('ethers');
      const provider = new JsonRpcProvider(currentChain.rpc);
      const walletWithProvider = (decryptedWallet as any).connect(provider);
      
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

  const handleRenameWallet = () => {
    if (walletToManage && newWalletName.trim()) {
      useWalletStore.getState().updateWalletName(walletToManage.id, newWalletName.trim());
      setRenameDialogOpen(false);
      setWalletToManage(null);
    }
  };

  const handleDeleteWallet = () => {
    if (walletToManage) {
      const { wallets: currentWallets, removeWallet } = useWalletStore.getState();
      removeWallet(walletToManage.id);
      setDeleteDialogOpen(false);
      setWalletToManage(null);
      
      // If no wallets left, router replaces will trigger in useEffect
    }
  };

  const currentChain = getChain(chainId);
  const activeWallet = wallets.find(w => w.id === activeWalletId);
  const getDisplayAddress = () => {
    if (!activeWallet) return '';
    const type = currentChain.type;
    const addresses = activeWallet.addresses;

    if (type === 'evm') return addresses.evm;
    if (type === 'bitcoin') {
      if (currentChain.symbol === 'LTC') return addresses.ltc;
      return currentChain.bitcoinType === 'segwit' ? addresses.btcSegwit : addresses.btcTaproot;
    }
    if (type === 'solana') return addresses.solana;
    if (type === 'bitcoin-cash') return addresses.bch;
    
    // For other non-EVM chains (near, sui, ton, etc.), the type matches the address key
    return (addresses as any)[type] || addresses.evm;
  };

  const displayAddress = getDisplayAddress();

  const cgId = chainId === ALL_NETWORKS_ID ? '' : CHAIN_PRICE_IDS[chainId];
  const nativePrice = prices[cgId] || 0;
  
  // Calculate total portfolio USD value (native + tokens)
  const nativeUsd = parseFloat(balance) * nativePrice;
  const tokensUsd = tokenBalances.reduce((sum, token) => {
    return sum + token.usdValue;
  }, 0);
  
  const portfolioUsd = (nativeUsd + tokensUsd).toFixed(2);

  // --- UNLOCK SCREEN ---
  if (isLocked) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4, pt: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Box className="gradient-bg" sx={{ 
            width: 80, height: 80, borderRadius: 1.5, 
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
            sx={{ py: 2, fontSize: '1.1rem', mt: 4 }}
          >
            {unlockLoading ? <CircularProgress size={24} color="inherit" /> : 'Unlock'}
          </Button>

          {useWalletStore.getState().isBiometricEnabled && (
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleBiometricUnlock}
              disabled={unlockLoading}
              startIcon={<Fingerprint />}
              sx={{ py: 2, mt: 2, fontSize: '1.1rem' }}
            >
              Mở khóa bằng vân tay/PIN
            </Button>
          )}
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
          <IconButton onClick={() => setNetworkMenuAnchor(null)}>
             <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{activeWallet?.name[0]}</Avatar>
          </IconButton>
          <Box sx={{ cursor: 'pointer' }} onClick={(e) => setNetworkMenuAnchor(e.currentTarget)}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center' }}>
              {activeWallet?.name} <ExpandMore sx={{ fontSize: 16 }} />
            </Typography>
            <Typography variant="caption" color="text.muted" sx={{ fontSize: '0.65rem' }}>
              Multi-Coin Wallet
            </Typography>
          </Box>
        </Box>
        <Box>
          <IconButton size="small" onClick={() => router.push('/dashboard/networks')} sx={{ bgcolor: 'surface', mr: 1 }}>
            {(() => {
              if (chainId === ALL_NETWORKS_ID) {
                return (
                  <Avatar sx={{ width: 22, height: 22, bgcolor: 'primary.main' }}>
                    <Box component="img" src="/logo.png" sx={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                  </Avatar>
                );
              }
              const defaultChain = DEFAULT_CHAINS[currentChain.id];
              const logoSrc = defaultChain?.logo || currentChain.logo;
              return (
                <Avatar src={logoSrc} sx={{ width: 22, height: 22 }}>
                  {currentChain.symbol[0]}
                </Avatar>
              );
            })()}
          </IconButton>
          <IconButton size="small" onClick={() => router.push('/dashboard/settings')}>
            <Settings sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Wallet / Network Selector Menu */}
      <Menu
        anchorEl={networkMenuAnchor}
        open={Boolean(networkMenuAnchor)}
        onClose={() => setNetworkMenuAnchor(null)}
        PaperProps={{ sx: { borderRadius: 1.5, mt: 1, minWidth: 280, p: 1 } }}
      >
        <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.muted' }}>CHỌN VÍ</Typography>
        {wallets.map((w) => (
          <MenuItem 
            key={w.id} 
            selected={activeWalletId === w.id}
            onClick={() => { switchWallet(w.id); setNetworkMenuAnchor(null); }}
            sx={{ 
              borderRadius: 1, 
              my: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pr: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <ListItemAvatar>
                <Avatar sx={{ 
                  width: 36, height: 36,
                  bgcolor: 'transparent'
                }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={w.name} 
                secondary="Multi-Coin Wallet" 
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  setWalletToManage({ id: w.id, name: w.name });
                  setNewWalletName(w.name);
                  setRenameDialogOpen(true);
                  setNetworkMenuAnchor(null);
                }}
              >
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton 
                size="small" 
                color="error"
                disabled={wallets.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setWalletToManage({ id: w.id, name: w.name });
                  setDeleteDialogOpen(true);
                  setNetworkMenuAnchor(null);
                }}
              >
                <Delete sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => { router.push('/onboarding'); setNetworkMenuAnchor(null); }} sx={{ borderRadius: 1 }}>
           <ListItemText primary="+ Thêm ví mới" sx={{ color: 'primary.main', fontWeight: 600 }} />
        </MenuItem>
      </Menu>

      {/* Balance Card */}
      <Box sx={{ p: 3, pt: 1, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mt: 1, mb: 0 }}>
          ${portfolioUsd}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'text.muted', fontWeight: 600 }}>
             {activeWallet?.name}
          </Typography>
          <Chip 
            label={`${displayAddress?.slice(0, 6)}...${displayAddress?.slice(-4)}`} 
            size="small" 
            onClick={handleCopy}
            onDelete={handleCopy}
            deleteIcon={copied ? <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} /> : <CopyAll sx={{ fontSize: 14 }} />}
            sx={{ height: 24, borderRadius: 1.5, bgcolor: 'surface', fontWeight: 600 }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1, gap: 0.5 }}>
          <PhonelinkLock sx={{ fontSize: 12, color: 'success.main' }} />
          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Device Locked
          </Typography>
        </Box>
      </Box>

       {/* Actions */}
      <Box sx={{ px: 3, py: 1, display: 'flex', justifyContent: 'center', gap: 4 }}>
        <Stack alignItems="center" gap={1}>
          <IconButton 
            onClick={() => setSendDialogOpen(true)}
            sx={{ width: 50, height: 50, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <Send />
          </IconButton>
          <Typography variant="caption" fontWeight={700}>Gửi</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <IconButton 
            onClick={() => setReceiveDialogOpen(true)}
            sx={{ width: 50, height: 50, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <CallReceived />
          </IconButton>
          <Typography variant="caption" fontWeight={700}>Nhận</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <IconButton 
            onClick={() => router.push('/dashboard/swap')}
            sx={{ width: 50, height: 50, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <SwapHoriz />
          </IconButton>
          <Typography variant="caption" fontWeight={700}>Swap</Typography>
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
              {/* Native Asset (only shown for single chain) */}
              {chainId !== ALL_NETWORKS_ID && (
                <ListItem 
                  sx={{ px: 1, borderRadius: 1.5, '&:hover': { bgcolor: 'surface' } }}
                  secondaryAction={
                    <Box textAlign="right">
                      <Typography fontWeight={700}>{parseFloat(balance).toFixed(4)} {currentChain.symbol}</Typography>
                      <Typography variant="caption" color="text.muted">${nativeUsd.toFixed(2)}</Typography>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    {(() => {
                      const defaultChain = DEFAULT_CHAINS[currentChain.id];
                      const logoSrc = defaultChain?.logo || currentChain.logo;
                      return (
                        <Avatar src={logoSrc}>
                          {currentChain.symbol[0]}
                        </Avatar>
                      );
                    })()}
                  </ListItemAvatar>
                  <ListItemText 
                    primary={currentChain.name} 
                    secondary={`$${nativePrice.toLocaleString()}`} 
                  />
                </ListItem>
              )}

              {/* ERC20 Tokens */}
              {tokenBalances.filter(t => t.isVisible).map((token) => (
                <ListItem 
                  key={token.address}
                  sx={{ px: 1, borderRadius: 1.5, '&:hover': { bgcolor: 'surface' } }}
                  secondaryAction={
                    <Box textAlign="right">
                      <Typography fontWeight={700}>{parseFloat(token.balance).toFixed(4)} {token.symbol}</Typography>
                      <Typography variant="caption" color="text.muted">${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar 
                        src={token.logo} 
                        sx={{ bgcolor: 'surface', color: 'text.primary' }}
                      >
                        {token.symbol?.[0] || 'T'}
                      </Avatar>
                      {(() => {
                        const tokenChainId = token.chainId;
                        const tokenChain = networks.find(n => n.id === tokenChainId) || getChain(tokenChainId);
                        const defaultChain = DEFAULT_CHAINS[tokenChainId];
                        const logoSrc = defaultChain?.logo || tokenChain?.logo;
                        return (
                          <Avatar 
                            src={logoSrc} 
                            sx={{ 
                              width: 14, 
                              height: 14, 
                              position: 'absolute', 
                              bottom: 0, 
                              right: 0, 
                              border: '1.5px solid',
                              borderColor: 'background.paper',
                              bgcolor: 'secondary.main',
                              fontSize: 8
                            }}
                          >
                            {tokenChain?.symbol?.[0] || '?'}
                          </Avatar>
                        );
                      })()}
                    </Box>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={token.symbol} 
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.muted">${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</Typography>
                        {chainId === ALL_NETWORKS_ID && (
                          <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontSize: '0.6rem' }}>
                            {(networks.find(n => n.id === token.chainId) || getChain(token.chainId))?.name}
                          </Typography>
                        )}
                      </Box>
                    } 
                  />
                </ListItem>
              ))}
            </List>
            <Button 
              fullWidth 
              variant="text" 
              size="small" 
              sx={{ mt: 2, color: 'primary.main', fontWeight: 700 }}
              onClick={() => router.push('/manage-tokens')}
            >
              Quản lý token
            </Button>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {transactions.length > 0 ? (
              <List>
                {transactions.map((tx) => {
                  const isSent = tx.from.toLowerCase() === displayAddress?.toLowerCase();
                  return (
                    <ListItem key={tx.hash} sx={{ px: 1 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: isSent ? 'rgba(255, 0, 122, 0.1)' : 'rgba(76, 175, 80, 0.1)' }}>
                          {isSent ? 
                            <NorthEast sx={{ color: 'primary.main', fontSize: 20 }} /> : 
                            <SouthWest sx={{ color: 'success.main', fontSize: 20 }} />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={isSent ? 'Sent' : 'Received'} 
                        secondary={new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString()} 
                      />
                      <Box textAlign="right">
                        <Typography variant="body2" fontWeight={700}>
                          {parseFloat(tx.value).toFixed(currentChain.type === 'bitcoin' ? 8 : 4)} {currentChain.symbol}
                        </Typography>
                      </Box>
                    </ListItem>
                  );
                })}
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
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 350 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Receive {currentChain.symbol}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1.5, border: '1px solid', borderColor: 'border', mb: 3 }}>
            <QRCodeSVG value={displayAddress || ''} size={200} />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.muted', mb: 1 }}>
            {currentChain.bitcoinType ? `BITCOIN ${currentChain.bitcoinType.toUpperCase()} ADDRESS` : 'WALLET ADDRESS'}
          </Typography>
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
              {displayAddress}
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
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 400 } }}
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
                sx: { borderRadius: 1.5 },
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
            sx={{ borderRadius: 1.5, px: 4 }}
          >
            {txLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Token Dialog */}
      <Dialog 
        open={addTokenDialogOpen} 
        onClose={() => setAddTokenDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add Custom Token</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 0, 122, 0.05)', borderRadius: 1.5, display: 'flex', gap: 2 }}>
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
            sx={{ borderRadius: 1.5, px: 4 }}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Wallet Dialog */}
      <Dialog 
        open={renameDialogOpen} 
        onClose={() => setRenameDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 350 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Sửa tên ví</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <TextField
            fullWidth
            autoFocus
            label="Tên ví mới"
            variant="outlined"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            sx={{ mt: 1 }}
            InputProps={{ sx: { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setRenameDialogOpen(false)}>Hủy</Button>
          <Button 
            variant="contained" 
            onClick={handleRenameWallet}
            disabled={!newWalletName.trim() || newWalletName === walletToManage?.name}
            sx={{ borderRadius: 1.5 }}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Wallet Confirmation */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 350 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>Xóa ví?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa ví <strong>{walletToManage?.name}</strong>? 
            Hành động này không thể hoàn tác nếu bạn không có Secret Phrase.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteWallet}
            sx={{ borderRadius: 1.5 }}
          >
            Xóa ngay
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
