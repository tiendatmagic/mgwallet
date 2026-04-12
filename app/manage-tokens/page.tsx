'use client';

import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  TextField, 
  List, 
  ListItem, 
  ListItemAvatar, 
  Avatar, 
  ListItemText, 
  Switch,
  InputAdornment,
  Divider,
  Paper
} from '@mui/material';
import { ArrowBack, Search, Add } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/useWalletStore';
import { DEFAULT_CHAINS, getChain } from '@/lib/blockchain/chains';
import { POPULAR_TOKENS } from '@/lib/blockchain/tokens';

export default function ManageTokens() {
  const router = useRouter();
  const { chainId, customTokens, hiddenTokens, toggleTokenVisibility } = useWalletStore();
  const [search, setSearch] = useState('');

  const chain = useMemo(() => getChain(chainId), [chainId]);

  const allTokens = useMemo(() => {
    const popular = POPULAR_TOKENS[chainId] || [];
    const custom = customTokens.filter(t => t.chainId === chainId);
    return [...popular, ...custom];
  }, [chainId, customTokens]);

  const filteredTokens = useMemo(() => {
    if (!search) return allTokens;
    return allTokens.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [allTokens, search]);

  return (
    <Box sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid', borderColor: 'border' }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Quản lý token
        </Typography>
        <IconButton color="primary">
          <Add />
        </IconButton>
      </Box>

      {/* Search */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Tìm kiếm token"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, bgcolor: 'surface' }
            }
          }}
        />
      </Box>

      {/* Token List */}
      <List sx={{ flexGrow: 1, overflowY: 'auto', pb: 4 }}>
        <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text-muted', display: 'block' }}>
          Mạng lưới hiện tại: {chain.name}
        </Typography>
        
        {filteredTokens.map((token, index) => {
          const isHidden = hiddenTokens.includes(`${chainId}:${token.address}`);
          return (
            <React.Fragment key={token.address}>
              <ListItem
                secondaryAction={
                  <Switch
                    edge="end"
                    checked={!isHidden}
                    onChange={() => toggleTokenVisibility(chainId, token.address)}
                  />
                }
              >
                <ListItemAvatar>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar src={token.logo} alt={token.symbol}>
                      {token.symbol[0]}
                    </Avatar>
                    {(() => {
                      const defaultChain = DEFAULT_CHAINS[chainId];
                      const logoSrc = defaultChain?.logo || chain.logo;
                      return (
                        <Avatar 
                          src={logoSrc} 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            position: 'absolute', 
                            bottom: -2, 
                            right: -2, 
                            border: '1.5px solid',
                            borderColor: 'background.paper',
                            bgcolor: 'secondary.main',
                            fontSize: 8
                          }} 
                        >
                          {chain.symbol[0]}
                        </Avatar>
                      );
                    })()}
                  </Box>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600 }}>{token.symbol}</Typography>
                  }
                  secondary={token.name}
                />
              </ListItem>
              {index < filteredTokens.length - 1 && <Divider variant="inset" component="li" sx={{ borderColor: 'border' }} />}
            </React.Fragment>
          );
        })}
        
        {filteredTokens.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text-muted">
              Không tìm thấy token nào
            </Typography>
          </Box>
        )}
      </List>
      
      <Box sx={{ p: 2, bgcolor: 'surface', textAlign: 'center' }}>
        <Typography variant="caption" color="text-muted">
          Bạn không thấy token của mình? Hãy thêm token tùy chỉnh.
        </Typography>
      </Box>
    </Box>
  );
}
