import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js';

/**
 * MG Wallet - Solana Transaction Service
 */

/**
 * Fetches SOL balance for an address
 */
export async function fetchSolanaBalance(rpcUrl: string, address: string): Promise<string> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return (balance / LAMPORTS_PER_SOL).toFixed(4);
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    return '0';
  }
}

/**
 * Fetches recent transactions for an address
 */
export async function fetchSolanaTransactions(rpcUrl: string, address: string): Promise<any[]> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const publicKey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
    
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        return {
          hash: sig.signature,
          time: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
          status: sig.err ? 'failed' : 'confirmed',
          type: 'Transfer', // Simplified
          amount: 'N/A', // Complex to parse precisely without more logic
        };
      })
    );
    
    return transactions;
  } catch (error) {
    console.error('Error fetching Solana transactions:', error);
    return [];
  }
}

/**
 * Sends SOL from one address to another
 */
export async function sendSolana(
  rpcUrl: string,
  keypair: Keypair,
  toAddress: string,
  amountSol: string
): Promise<string> {
  const connection = new Connection(rpcUrl, 'confirmed');
  const toPublicKey = new PublicKey(toAddress);
  const amountLamports = Math.round(parseFloat(amountSol) * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amountLamports,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair]
  );

  return signature;
}
