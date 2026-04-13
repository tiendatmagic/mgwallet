'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Box, Typography, IconButton, Paper, 
  Avatar, Button, TextField, CircularProgress, 
  Stack, Divider, Dialog, DialogTitle, List, 
  ListItem, ListItemAvatar, ListItemText, InputAdornment,
  Alert, Tooltip, ListItemButton
} from '@mui/material';
import { 
  ArrowBack, 
  SwapVert, 
  Settings, 
  KeyboardArrowDown, 
  InfoOutlined, 
  CheckCircle,
  ErrorOutline,
  SwapHoriz
} from '@mui/icons-material';
import { useWalletStore } from '@/store/useWalletStore';
import { POPULAR_TOKENS, Token } from '@/lib/blockchain/tokens';
import { getChain } from '@/lib/blockchain/chains';
import { parseUnits, Contract } from 'ethers';

const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export default function SwapPage() {
  const router = useRouter();
  const { 
    chainId, wallets, activeWalletId, decryptedWallet, balance, tokenBalances, networks 
  } = useWalletStore();
  const activeWallet = wallets.find(w => w.id === activeWalletId);
  const address = activeWallet?.addresses.evm || '';
  const currentChain = networks.find(n => n.id === chainId) || getChain(chainId);

  // States
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<any>(null);
  
  // Dialogs
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [selectorTarget, setSelectorTarget] = useState<'from' | 'to'>('from');

  const searchParams = useSearchParams();
  const initialFromTokenAddress = searchParams.get('fromTokenAddress');

  // Initialize tokens
  useEffect(() => {
    const native: Token = {
      address: NATIVE_TOKEN_ADDRESS,
      symbol: currentChain.symbol,
      name: currentChain.name,
      decimals: 18,
      logo: currentChain.logo,
      chainId
    };
    
    const tokens = POPULAR_TOKENS[chainId] || [];
    const customTokens = useWalletStore.getState().customTokens.filter(t => t.chainId === chainId);
    const allAvailable = [native, ...tokens, ...customTokens];

    if (initialFromTokenAddress) {
      const found = allAvailable.find(t => t.address.toLowerCase() === initialFromTokenAddress.toLowerCase());
      if (found) {
        setFromToken(found);
      } else {
        setFromToken(native);
      }
    } else {
      setFromToken(native);
    }
    
    if (tokens.length > 0) {
      setToToken(tokens[0]);
    }
  }, [chainId, currentChain, initialFromTokenAddress]);

  // Fetch Quote
  const getQuote = useCallback(async (amount: string) => {
    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setToAmount('');
      return;
    }

    setQuoteLoading(true);
    setError('');
    try {
      const amountInUnits = parseUnits(amount, fromToken.decimals).toString();
      const res = await fetch(`/api/swap/${chainId}/quote?fromTokenAddress=${fromToken.address}&toTokenAddress=${toToken.address}&amount=${amountInUnits}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.message || data.error);
      
      setQuote(data);
      const output = (parseInt(data.toAmount) / Math.pow(10, toToken.decimals)).toFixed(6);
      setToAmount(output);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch quote');
      setToAmount('');
    } finally {
      setQuoteLoading(false);
    }
  }, [fromToken, toToken, chainId]);

  // Debounce quote
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAmount) getQuote(fromAmount);
    }, 500);
    return () => clearTimeout(timer);
  }, [fromAmount, getQuote]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setToAmount('');
  };

  const executeSwap = async () => {
    if (!decryptedWallet || !fromToken || !toToken || !fromAmount || !quote) return;
    
    setLoading(true);
    setError('');
    try {
      const { JsonRpcProvider } = await import('ethers');
      const provider = new JsonRpcProvider(currentChain.rpc, { chainId, name: 'network' }, { staticNetwork: true });
      const wallet = decryptedWallet.connect(provider);
      
      const amountInUnits = parseUnits(fromAmount, fromToken.decimals).toString();

      // 1. Check Allowance if not native
      if (fromToken.address !== NATIVE_TOKEN_ADDRESS) {
        const allowanceRes = await fetch(`/api/swap/${chainId}/approve/allowance?tokenAddress=${fromToken.address}&walletAddress=${address}`);
        const allowanceData = await allowanceRes.json();
        
        if (BigInt(allowanceData.allowance) < BigInt(amountInUnits)) {
          // Need approval
          const approveRes = await fetch(`/api/swap/${chainId}/approve/transaction?tokenAddress=${fromToken.address}&amount=${amountInUnits}`);
          const approveTxData = await approveRes.json();
          
          const approveTx = await wallet.sendTransaction({
            to: approveTxData.to,
            data: approveTxData.data,
            value: approveTxData.value
          });
          await approveTx.wait();
        }
      }

      // 2. Get Swap Data
      const swapRes = await fetch(`/api/swap/${chainId}/swap?fromTokenAddress=${fromToken.address}&toTokenAddress=${toToken.address}&amount=${amountInUnits}&fromAddress=${address}&slippage=1`);
      const swapData = await swapRes.json();
      
      if (swapData.error) throw new Error(swapData.message || swapData.error);

      // 3. Send Swap Transaction
      const tx = await wallet.sendTransaction({
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value,
        gasLimit: swapData.tx.gas ? BigInt(Math.floor(swapData.tx.gas * 1.5)) : undefined // 50% buffer
      });

      alert(`Swap successful! Hash: ${tx.hash}`);
      router.push('/dashboard');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  const openSelector = (target: 'from' | 'to') => {
    setSelectorTarget(target);
    setTokenSelectorOpen(true);
  };

  const selectToken = (token: Token) => {
    if (selectorTarget === 'from') setFromToken(token);
    else setToToken(token);
    setTokenSelectorOpen(false);
  };

  // Combine native + popular tokens for selector
  const availableTokens: Token[] = [
    { 
      address: NATIVE_TOKEN_ADDRESS, 
      symbol: currentChain.symbol, 
      name: currentChain.name, 
      decimals: 18, 
      logo: currentChain.logo, 
      chainId 
    },
    ...(POPULAR_TOKENS[chainId] || [])
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'surface', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Swap</Typography>
        <IconButton sx={{ ml: 'auto' }}>
          <Settings />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, maxWidth: 500, mx: 'auto', width: '100%' }}>
        <Paper sx={{ p: 3, borderRadius: 1.5, bgcolor: 'background.default', border: '1px solid', borderColor: 'border' }}>
          {/* From Token */}
          <Box sx={{ p: 2, bgcolor: 'surface', borderRadius: 1.5, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.muted" fontWeight={700}>YOU PAY</Typography>
              <Typography variant="caption" color="text.muted">Balance: {fromToken?.address === NATIVE_TOKEN_ADDRESS ? parseFloat(balance).toFixed(4) : (tokenBalances.find(t => t.address === fromToken?.address)?.balance || '0')} {fromToken?.symbol}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                variant="standard"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                type="number"
                fullWidth
                InputProps={{ 
                  disableUnderline: true, 
                  sx: { fontSize: '1.5rem', fontWeight: 700 } 
                }}
              />
              <Button 
                onClick={() => openSelector('from')}
                sx={{ borderRadius: 1.5, bgcolor: 'background.default', color: 'text.primary', px: 1.5, py: 0.5, border: '1px solid', borderColor: 'border' }}
                startIcon={<Avatar src={fromToken?.logo} sx={{ width: 24, height: 24 }} />}
                endIcon={<KeyboardArrowDown />}
              >
                {fromToken?.symbol}
              </Button>
            </Box>
          </Box>

          {/* Swap Middle Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', my: -2, zIndex: 1, position: 'relative' }}>
            <IconButton 
              onClick={handleSwapTokens}
              sx={{ 
                bgcolor: 'background.default', 
                border: '1px solid', 
                borderColor: 'border',
                '&:hover': { bgcolor: 'background.paper' }
              }}
            >
              <SwapVert color="primary" />
            </IconButton>
          </Box>

          {/* To Token */}
          <Box sx={{ p: 2, bgcolor: 'surface', borderRadius: 1.5, mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.muted" fontWeight={700}>YOU GET</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                variant="standard"
                placeholder="0.0"
                value={toAmount}
                disabled
                fullWidth
                InputProps={{ 
                  disableUnderline: true, 
                  sx: { fontSize: '1.5rem', fontWeight: 700 } 
                }}
              />
              <Button 
                onClick={() => openSelector('to')}
                sx={{ borderRadius: 1.5, bgcolor: 'background.default', color: 'text.primary', px: 1.5, py: 0.5, border: '1px solid', borderColor: 'border' }}
                startIcon={<Avatar src={toToken?.logo} sx={{ width: 24, height: 24 }} />}
                endIcon={<KeyboardArrowDown />}
              >
                {toToken?.symbol}
              </Button>
            </Box>
          </Box>

          {/* Quote info */}
          {quote && (
            <Box sx={{ mt: 3, p: 2, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.muted">Rate</Typography>
                <Typography variant="body2" fontWeight={600}>1 {fromToken?.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken?.symbol}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.muted">Estimated Gas</Typography>
                <Typography variant="body2" color="success.main">~{(parseFloat(quote.gasPrice) / 1e18).toFixed(6)} {currentChain.symbol}</Typography>
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !fromAmount || !quote || !!error}
            onClick={executeSwap}
            sx={{ mt: 3, borderRadius: 1.5, py: 2, fontSize: '1.1rem', fontWeight: 700 }}
          >
            {loading ? <CircularProgress size={26} /> : (quoteLoading ? 'Getting Quote...' : 'Swap')}
          </Button>
        </Paper>

        <Box sx={{ mt: 3 }}>
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
            Powered by 1inch Aggregator. Best rates guaranteed.
          </Alert>
        </Box>
      </Box>

      {/* Token Selector Dialog */}
      <Dialog open={tokenSelectorOpen} onClose={() => setTokenSelectorOpen(false)} PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 400, maxHeight: '70vh' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Select Token</DialogTitle>
        <List sx={{ pt: 0 }}>
          {availableTokens.map((token) => (
            <ListItem key={token.address} disablePadding>
              <ListItemButton onClick={() => selectToken(token)}>
                <ListItemAvatar>
                  <Avatar src={token.logo} />
                </ListItemAvatar>
                <ListItemText primary={token.symbol} secondary={token.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Dialog>
    </Box>
  );
}
