/**
 * MG Wallet - Multi-chain Crypto Wallet
 * WebCrypto API based AES-256-GCM encryption
 */

const KEY_ALGO = 'PBKDF2';
const ENC_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';
const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

/**
 * Derives a cryptographic key from a password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: KEY_ALGO },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_ALGO,
      salt: salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    baseKey,
    { name: ENC_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using a password
 * Returns a base64 string containing: salt (16 bytes) + iv (12 bytes) + ciphertext
 */
export async function encryptData(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const key = await deriveKey(password, salt);
  
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: ENC_ALGO, iv: iv },
    key,
    enc.encode(data)
  );

  const encryptedArray = new Uint8Array(encrypted);
  const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(encryptedArray, salt.length + iv.length);

  return btoa(String.fromCharCode(...result));
}

/**
 * Decrypts a base64 string using a password
 */
export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  try {
    const encryptedData = new Uint8Array(
      atob(encryptedBase64).split('').map((c) => c.charCodeAt(0))
    );

    const salt = encryptedData.slice(0, SALT_SIZE);
    const iv = encryptedData.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = encryptedData.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: ENC_ALGO, iv: iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    throw new Error('Invalid password or corrupted data');
  }
}
