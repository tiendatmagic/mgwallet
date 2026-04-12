'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, Typography, IconButton, Paper, 
  List, ListItem, ListItemAvatar, Avatar, ListItemText, 
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import { ArrowBack, Add, Person, Delete, ContentCopy, CheckCircle } from '@mui/icons-material';
import { useWalletStore } from '@/store/useWalletStore';

export default function AddressBookPage() {
  const router = useRouter();
  const { addressBook, upsertContact } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const handleAdd = () => {
    if (name && address) {
      upsertContact(name, address);
      setOpen(false);
      setName('');
      setAddress('');
    }
  };

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  };

  const contacts = Object.entries(addressBook);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'surface', minHeight: '100vh' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>Address Book</Typography>
        <IconButton sx={{ ml: 'auto', color: 'primary.main' }} onClick={() => setOpen(true)}>
          <Add />
        </IconButton>
      </Box>

      <Box sx={{ p: 2, flex: 1 }}>
        {contacts.length > 0 ? (
          <List>
            {contacts.map(([cName, cAddr]) => (
              <Paper key={cAddr} sx={{ mb: 2, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'border' }}>
                <ListItem 
                  secondaryAction={
                    <Box>
                      <IconButton onClick={() => handleCopy(cAddr)} size="small">
                        {copied === cAddr ? <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} /> : <ContentCopy sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={<Typography fontWeight={700}>{cName}</Typography>} 
                    secondary={<Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.muted' }}>{cAddr.slice(0, 8)}...{cAddr.slice(-8)}</Typography>} 
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        ) : (
          <Box sx={{ mt: 10, textAlign: 'center', p: 4 }}>
            <Typography variant="body1" color="text.muted">Your address book is empty</Typography>
            <Button variant="outlined" sx={{ mt: 2, borderRadius: 1.5 }} onClick={() => setOpen(true)}>Add your first contact</Button>
          </Box>
        )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { borderRadius: 1.5, width: '100%', maxWidth: 400 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Contact</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField 
            fullWidth 
            label="Name" 
            variant="outlined" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            InputProps={{ sx: { borderRadius: 1.5 } }}
          />
          <TextField 
            fullWidth 
            label="Wallet Address" 
            variant="outlined" 
            placeholder="0x..."
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            InputProps={{ sx: { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!name || !address.startsWith('0x')} sx={{ borderRadius: 1.5 }}>
            Save Contact
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
