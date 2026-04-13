'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Box, Typography, IconButton, Paper, 
  Avatar, Button, Stack, List, ListItem, 
  ListItemAvatar, ListItemText, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Divider
} from '@mui/material';
import { 
  ArrowBack, 
  Send, 
  CallReceived, 
  SwapHoriz,
  History,
  NorthEast,
  SouthWest,
  CopyAll,
  CheckCircle,
  QrCode2,
  Refresh
} from '@mui/icons-material';
import { useWalletStore } from '@/store/useWalletStore';
import { getChain, DEFAULT_CHAINS } from '@/lib/blockchain/chains';
import { QRCodeSVG } from 'qrcode.react';

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const chainId = parseInt(params.chainId as string);
  const address = params.address as string;

  const { 
    wallets, activeWalletId, balance, tokenBalances, updateBalance,
    updateTransactions, transactions, prices, networks, decryptedWallet
  } = useWalletStore();

  const [loading, setLoading] = useState(true);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentChain = useMemo(() => networks.find(n => n.id === chainId) || getChain(chainId), [chainId, networks]);
  const activeWallet = useMemo(() => wallets.find(w => w.id === activeWalletId), [wallets, activeWalletId]);

  const asset = useMemo(() => {
    if (address === 'native') {
      return {
        symbol: currentChain.symbol,
        name: currentChain.name,
        balance: balance,
        price: prices[currentChain.symbol.toLowerCase()] || 0, // Fallback if price fetch is complex
        logo: currentChain.logo,
        decimals: 18,
        address: 'native'
      };
    }
    const token = tokenBalances.find(t => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId);
    return token;
  }, [address, chainId, currentChain, balance, tokenBalances, prices]);

  const displayAddress = useMemo(() => {
    if (!activeWallet) return '';
    const type = currentChain.type;
    const addr = activeWallet.addresses;
    if (type === 'evm') return addr.evm;
    if (type === 'bitcoin') {
        if (currentChain.symbol === 'LTC') return addr.ltc;
        return currentChain.bitcoinType === 'segwit' ? addr.btcSegwit : addr.btcTaproot;
    }
    if (type === 'solana') return addr.solana;
    if (type === 'bitcoin-cash') return addr.bch;
    return (addr as any)[type] || addr.evm;
  }, [activeWallet, currentChain]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await updateBalance();
      await updateTransactions(address);
      setLoading(false);
    };
    init();
  }, [address, chainId, updateBalance, updateTransactions]);

  const handleCopy = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !asset) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const usdValue = (parseFloat(asset.balance) * (asset.price || 0)).toFixed(2);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'surface', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>{asset.symbol}</Typography>
        <IconButton sx={{ ml: 'auto' }} onClick={() => updateTransactions(address)}>
            <Refresh />
        </IconButton>
      </Box>

      {/* Asset Info */}
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Avatar src={asset.logo} sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            {asset.symbol[0]}
        </Avatar>
        <Typography variant="h3" fontWeight={800}>{parseFloat(asset.balance).toFixed(4)} {asset.symbol}</Typography>
        <Typography variant="h6" color="text.muted" sx={{ mt: 0.5 }}>${usdValue}</Typography>
        <Box sx={{ mt: 1 }}>
            <Chip label={currentChain.name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>
      </Box>

      {/* Actions */}
      <Box sx={{ px: 3, mb: 4, display: 'flex', justifyContent: 'center', gap: 5 }}>
        <Stack alignItems="center" gap={1}>
          <IconButton 
            onClick={() => router.push(`/dashboard?action=send&token=${address}&chainId=${chainId}`)}
            sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <Send />
          </IconButton>
          <Typography variant="caption" fontWeight={700}>Gửi</Typography>
        </Stack>
        <Stack alignItems="center" gap={1}>
          <IconButton 
            onClick={() => setReceiveOpen(true)}
            sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <CallReceived />
          </IconButton>
          <Typography variant="caption" fontWeight={700}>Nhận</Typography>
        </Stack>
        {currentChain.type === 'evm' && (
          <Stack alignItems="center" gap={1}>
            <IconButton 
              onClick={() => router.push(`/dashboard/swap?fromTokenAddress=${address === 'native' ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : address}`)}
              sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              <SwapHoriz />
            </IconButton>
            <Typography variant="caption" fontWeight={700}>Swap</Typography>
          </Stack>
        )}
      </Box>

      {/* Transaction History */}
      <Paper sx={{ flex: 1, borderRadius: '24px 24px 0 0', p: 3, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ fontSize: 20 }} /> Lịch sử giao dịch
        </Typography>
        
        {transactions.length > 0 ? (
          <List>
            {transactions.map((tx) => {
              const isSent = tx.from.toLowerCase() === displayAddress?.toLowerCase();
              return (
                <ListItem key={tx.hash} sx={{ px: 0, py: 1.5 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: isSent ? 'rgba(255, 0, 122, 0.1)' : 'rgba(76, 175, 80, 0.1)' }}>
                      {isSent ? 
                        <NorthEast sx={{ color: 'primary.main', fontSize: 20 }} /> : 
                        <SouthWest sx={{ color: 'success.main', fontSize: 20 }} />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={isSent ? 'Gửi thành công' : 'Đã nhận'} 
                    secondary={new Date(parseInt(tx.timeStamp) * 1000).toLocaleString()} 
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <Box textAlign="right">
                    <Typography variant="body2" fontWeight={700} color={isSent ? 'text.primary' : 'success.main'}>
                      {isSent ? '-' : '+'}{parseFloat(tx.value).toFixed(asset.decimals === 8 ? 8 : 4)} {asset.symbol}
                    </Typography>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        ) : (
          <Box sx={{ mt: 8, textAlign: 'center', opacity: 0.5 }}>
            <History sx={{ fontSize: 64, mb: 1, color: 'text.muted' }} />
            <Typography color="text.muted">Chưa có giao dịch nào</Typography>
          </Box>
        )}
      </Paper>

      {/* Receive Dialog */}
      <Dialog 
        open={receiveOpen} 
        onClose={() => setReceiveOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 360 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 800 }}>Nhận {asset.symbol}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <QRCodeSVG value={displayAddress || ''} size={220} />
          </Box>
          <Typography variant="caption" color="text.muted" sx={{ mb: 1 }}>ĐỊA CHỈ VÍ CỦA BẠN</Typography>
          <Paper 
            onClick={handleCopy}
            sx={{ 
              p: 1.5, px: 2, borderRadius: 2, bgcolor: 'surface', 
              border: '1px solid', borderColor: 'divider', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 1, width: '100%',
              '&:active': { bgcolor: 'divider' }
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', flex: 1 }}>
              {displayAddress}
            </Typography>
            {copied ? <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} /> : <CopyAll sx={{ fontSize: 18, color: 'primary.main' }} />}
          </Paper>
          <Typography variant="caption" sx={{ mt: 2, color: 'text.muted', textAlign: 'center' }}>
            Chỉ gửi <Typography component="span" variant="caption" fontWeight={700}>{asset.symbol}</Typography> trên mạng lưới <Typography component="span" variant="caption" fontWeight={700}>{currentChain.name}</Typography> đến địa chỉ này.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button fullWidth variant="contained" size="large" onClick={() => setReceiveOpen(false)} sx={{ borderRadius: 2 }}>Xong</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
