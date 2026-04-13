/**
 * MG Wallet - Multi-chain Crypto Wallet
 * Chain configurations for Ethereum and EVM-compatible networks
 */

export interface Chain {
  id: number;
  name: string;
  rpc: string;
  explorer: string;
  symbol: string;
  logo: string;
  color: string;
  type: 'evm' | 'bitcoin' | 'solana' | 'bitcoin-cash' | 'near' | 'sui' | 'aptos' | 'cardano' | 'xrp' | 'ton' | 'tron';
  bitcoinType?: 'segwit' | 'taproot';
}

export const SOLANA_CHAIN_ID = -10;
export const SOLANA_DEVNET_CHAIN_ID = -11;
export const BCH_CHAIN_ID = -3;
export const LTC_CHAIN_ID = -5;
export const NEAR_CHAIN_ID = -20;
export const SUI_CHAIN_ID = -21;
export const APTOS_CHAIN_ID = -22;
export const CARDANO_CHAIN_ID = -23;
export const XRP_CHAIN_ID = -24;
export const TON_CHAIN_ID = -25;
export const TRX_CHAIN_ID = -26;
export const ALL_NETWORKS_ID = 0;

export const DEFAULT_CHAINS: Record<number, Chain> = {
  [ALL_NETWORKS_ID]: {
    id: ALL_NETWORKS_ID,
    name: 'All Networks',
    rpc: '',
    explorer: '',
    symbol: 'USD',
    logo: '/logo.png', // Main app logo
    color: '#000000',
    type: 'evm', // Virtual
  },
  1: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://ethereum-rpc.publicnode.com',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    color: '#627EEA',
    type: 'evm',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    rpc: 'https://arbitrum-one-rpc.publicnode.com',
    explorer: 'https://arbiscan.io',
    symbol: 'ETH',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    color: '#28A0F0',
    type: 'evm',
  },
  56: {
    id: 56,
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-rpc.publicnode.com',
    explorer: 'https://bscscan.com',
    symbol: 'BNB',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
    color: '#F3BA2F',
    type: 'evm',
  },
  137: {
    id: 137,
    name: 'Polygon PoS',
    rpc: 'https://polygon-bor-rpc.publicnode.com',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    color: '#8247E5',
    type: 'evm',
  },
  [-1]: {
    id: -1,
    name: 'Bitcoin SegWit',
    rpc: 'https://mempool.space/api',
    explorer: 'https://mempool.space',
    symbol: 'BTC',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
    color: '#F7931A',
    type: 'bitcoin',
    bitcoinType: 'segwit',
  },
  [-2]: {
    id: -2,
    name: 'Bitcoin Taproot',
    rpc: 'https://mempool.space/api',
    explorer: 'https://mempool.space',
    symbol: 'BTC',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
    color: '#F7931A',
    type: 'bitcoin',
    bitcoinType: 'taproot',
  },
  [SOLANA_CHAIN_ID]: {
    id: SOLANA_CHAIN_ID,
    name: 'Solana',
    rpc: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://explorer.solana.com',
    symbol: 'SOL',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
    color: '#14F195',
    type: 'solana',
  },
  [SOLANA_DEVNET_CHAIN_ID]: {
    id: SOLANA_DEVNET_CHAIN_ID,
    name: 'Solana Devnet',
    rpc: 'https://api.devnet.solana.com',
    explorer: 'https://explorer.solana.com/?cluster=devnet',
    symbol: 'SOL',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
    color: '#14F195',
    type: 'solana',
  },
  [BCH_CHAIN_ID]: {
    id: BCH_CHAIN_ID,
    name: 'Bitcoin Cash',
    rpc: 'https://bch.blockbook.online/api/v2',
    explorer: 'https://bch.blockbook.online',
    symbol: 'BCH',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoincash/info/logo.png',
    color: '#8DC351',
    type: 'bitcoin-cash',
  },
  [LTC_CHAIN_ID]: {
    id: LTC_CHAIN_ID,
    name: 'Litecoin',
    rpc: 'https://litecoinspace.org/api',
    explorer: 'https://litecoinspace.org',
    symbol: 'LTC',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/litecoin/info/logo.png',
    color: '#345D9D',
    type: 'bitcoin',
    bitcoinType: 'segwit',
  },
  [NEAR_CHAIN_ID]: {
    id: NEAR_CHAIN_ID,
    name: 'NEAR',
    rpc: 'https://rpc.mainnet.near.org',
    explorer: 'https://nearblocks.io',
    symbol: 'NEAR',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/near/info/logo.png',
    color: '#000000',
    type: 'near',
  },
  [SUI_CHAIN_ID]: {
    id: SUI_CHAIN_ID,
    name: 'Sui',
    rpc: 'https://fullnode.mainnet.sui.io:443',
    explorer: 'https://suiexplorer.com',
    symbol: 'SUI',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png',
    color: '#6FBCF0',
    type: 'sui',
  },
  [APTOS_CHAIN_ID]: {
    id: APTOS_CHAIN_ID,
    name: 'Aptos',
    rpc: 'https://fullnode.mainnet.aptoslabs.com/v1',
    explorer: 'https://explorer.aptoslabs.com',
    symbol: 'APT',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/info/logo.png',
    color: '#2DD4BF',
    type: 'aptos',
  },
  [CARDANO_CHAIN_ID]: {
    id: CARDANO_CHAIN_ID,
    name: 'Cardano',
    rpc: 'https://cardano-mainnet.blockfrost.io/api/v0', // Needs key
    explorer: 'https://cardanoscan.io',
    symbol: 'ADA',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png',
    color: '#0033AD',
    type: 'cardano',
  },
  [XRP_CHAIN_ID]: {
    id: XRP_CHAIN_ID,
    name: 'Ripple',
    rpc: 'https://xrplcluster.com',
    explorer: 'https://xrpscan.com',
    symbol: 'XRP',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ripple/info/logo.png',
    color: '#23292F',
    type: 'xrp',
  },
  [TON_CHAIN_ID]: {
    id: TON_CHAIN_ID,
    name: 'TON',
    rpc: 'https://toncenter.com/api/v2/jsonRPC',
    explorer: 'https://tonscan.org',
    symbol: 'TON',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ton/info/logo.png',
    color: '#0088CC',
    type: 'ton',
  },
  [TRX_CHAIN_ID]: {
    id: TRX_CHAIN_ID,
    name: 'TRON',
    rpc: 'https://api.trongrid.io',
    explorer: 'https://tronscan.org',
    symbol: 'TRX',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
    color: '#FF0013',
    type: 'tron',
  },
};

export const DEFAULT_CHAIN_ID = ALL_NETWORKS_ID;

export function getChain(chainId: number, customChains: Chain[] = []): Chain {
  const allChains = { ...DEFAULT_CHAINS, ...Object.fromEntries(customChains.map(c => [c.id, c])) };
  return (allChains as any)[chainId] || DEFAULT_CHAINS[DEFAULT_CHAIN_ID];
}
