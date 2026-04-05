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

export const DEFAULT_CHAINS: Record<number, Chain> = {
  1: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    color: '#627EEA',
  },
  42161: {
    id: 42161,
    name: 'Arbitrum One',
    rpc: 'https://arbitrum.llamarpc.com',
    explorer: 'https://arbiscan.io',
    symbol: 'ETH',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    color: '#28A0F0',
  },
  56: {
    id: 56,
    name: 'BNB Smart Chain',
    rpc: 'https://binance.llamarpc.com',
    explorer: 'https://bscscan.com',
    symbol: 'BNB',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
    color: '#F3BA2F',
  },
  137: {
    id: 137,
    name: 'Polygon PoS',
    rpc: 'https://polygon.llamarpc.com',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    color: '#8247E5',
  },
};

export const DEFAULT_CHAIN_ID = 1;

export function getChain(chainId: number, customChains: Chain[] = []): Chain {
  const allChains = { ...DEFAULT_CHAINS, ...Object.fromEntries(customChains.map(c => [c.id, c])) };
  return (allChains as any)[chainId] || DEFAULT_CHAINS[DEFAULT_CHAIN_ID];
}
