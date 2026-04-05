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
}

export const CHAINS: Record<number, Chain> = {
  1: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
    color: '#627EEA',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
    color: '#28A0F0',
  },
  56: {
    id: 56,
    name: 'BNB Smart Chain',
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    symbol: 'BNB',
    logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
    color: '#F3BA2F',
  },
  137: {
    id: 137,
    name: 'Polygon PoS',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    logo: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
    color: '#8247E5',
  },
};

export const DEFAULT_CHAIN_ID = 1;

export function getChain(chainId: number): Chain {
  return CHAINS[chainId] || CHAINS[DEFAULT_CHAIN_ID];
}
