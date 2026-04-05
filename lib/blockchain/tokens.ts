import { Contract, JsonRpcProvider, formatUnits } from 'ethers';

/**
 * MG Wallet - ERC20 Token Support
 * Standard ABI for ERC20 balanceOf and decimals
 */
export const MINIMAL_ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  chainId: number;
}

/**
 * Pre-defined common tokens for supported networks with high-quality logos
 */
const TRUST_ASSETS = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';

export const POPULAR_TOKENS: Record<number, Token[]> = {
  1: [ // Ethereum
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1, logo: `${TRUST_ASSETS}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png` },
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1, logo: `${TRUST_ASSETS}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png` },
    { address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 1, logo: `${TRUST_ASSETS}/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png` },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, chainId: 1, logo: `${TRUST_ASSETS}/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png` },
    { address: '0x514910771af9ca656af840dff83e8264ecf986ca', symbol: 'LINK', name: 'Chainlink', decimals: 18, chainId: 1, logo: `${TRUST_ASSETS}/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png` },
    { address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', symbol: 'SHIB', name: 'Shiba Inu', decimals: 18, chainId: 1, logo: `${TRUST_ASSETS}/ethereum/assets/0x95aD61b0a150d79219dcf64E1E6Cc01f0B64C4cE/logo.png` },
  ],
  56: [ // BSC
    { address: '0x55d398326f99059ff775485246999027b3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18, chainId: 56, logo: `${TRUST_ASSETS}/smartchain/assets/0x55d398326f99059fF775485246999027B3197955/logo.png` },
    { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, chainId: 56, logo: `${TRUST_ASSETS}/smartchain/assets/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d/logo.png` },
    { address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18, chainId: 56, logo: `${TRUST_ASSETS}/smartchain/assets/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82/logo.png` },
    { address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', symbol: 'BUSD', name: 'BUSD Token', decimals: 18, chainId: 56, logo: `${TRUST_ASSETS}/smartchain/assets/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56/logo.png` },
  ],
  137: [ // Polygon
    { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 137, logo: `${TRUST_ASSETS}/polygon/assets/0xc2132D05D31c914a87C6611C10748AEb04B58e8F/logo.png` },
    { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 137, logo: `${TRUST_ASSETS}/polygon/assets/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/logo.png` },
    { address: '0x8f3cf7ad23cd3caadd96359391774176fe914438', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 137, logo: `${TRUST_ASSETS}/polygon/assets/0x8f3Cf7ad23Cd3CaADD96359391774176Fe914438/logo.png` },
    { address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, chainId: 137, logo: `${TRUST_ASSETS}/polygon/assets/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619/logo.png` },
  ],
  42161: [ // Arbitrum
    { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 42161, logo: `${TRUST_ASSETS}/arbitrum/assets/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9/logo.png` },
    { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 42161, logo: `${TRUST_ASSETS}/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png` },
    { address: '0x912ce59144191c1204e64559fe8253a0e49e6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18, chainId: 42161, logo: `${TRUST_ASSETS}/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png` },
    { address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 42161, logo: `${TRUST_ASSETS}/arbitrum/assets/0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1/logo.png` },
  ],
};

/**
 * Fetches the balance of an ERC20 token for a specific address
 */
export async function fetchTokenBalance(
  rpc: string,
  tokenAddress: string,
  userAddress: string,
  chainId: number // Added chainId for provider optimization
): Promise<{ balance: string; decimals: number; symbol: string }> {
  try {
    const provider = new JsonRpcProvider(
      rpc, 
      { chainId, name: 'network' }, 
      { staticNetwork: true }
    );
    const contract = new Contract(tokenAddress, MINIMAL_ERC20_ABI, provider);
    
    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(userAddress),
      contract.decimals(),
      contract.symbol(),
    ]);

    return {
      balance: formatUnits(balance, decimals),
      decimals: Number(decimals),
      symbol,
    };
  } catch (error) {
    console.error(`Failed to fetch token balance for ${tokenAddress}:`, error);
    throw error;
  }
}
