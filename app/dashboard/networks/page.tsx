'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, Typography, IconButton, Paper, 
  List, ListItem, ListItemAvatar, Avatar, ListItemText, 
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Tooltip, ListItemButton
} from '@mui/material';
import { ArrowBack, Add, NetworkCheck, Delete, Language, Storage } from '@mui/icons-material';
import { useWalletStore } from '@/store/useWalletStore';
import { DEFAULT_CHAINS, Chain } from '@/lib/blockchain/chains';

export default function ManageNetworksPage() {
  const router = useRouter();
  const { customChains, addCustomChain, removeCustomChain, chainId, setChainId } = useWalletStore();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [rpc, setRpc] = useState('');
  const [cId, setCId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [explorer, setExplorer] = useState('');

  const handleAdd = () => {
    if (name && rpc && cId && symbol) {
      const newChain: Chain = {
        id: parseInt(cId),
        name,
        rpc,
        symbol,
        explorer: explorer || '',
        logo: '', // Generic logo for custom networks
        color: '#9c27b0'
      };
      addCustomChain(newChain);
      setOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setRpc('');
    setCId('');
    setSymbol('');
    setExplorer('');
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'surface', minHeight: '100vh' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Manage Networks</Typography>
        <Button 
          variant="contained" 
          size="small" 
          startIcon={<Add />}
          onClick={() => setOpen(true)}
          sx={{ ml: 'auto', borderRadius: 20, px: 2 }}
        >
          Add RPC
        </Button>
      </Box>

      <Box sx={{ p: 2, flex: 1 }}>
        <Typography variant="overline" sx={{ px: 1, color: 'text.muted' }}>Default Networks</Typography>
        <List sx={{ mb: 4 }}>
          {Object.values(DEFAULT_CHAINS).map((chain) => (
            <Paper key={chain.id} sx={{ mb: 1, borderRadius: 3, border: '1px solid', borderColor: 'border' }}>
              <ListItem disablePadding>
                <ListItemButton 
                  selected={chainId === chain.id}
                  onClick={() => setChainId(chain.id)}
                  sx={{ borderRadius: 3 }}
                >
                  <ListItemAvatar>
                    <Avatar src={chain.logo} />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={<Typography fontWeight={700}>{chain.name}</Typography>} 
                    secondary={chain.rpc} 
                  />
                  {chainId === chain.id && <NetworkCheck color="success" />}
                </ListItemButton>
              </ListItem>
            </Paper>
          ))}
        </List>

        {customChains.length > 0 && (
          <>
            <Typography variant="overline" sx={{ px: 1, color: 'text.muted' }}>Custom Networks</Typography>
            <List>
              {customChains.map((chain) => (
                <Paper key={chain.id} sx={{ mb: 1, borderRadius: 3, border: '1px solid', borderColor: 'border' }}>
                  <ListItem 
                    secondaryAction={
                      <IconButton edge="end" onClick={() => removeCustomChain(chain.id)}>
                        <Delete color="error" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>{chain.symbol[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography fontWeight={700}>{chain.name}</Typography>} 
                      secondary={chain.rpc} 
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          </>
        )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Custom RPC</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField fullWidth label="Network Name" variant="outlined" value={name} onChange={(e) => setName(e.target.value)} InputProps={{ sx: { borderRadius: 3 } }} />
          <TextField fullWidth label="New RPC URL" placeholder="https://..." variant="outlined" value={rpc} onChange={(e) => setRpc(e.target.value)} InputProps={{ sx: { borderRadius: 3 } }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Chain ID" type="number" variant="outlined" value={cId} onChange={(e) => setCId(e.target.value)} InputProps={{ sx: { borderRadius: 3 } }} />
            <TextField fullWidth label="Currency Symbol" placeholder="ETH" variant="outlined" value={symbol} onChange={(e) => setSymbol(e.target.value)} InputProps={{ sx: { borderRadius: 3 } }} />
          </Box>
          <TextField fullWidth label="Block Explorer URL (Optional)" placeholder="https://..." variant="outlined" value={explorer} onChange={(e) => setExplorer(e.target.value)} InputProps={{ sx: { borderRadius: 3 } }} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!name || !rpc || !cId || !symbol} sx={{ borderRadius: 3, px: 4 }}>
            Add Network
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
