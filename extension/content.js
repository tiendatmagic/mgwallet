/**
 * MG Wallet - Extension Content Script
 * Injects the EIP-1193 provider into the page context
 */

try {
  const container = document.head || document.documentElement;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('provider.js');
  script.setAttribute('async', 'false');
  container.insertBefore(script, container.children[0]);
  
  // Cleanup script tag after execution
  script.onload = () => {
    script.remove();
  };
} catch (e) {
  console.error('MG Wallet: Provider injection failed', e);
}

/**
 * Handle communication between injected provider and extension background
 */
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data.mgwallet) return;

  const { type, payload, id } = event.data;

  // Forward message to background service worker
  chrome.runtime.sendMessage({ type, payload }, (response) => {
    // Reply back to injected provider
    window.postMessage({ mgwallet: true, id, response }, '*');
  });
});
