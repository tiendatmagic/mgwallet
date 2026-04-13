/**
 * MG Wallet - Block Explorer Service
 * Fetches transaction history from Etherscan-compatible APIs
 */

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  status?: string;
  isError?: string;
  tokenSymbol?: string;
  tokenName?: string;
}

const EXPLORER_APIS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  137: 'https://api.polygonscan.com/api',
  42161: 'https://api.arbiscan.io/api',
};

// Public API keys for demo (limited usage)
const PUBLIC_API_KEYS: Record<number, string> = {
  1: 'YourEtherscanApiKey', // Users should add their own
  56: 'YourBscScanApiKey',
  137: 'YourPolygonScanApiKey',
  42161: 'YourArbiscanApiKey',
};

/**
 * Fetches the transaction history for a given address and network
 */
export async function getTransactionHistory(
  address: string,
  chainId: number,
  tokenAddress?: string,
  limit: number = 20
): Promise<Transaction[]> {
  const apiBase = EXPLORER_APIS[chainId];
  if (!apiBase) return [];

  // Note: For a production app, use process.env.API_KEY
  const apiKey = PUBLIC_API_KEYS[chainId];
  
  const action = tokenAddress && tokenAddress !== 'native' ? 'tokentx' : 'txlist';
  const tokenParam = tokenAddress && tokenAddress !== 'native' ? `&contractaddress=${tokenAddress}` : '';
  
  const url = `${apiBase}?module=account&action=${action}&address=${address}${tokenParam}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Explorer API failed');
    
    const data = await response.json();
    if (data.status !== '1') {
      console.warn('Explorer API warning:', data.message);
      return [];
    }

    return data.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.tokenDecimal ? (BigInt(tx.value) / BigInt(10 ** parseInt(tx.tokenDecimal))).toString() : tx.value,
      timeStamp: tx.timeStamp,
      isError: tx.isError,
      tokenSymbol: tx.tokenSymbol,
      tokenName: tx.tokenName,
    }));
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    return [];
  }
}

