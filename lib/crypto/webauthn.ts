/**
 * MG Wallet - WebAuthn & PRF (Pseudo-Random Function) Utility
 * Allows binding encryption keys to the OS native authentication (Fingerprint, PIN, etc.)
 */

const PRF_SALT = new TextEncoder().encode('mgwallet-biometric-salt-v1');

export interface WebAuthnCredential {
  id: string;
  rawId: string;
}

/**
 * Checks if the browser and hardware support the WebAuthn PRF extension
 */
export async function checkBiometricSupport(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  
  try {
    // Check for platform authenticator availability
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;

    // Check for PRF extension support
    if (!(PublicKeyCredential as any).getClientCapabilities) return available;
    const capabilities = await (PublicKeyCredential as any).getClientCapabilities();
    return !!capabilities.prf;
  } catch (e) {
    return false;
  }
}

/**
 * Registers a new biometric credential with PRF enabled
 */
export async function registerBiometric(username: string): Promise<{ credentialId: string; prfSecret: Uint8Array } | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: { name: "MG Wallet", id: window.location.hostname },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "none",
      extensions: {
        prf: {
          eval: { first: PRF_SALT }
        }
      } as any
    };

    const credential = await navigator.credentials.create({ publicKey: options }) as any;
    if (!credential) return null;

    const extensionResults = credential.getClientExtensionResults();
    const prfResults = extensionResults.prf?.results?.first;
    
    if (!prfResults) {
      throw new Error("Your browser or device doesn't support the required encryption extension (PRF).");
    }

    return {
      credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      prfSecret: new Uint8Array(prfResults)
    };
  } catch (e) {
    console.error("Biometric registration failed:", e);
    throw e;
  }
}

/**
 * Authenticates using biometrics and retrieves the PRF secret
 */
export async function authenticateBiometric(credentialIdB64: string): Promise<Uint8Array | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialId = new Uint8Array(atob(credentialIdB64).split("").map(c => c.charCodeAt(0)));

    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: credentialId,
        type: "public-key",
      }],
      userVerification: "required",
      timeout: 60000,
      extensions: {
        prf: {
          eval: { first: PRF_SALT }
        }
      } as any
    };

    const assertion = await navigator.credentials.get({ publicKey: options }) as any;
    if (!assertion) return null;

    const extensionResults = assertion.getClientExtensionResults();
    const prfResults = extensionResults.prf?.results?.first;
    
    if (!prfResults) {
      throw new Error("Biometric authentication succeeded but encryption secret was not returned.");
    }

    return new Uint8Array(prfResults);
  } catch (e) {
    console.error("Biometric authentication failed:", e);
    throw e;
  }
}

/**
 * Derives a symmetric AES key from the PRF secret
 */
export async function deriveKeyFromPrf(prfSecret: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    prfSecret as any,
    'HKDF',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new Uint8Array(),
      info: new TextEncoder().encode('mgwallet-biometric-key-encryption'),
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
