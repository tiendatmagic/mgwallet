import bitcore from 'bitcore-lib-cash';

// Fix for bitcore-lib-cash multi-instance error
if ((bitcore as any).versionGuard) {
  (bitcore as any).versionGuard = () => {};
}

/**
 * MG Wallet - Bitcoin Cash (BCH) Service
 * Integration with Blockbook API
 */

const BCH_API_BASE = 'https://bch.blockbook.online/api/v2';

export interface BchUtxo {
  txid: string;
  vout: number;
  value: string;
  height: number;
  confirmations: number;
}

/**
 * Fetches UTXOs for a given BCH address
 */
export async function fetchBchUtxos(address: string): Promise<BchUtxo[]> {
  const response = await fetch(`${BCH_API_BASE}/utxo/${address}`);
  if (!response.ok) throw new Error('Failed to fetch BCH UTXOs');
  return response.json();
}

/**
 * Fetches balance for a given BCH address
 */
export async function fetchBchBalance(address: string): Promise<string> {
  const response = await fetch(`${BCH_API_BASE}/address/${address}`);
  if (!response.ok) throw new Error('Failed to fetch BCH balance');
  const data = await response.json();
  // Balance is in satoshis as string
  const balanceSats = BigInt(data.balance || '0');
  return (Number(balanceSats) / 100000000).toString();
}

/**
 * Broadcasts a raw BCH transaction hex
 */
export async function broadcastBchTx(txHex: string): Promise<string> {
  const response = await fetch(`${BCH_API_BASE}/sendtx/${txHex}`);
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || 'Unknown error');
    } catch {
      throw new Error('Failed to broadcast BCH transaction');
    }
  }
  const result = await response.json();
  return result.result; // txid
}

/**
 * Sends Bitcoin Cash
 */
export async function sendBitcoinCash(
  rpc: string, // Not used but kept for interface consistency if needed, we use the hardcoded Blockbook API for now
  privateKeyWif: string,
  recipient: string,
  amountSol: string, // amount in BCH
  utxos: BchUtxo[]
): Promise<string> {
  const network = bitcore.Networks.mainnet;
  const privateKey = new bitcore.PrivateKey(privateKeyWif);
  
  const amountSats = Math.floor(parseFloat(amountSol) * 100000000);
  
  const tx = new bitcore.Transaction()
    .from(utxos.map(u => new bitcore.Transaction.UnspentOutput({
      txId: u.txid,
      outputIndex: u.vout,
      satoshis: parseInt(u.value),
      script: bitcore.Script.buildPublicKeyHashOut(privateKey.toAddress()).toHex(),
      address: privateKey.toAddress().toString()
    })))
    .to(recipient, amountSats)
    .feePerByte(2) // Standard low fee for BCH
    .change(privateKey.toAddress())
    .sign(privateKey);

  const txHex = tx.toString();
  return await broadcastBchTx(txHex);
}
