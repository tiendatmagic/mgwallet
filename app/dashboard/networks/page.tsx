'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, Typography, IconButton, Paper, 
  List, ListItem, ListItemAvatar, Avatar, ListItemText, 
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Tooltip, ListItemButton, Chip
} from '@mui/material';
import { ArrowBack, Add, NetworkCheck, Delete, Edit, RestartAlt } from '@mui/icons-material';
import { useWalletStore } from '@/store/useWalletStore';
import { DEFAULT_CHAINS, Chain } from '@/lib/blockchain/chains';

export default function ManageNetworksPage() {
  const router = useRouter();
  const { networks, addNetwork, updateNetwork, removeNetwork, resetNetworks, chainId, setChainId } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [rpc, setRpc] = useState('');
  const [cId, setCId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [explorer, setExplorer] = useState('');

  const handleSave = () => {
    if (name && rpc && cId && symbol) {
      const chainData: Chain = {
        id: parseInt(cId),
        name,
        rpc,
        symbol,
        explorer: explorer || '',
        logo: editingId ? (networks.find(n => n.id === editingId)?.logo || '') : '',
        color: '#9c27b0'
      };

      if (editingId !== null) {
        updateNetwork(editingId, chainData);
      } else {
        addNetwork(chainData);
      }
      
      setOpen(false);
      resetForm();
    }
  };

  const handleEdit = (chain: Chain) => {
    setEditingId(chain.id);
    setName(chain.name);
    setRpc(chain.rpc);
    setCId(chain.id.toString());
    setSymbol(chain.symbol);
    setExplorer(chain.explorer || '');
    setOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    resetForm();
    setOpen(true);
  };

  const resetForm = () => {
    setName('');
    setRpc('');
    setCId('');
    setSymbol('');
    setExplorer('');
  };

  // Check if it's a default chain to show a "Default" badge
  const isDefault = (id: number) => !!DEFAULT_CHAINS[id];

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
          onClick={handleAddNew}
          sx={{ ml: 'auto', borderRadius: 1.5, px: 2 }}
        >
          Add RPC
        </Button>
      </Box>

      <Box sx={{ p: 2, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.muted' }}>Available Networks</Typography>
          <Button 
            startIcon={<RestartAlt />} 
            size="small" 
            color="inherit" 
            onClick={resetNetworks}
            sx={{ fontSize: '0.65rem', opacity: 0.7 }}
          >
            Reset Defaults
          </Button>
        </Box>
        
        <List sx={{ mb: 4 }}>
          {networks.map((chain) => (
            <Paper key={chain.id} sx={{ mb: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'border', overflow: 'hidden' }}>
              <ListItem 
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleEdit(chain)}>
                      <Edit sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => removeNetwork(chain.id)} disabled={networks.length <= 1}>
                      <Delete sx={{ fontSize: 18 }} color="error" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton 
                  selected={chainId === chain.id}
                  onClick={() => setChainId(chain.id)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemAvatar>
                    <Avatar src={chain.logo} sx={{ bgcolor: chain.logo ? 'transparent' : 'secondary.main', width: 36, height: 36 }}>
                      {!chain.logo && chain.symbol[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={700}>{chain.name}</Typography>
                        {isDefault(chain.id) && (
                          <Chip label="Default" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'primary.main', color: 'white', fontWeight: 700 }} />
                        )}
                        {chainId === chain.id && <NetworkCheck color="success" sx={{ fontSize: 16 }} />}
                      </Box>
                    } 
                    secondary={
                      <Typography variant="caption" sx={{ color: 'text.muted', display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chain.rpc}
                      </Typography>
                    } 
                  />
                </ListItemButton>
              </ListItem>
            </Paper>
          ))}
        </List>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { borderRadius: 2, width: '100%', maxWidth: 450 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingId ? 'Edit Network' : 'Add Custom RPC'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField fullWidth label="Network Name" variant="outlined" value={name} onChange={(e) => setName(e.target.value)} InputProps={{ sx: { borderRadius: 1.5 } }} />
          <TextField fullWidth label="New RPC URL" placeholder="https://..." variant="outlined" value={rpc} onChange={(e) => setRpc(e.target.value)} InputProps={{ sx: { borderRadius: 1.5 } }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Chain ID" type="number" variant="outlined" value={cId} onChange={(e) => setCId(e.target.value)} disabled={editingId !== null} InputProps={{ sx: { borderRadius: 1.5 } }} />
            <TextField fullWidth label="Currency Symbol" placeholder="ETH" variant="outlined" value={symbol} onChange={(e) => setSymbol(e.target.value)} InputProps={{ sx: { borderRadius: 1.5 } }} />
          </Box>
          <TextField fullWidth label="Block Explorer URL (Optional)" placeholder="https://..." variant="outlined" value={explorer} onChange={(e) => setExplorer(e.target.value)} InputProps={{ sx: { borderRadius: 1.5 } }} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name || !rpc || !cId || !symbol} sx={{ borderRadius: 1.5, px: 4 }}>
            {editingId ? 'Save Changes' : 'Add Network'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
