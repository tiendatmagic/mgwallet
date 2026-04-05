/**
 * MG Wallet - EIP-1193 Provider Injection
 * This file is injected directly into the user's webpage
 */

(() => {
  const provider = {
    isMetaMask: true, // For compatibility
    isMGWallet: true,
    chainId: '0x1',
    networkVersion: '1',
    selectedAddress: null,

    request: async ({ method, params }) => {
      console.log('MG Wallet provider request:', method, params);

      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).slice(2);

        // Send to content script
        window.postMessage({ id, method, params, mgwallet: true, type: 'RPC_REQUEST' }, '*');

        const listener = (event) => {
          if (event.data.mgwallet && event.data.id === id) {
            window.removeEventListener('message', listener);
            if (event.data.error) {
              reject(event.data.error);
            } else {
              resolve(event.data.response);
            }
          }
        };

        window.addEventListener('message', listener);
      });
    },

    on: (eventName, callback) => {
      console.log('MG Wallet provider listen:', eventName);
      // Event handling logic here
    },

    enable: async () => {
      return provider.request({ method: 'eth_requestAccounts' });
    }
  };

  /**
   * Inject into window.ethereum
   */
  if (!window.ethereum) {
    window.ethereum = provider;
  }
  
  window.dispatchEvent(new Event('ethereum#initialized'));
})();
