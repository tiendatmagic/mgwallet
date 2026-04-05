/**
 * MG Wallet - Price Service
 * Real-time price fetching from CoinGecko API
 */

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Chain IDs to CoinGecko IDs
export const CHAIN_PRICE_IDS: Record<number, string> = {
  1: 'ethereum',
  56: 'binancecoin',
  137: 'matic-network',
  42161: 'ethereum', // Arbitrum uses ETH
};

/**
 * Fetches current prices for supported tokens
 * Uses the free/no-key tier of CoinGecko
 */
export async function fetchLivePrices(chainIds: number[]): Promise<Record<string, number>> {
  try {
    const uniqueIds = Array.from(new Set(chainIds.map(id => CHAIN_PRICE_IDS[id])));
    const idsString = uniqueIds.join(',');
    
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${idsString}&vs_currencies=usd`
    );
    
    if (!response.ok) throw new Error('Price fetch failed');
    
    const data = await response.json();
    const result: Record<string, number> = {};
    
    for (const id of uniqueIds) {
      if (data[id]) {
        result[id] = data[id].usd;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Coingecko price fetch error:', error);
    return {};
  }
}

/**
 * Fetches current price for a specific chain ID
 */
export async function getNativePrice(chainId: number): Promise<number> {
  const prices = await fetchLivePrices([chainId]);
  const cgId = CHAIN_PRICE_IDS[chainId];
  return prices[cgId] || 0;
}
