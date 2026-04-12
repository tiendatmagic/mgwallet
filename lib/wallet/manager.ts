import { Wallet, Mnemonic, HDNodeWallet, isAddress, isHexString } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import bs58 from 'bs58';
import bitcore from 'bitcore-lib-cash';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

// Fix for bitcore-lib-cash multi-instance error
if ((bitcore as any).versionGuard) {
  (bitcore as any).versionGuard = () => {};
}

export const LITECOIN_NETWORK: bitcoin.Network = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

/**
 * MG Wallet - Multi-chain Crypto Wallet
 * Logic for BIP39, BIP32, and BIP44/84/86 derivation
 * Compatible with Trust Wallet and MetaMask
 */

// Ethereum Standard Derivation Path
const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";

// Bitcoin Derivation Paths
const BTC_SEGWIT_PATH = "m/84'/0'/0'/0/0";
const BTC_TAPROOT_PATH = "m/86'/0'/0'/0/0";

// Solana Derivation Path
const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

// Bitcoin Cash Derivation Path
const BCH_DERIVATION_PATH = "m/44'/145'/0'/0/0";

// Litecoin Derivation Path (Native SegWit)
const LTC_SEGWIT_PATH = "m/84'/2'/0'/0/0";

// 7 New Networks Paths
const NEAR_PATH = "m/44'/397'/0'";
const SUI_PATH = "m/44'/784'/0'/0'/0'";
const APTOS_PATH = "m/44'/637'/0'/0'/0'";
const ADA_PATH = "m/1852'/1815'/0'/0/0";
const XRP_PATH = "m/44'/144'/0'/0/0";
const TON_PATH = "m/44'/607'/0'";
const TRX_PATH = "m/44'/195'/0'/0/0";

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
 * Derives a Bitcoin address from a mnemonic phrase
 * @param phrase BIP39 mnemonic phrase
 * @param type 'segwit' or 'taproot'
 */
export function deriveBitcoinAddress(phrase: string, type: 'segwit' | 'taproot'): string {
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'));
  
  const path = type === 'segwit' ? BTC_SEGWIT_PATH : BTC_TAPROOT_PATH;
  const child = root.derivePath(path);

  if (type === 'segwit') {
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin,
    });
    return address!;
  } else {
    // Taproot (P2TR)
    // For P2TR, we need the tweaked public key
    const pubkey = child.publicKey.slice(1, 33); // 32 bytes x-only pubkey
    const { address } = bitcoin.payments.p2tr({
      internalPubkey: pubkey,
      network: bitcoin.networks.bitcoin,
    });
    return address!;
  }
}

/**
 * Derives a Bitcoin Cash address from a mnemonic phrase
 * @param phrase BIP39 mnemonic phrase
 */
export function deriveBitcoinCashAddress(phrase: string): string {
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'));
  
  const child = root.derivePath(BCH_DERIVATION_PATH);
  const privateKey = new bitcore.PrivateKey(Buffer.from(child.privateKey!).toString('hex'));
  return privateKey.toAddress().toString();
}

/**
 * Derives a Bitcoin Cash keypair from a mnemonic phrase
 */
export function deriveBitcoinCashKeyPair(phrase: string) {
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'));
  
  const child = root.derivePath(BCH_DERIVATION_PATH);
  return {
    publicKey: child.publicKey,
    privateKey: child.privateKey!,
  };
}

/**
 * Derives a Litecoin address from a mnemonic phrase
 */
export function deriveLitecoinAddress(phrase: string): string {
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'), LITECOIN_NETWORK);
  const child = root.derivePath(LTC_SEGWIT_PATH);
  
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network: LITECOIN_NETWORK,
  });
  return address!;
}

/**
 * Derives a NEAR address from a mnemonic phrase
 */
export async function deriveNearAddress(phrase: string): Promise<string> {
  const { derivePath } = await import('ed25519-hd-key');
  const { Mnemonic } = await import('ethers');
  const bs58 = (await import('bs58')).default || await import('bs58');
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const { key } = derivePath(NEAR_PATH, seed.slice(2));
  return Buffer.from(key).toString('hex');
}

/**
 * Derives a Sui address from a mnemonic phrase
 */
export async function deriveSuiAddress(phrase: string): Promise<string> {
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
  const keypair = Ed25519Keypair.deriveKeypair(phrase, SUI_PATH);
  return keypair.toSuiAddress();
}

/**
 * Derives an Aptos address from a mnemonic phrase
 */
export async function deriveAptosAddress(phrase: string): Promise<string> {
  const { Ed25519PrivateKey, Account } = await import('@aptos-labs/ts-sdk');
  const { derivePath } = await import('ed25519-hd-key');
  const { Mnemonic } = await import('ethers');
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const { key } = derivePath(APTOS_PATH, seed.slice(2));
  const privateKey = new Ed25519PrivateKey(key);
  const account = Account.fromPrivateKey({ privateKey });
  return account.accountAddress.toString();
}

/**
 * Derives a Cardano address from a mnemonic phrase
 */
export async function deriveCardanoAddress(phrase: string): Promise<string> {
  const { Lucid } = await import('lucid-cardano');
  const lucid = await Lucid.new();
  lucid.selectWalletFromSeed(phrase);
  return await lucid.wallet.address();
}

/**
 * Derives a Ripple (XRP) address from a mnemonic phrase
 */
