/**
 * MG Wallet - Device Fingerprinting
 * Generates a stable hash of browser/hardware attributes to bind encryption keys to the device.
 */

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const navigator = window.navigator;
  const screen = window.screen;

  // 1. Collect relatively stable hardware and browser traits
  const traits = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    navigator.hardwareConcurrency || 'unknown',
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    // Canvas fingerprinting (sensitive to GPU and browser rendering engine)
    getCanvasFingerprint()
  ];

  const fingerprintSource = traits.join('|');

  // 2. Hash the source string using SHA-256
  const msgUint8 = new TextEncoder().encode(fingerprintSource);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    canvas.width = 200;
    canvas.height = 50;

    // Drawing some text and shapes with gradients
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("MGWallet-Fingerprint-1.0", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("MGWallet-Fingerprint-1.0", 4, 17);

    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-error';
  }
}
