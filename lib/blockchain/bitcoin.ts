import * as bitcoin from 'bitcoinjs-lib';

/**
 * MG Wallet - Bitcoin Transaction Service
 * Integration with Mempool.space API
 */

const MEMPOOL_API_BASE = 'https://mempool.space/api';

export interface Utxo {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
  scriptpubkey?: string; // Optional, might need to fetch separately if not provided
}

export interface FeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

/**
 * Fetches UTXOs for a given Bitcoin address
 */
export async function fetchUtxos(address: string): Promise<Utxo[]> {
  const response = await fetch(`${MEMPOOL_API_BASE}/address/${address}/utxo`);
  if (!response.ok) throw new Error('Failed to fetch UTXOs');
  const utxos = await response.json();
  
  // We need the scriptPubKey for building the transaction
  // Mempool.space /utxo endpoint usually doesn't return scriptPubKey directly in some versions, 
  // but we can derive it from the address if it's SegWit or Taproot.
  return utxos;
}

/**
 * Fetches recommended fee rates in sat/vB
 */
export async function fetchRecommendedFees(): Promise<FeeRates> {
  const response = await fetch(`${MEMPOOL_API_BASE}/v1/fees/recommended`);
  if (!response.ok) throw new Error('Failed to fetch fee rates');
  return response.json();
}

/**
 * Broadcasts a raw transaction hex to the Bitcoin network
 */
export async function broadcastTx(txHex: string): Promise<string> {
  const response = await fetch(`${MEMPOOL_API_BASE}/tx`, {
    method: 'POST',
    body: txHex,
  });
  
  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Broadcast failed: ${errorMsg}`);
  }
  
  return response.text();
}

/**
 * Helper to get scriptPubKey from address
 */
export function getScriptPubKey(address: string): Buffer {
  return Buffer.from(bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin));
}