export async function deriveRippleAddress(phrase: string): Promise<string> {
  const { Wallet } = await import('xrpl');
  const wallet = Wallet.fromMnemonic(phrase);
  return wallet.address;
}

/**
 * Derives a TON address from a mnemonic phrase
 */
export async function deriveTonAddress(phrase: string): Promise<string> {
  const { mnemonicToPrivateKey } = await import('@ton/crypto');
  const { WalletContractV4 } = await import('@ton/ton');
  const keyPair = await mnemonicToPrivateKey(phrase.split(' '));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return wallet.address.toString({ bounceable: false, urlSafe: true, testOnly: false });
}

/**
 * Derives a TRON address from a mnemonic phrase
 */
export async function deriveTronAddress(phrase: string): Promise<string> {
  const { Mnemonic, HDNodeWallet } = await import('ethers');
  const mnemonic = Mnemonic.fromPhrase(phrase);
  const hdNode = HDNodeWallet.fromMnemonic(mnemonic, TRX_PATH);
  const privateKey = hdNode.privateKey.replace('0x', '');
  const { TronWeb } = await import('tronweb');
  const address = TronWeb.address.fromPrivateKey(privateKey);
  if (typeof address !== 'string') {
    throw new Error('Failed to derive TRON address');
  }
  return address;
}

/**
 * Derives a Bitcoin key pair from a mnemonic phrase for signing
 * @param phrase BIP39 mnemonic phrase
 * @param type 'segwit' or 'taproot'
 */
export function deriveBitcoinKeyPair(phrase: string, type: 'segwit' | 'taproot'): { publicKey: Buffer; privateKey: Buffer; internalPubkey?: Buffer } {
  const seed = Mnemonic.fromPhrase(phrase).computeSeed();
  const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'));
  
  const path = type === 'segwit' ? BTC_SEGWIT_PATH : BTC_TAPROOT_PATH;
  const child = root.derivePath(path);

  if (type === 'segwit') {
    return {
      publicKey: Buffer.from(child.publicKey),
      privateKey: Buffer.from(child.privateKey!),
    };
  } else {
    // Taproot tweaked key for Schnorr signatures
    const internalPubkey = Buffer.from(child.publicKey.slice(1, 33));
    return {
      publicKey: Buffer.from(child.publicKey),
      privateKey: Buffer.from(child.privateKey!),
      internalPubkey,
    };
  }
}

/**
 * Converts a private key buffer to WIF format for Bitcoin
 */
export function exportPrivateKeyWIF(privateKey: Buffer, network: bitcoin.Network = bitcoin.networks.bitcoin): string {
  const keyPair = ECPair.fromPrivateKey(privateKey, { network });
  return keyPair.toWIF();
}

/**
 * Derives a Solana keypair from a mnemonic
 */
export function deriveSolanaKeyPair(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath(SOLANA_DERIVATION_PATH, seed.toString('hex')).key;
  return Keypair.fromSeed(derivedSeed);
}

/**
 * Derives a Solana address from a mnemonic
 */
export function deriveSolanaAddress(mnemonic: string): string {
  const keypair = deriveSolanaKeyPair(mnemonic);
  return keypair.publicKey.toBase58();
}

/**
 * Export Solana private key as base58 string
 */
export function exportSolanaPrivateKey(keypair: Keypair): string {
  return bs58.encode(keypair.secretKey);
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
  address: string; // Ethereum primary address
  btcSegwitAddress?: string;
  btcTaprootAddress?: string;
  bchAddress?: string;
  ltcAddress?: string;
  nearAddress?: string;
  suiAddress?: string;
  aptosAddress?: string;
  cardanoAddress?: string;
  xrpAddress?: string;
  tonAddress?: string;
  tronAddress?: string;
  solanaAddress?: string;
  mnemonic?: string;
  privateKey: string;
  type: 'mnemonic' | 'private-key';
}

/**
 * Derives all addresses for a given mnemonic or private key
 */
export async function deriveAllAddresses(data: string, type: 'mnemonic' | 'private-key'): Promise<Partial<WalletData>> {
  if (type === 'mnemonic') {
    const evmWallet = deriveWalletFromMnemonic(data);
    const btcSegwit = deriveBitcoinAddress(data, 'segwit');
    const btcTaproot = deriveBitcoinAddress(data, 'taproot');
    const solana = deriveSolanaAddress(data);
    const bch = deriveBitcoinCashAddress(data);
    const ltc = deriveLitecoinAddress(data);
    
    // Async derivations
    const near = await deriveNearAddress(data);
    const sui = await deriveSuiAddress(data);
    const aptos = await deriveAptosAddress(data);
    const cardano = await deriveCardanoAddress(data);
    const xrp = await deriveRippleAddress(data);
    const ton = await deriveTonAddress(data);
    const tron = await deriveTronAddress(data);

    return {
      type: 'mnemonic',
      address: evmWallet.address,
      privateKey: evmWallet.privateKey,
      mnemonic: data,
      btcSegwitAddress: btcSegwit,
      btcTaprootAddress: btcTaproot,
      solanaAddress: solana,
      bchAddress: bch,
      ltcAddress: ltc,
      nearAddress: near,
      suiAddress: sui,
      aptosAddress: aptos,
      cardanoAddress: cardano,
      xrpAddress: xrp,
      tonAddress: ton,
      tronAddress: tron,
    };
  } else {
    const wallet = deriveWalletFromPrivateKey(data);
    return {
      type: 'private-key',
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }
}
