import * as bitcoin from 'bitcoinjs-lib';
import { LITECOIN_NETWORK } from '@/lib/wallet/manager';

/**
 * MG Wallet - Litecoin (LTC) Service
 * Integration with LitecoinSpace API (Mempool.space fork)
 */

const LTC_SPACE_API = 'https://litecoinspace.org/api';

export interface LtcUtxo {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}

/**
 * Fetches UTXOs for a given Litecoin address
 */
export async function fetchLtcUtxos(address: string): Promise<LtcUtxo[]> {
  const response = await fetch(`${LTC_SPACE_API}/address/${address}/utxo`);
  if (!response.ok) throw new Error('Failed to fetch LTC UTXOs');
  return response.json();
}

/**
 * Fetches balance and stats for a given Litecoin address
 */
export async function fetchLtcBalance(address: string): Promise<string> {
  const response = await fetch(`${LTC_SPACE_API}/address/${address}`);
  if (!response.ok) throw new Error('Failed to fetch LTC balance');
  const data = await response.json();
  const balanceSats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  return (balanceSats / 100000000).toString();
}

/**
 * Broadcasts a raw LTC transaction hex
 */
export async function broadcastLtcTx(txHex: string): Promise<string> {
  const response = await fetch(`${LTC_SPACE_API}/tx`, {
    method: 'POST',
    body: txHex,
  });
  
  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`LTC Broadcast failed: ${errorMsg}`);
  }
  
  return response.text();
}

/**
 * Helper to get scriptPubKey for LTC address
 */
export function getLtcScriptPubKey(address: string): Buffer {
  return Buffer.from(bitcoin.address.toOutputScript(address, LITECOIN_NETWORK));
}
