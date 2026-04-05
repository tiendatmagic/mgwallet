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

let priceCache: { data: Record<string, number>, timestamp: number } | null = null;
const CACHE_DURATION = 120000; // 2 minutes

/**
 * Fetches current prices for supported tokens
 * Uses the free/no-key tier of CoinGecko
 */
export async function fetchLivePrices(chainIds: number[]): Promise<Record<string, number>> {
  const now = Date.now();
  if (priceCache && (now - priceCache.timestamp < CACHE_DURATION)) {
    return priceCache.data;
  }

  try {
    const uniqueIds = Array.from(new Set(Object.values(CHAIN_PRICE_IDS)));
    const idsString = uniqueIds.join(',');
    
    // Using simple fetch with error handling for 429
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${idsString}&vs_currencies=usd`
    );
    
    if (response.status === 429) {
      console.warn('Coingecko rate limit (429) - using cached prices if available');
      return priceCache?.data || {};
    }
    
    if (!response.ok) throw new Error('Price fetch failed');
    
    const data = await response.json();
    const result: Record<string, number> = {};
    
    for (const id of uniqueIds) {
      if (data[id]) {
        result[id] = data[id].usd;
      }
    }
    
    priceCache = { data: result, timestamp: now };
    return result;
  } catch (error) {
    console.error('Coingecko price fetch error:', error);
    return priceCache?.data || {};
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
