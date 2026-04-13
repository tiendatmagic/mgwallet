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
  42161: 'ethereum',
  [-1]: 'bitcoin', // BTC Segwit
  [-2]: 'bitcoin', // BTC Taproot
  [-3]: 'solana',
  [-4]: 'bitcoin-cash',
  [-5]: 'litecoin',
  [-20]: 'near',
  [-21]: 'sui',
  [-22]: 'aptos',
  [-23]: 'cardano',
  [-24]: 'ripple',
  [-25]: 'the-open-network',
  [-26]: 'tron',
};

// NextJS Chain IDs to CoinGecko Platform IDs
export const CG_PLATFORM_IDS: Record<number, string> = {
  1: 'ethereum',
  56: 'binance-smart-chain',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  [-10]: 'solana',
  [-20]: 'near-protocol',
  [-21]: 'sui',
  [-22]: 'aptos',
  [-23]: 'cardano',
  [-24]: 'ripple',
  [-25]: 'the-open-network',
  [-26]: 'tron',
};

let priceCache: { data: Record<string, number>, timestamp: number } | null = null;
const CACHE_DURATION = 120000; // 2 minutes

/**
 * Fetches current prices for supported tokens
 * Uses the free/no-key tier of CoinGecko
 */
export async function fetchLivePrices(customIds: string[] = []): Promise<Record<string, number>> {
  const now = Date.now();
  if (priceCache && (now - priceCache.timestamp < CACHE_DURATION)) {
    // Check if all customIds are in cache, if not, refetch
    const hasAll = customIds.every(id => priceCache?.data[id] !== undefined);
    if (hasAll) return priceCache.data;
  }

  try {
    const nativeIds = Array.from(new Set(Object.values(CHAIN_PRICE_IDS)));
    const allIds = Array.from(new Set([...nativeIds, ...customIds]));
    const idsString = allIds.join(',');
    
    // Fetch via internal API proxy to avoid CORS
    const response = await fetch(`/api/prices?type=native&ids=${idsString}`);
    
    if (response.status === 429) {
      console.warn('Coingecko rate limit (429) - using cached prices if available');
      return priceCache?.data || {};
    }
    
    if (!response.ok) throw new Error('Price fetch failed');
    
    const data = await response.json();
    const result: Record<string, number> = {};
    
    for (const id in data) {
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

/**
 * Fetches token prices by contract addresses for a specific platform
 */
export async function fetchTokenPricesByAddress(
  chainId: number, 
  addresses: string[]
): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};

  const result: Record<string, number> = {};

  // CoinGecko free limit: 1 address per request. 
  // We fetch them individually to avoid 400 errors.
  for (const address of addresses) {
    try {
      const response = await fetch(
        `/api/prices?type=token&chainId=${chainId}&addresses=${address}`
      );

      if (response.ok) {
        const data = await response.json();
        const lowerAddress = address.toLowerCase();
        if (data[lowerAddress] && data[lowerAddress].usd !== undefined) {
          result[lowerAddress] = data[lowerAddress].usd;
        }
      }
      
      // Small delay to be nice to the proxy/rate limit
      if (addresses.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching token price for ${address}:`, error);
    }
  }
  
  return result;
}
