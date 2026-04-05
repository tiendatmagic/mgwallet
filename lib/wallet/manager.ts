import { Wallet, Mnemonic, HDNodeWallet, isAddress, isHexString } from 'ethers';

/**
 * MG Wallet - Multi-chain Crypto Wallet
 * Logic for BIP39, BIP32, and BIP44 derivation
 * Compatible with Trust Wallet and MetaMask
 */

// Ethereum Standard Derivation Path
const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";

/**
 * Generates a new random mnemonic 
 * @param length 12 or 24 words (128 or 256 bits of entropy)
 */
export function generateMnemonic(length: 12 | 24): string {
  const entropyLength = length === 12 ? 16 : 32;
  const entropy = crypto.getRandomValues(new Uint8Array(entropyLength));
  const mnemonic = Mnemonic.fromEntropy(entropy);
  return mnemonic.phrase;
}

/**
 * Derives a wallet from a mnemonic phrase
 * @param phrase BIP39 mnemonic phrase
 * @param path BIP44 derivation path
 */
export function deriveWalletFromMnemonic(phrase: string, path: string = DEFAULT_DERIVATION_PATH): HDNodeWallet {
  const mnemonic = Mnemonic.fromPhrase(phrase);
  return HDNodeWallet.fromMnemonic(mnemonic, path);
}

/**
 * Derives a wallet from a private key
 * @param privateKey Hexadecimal private key string
 */
export function deriveWalletFromPrivateKey(privateKey: string): Wallet {
  if (!isHexString(privateKey, 32)) {
    throw new Error('Invalid private key format. Must be a 32-byte hex string (64 characters) with 0x prefix.');
  }
  return new Wallet(privateKey);
}

/**
 * Validates a BIP39 mnemonic checksum
 */
export function validateMnemonic(phrase: string): boolean {
  try {
    return Mnemonic.isValidMnemonic(phrase);
  } catch (e) {
    return false;
  }
}

/**
 * Interface representing the wallet data to be stored securely
 */
export interface WalletData {
  address: string;
  mnemonic?: string;
  privateKey: string;
  type: 'mnemonic' | 'private-key';
}
