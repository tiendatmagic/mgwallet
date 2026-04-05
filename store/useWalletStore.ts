import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { JsonRpcProvider, formatEther, Wallet, HDNodeWallet, Contract, parseUnits } from 'ethers';
import { Chain, getChain, DEFAULT_CHAIN_ID } from '@/lib/blockchain/chains';
import { WalletData } from '@/lib/wallet/manager';
import { decryptData } from '@/lib/crypto/encryption';

interface WalletStore {
  // Persistence
  encryptedWallet: string | null;
  address: string | null;
  chainId: number;
  
  // In-memory (not persisted)
  decryptedWallet: Wallet | HDNodeWallet | null;
  balance: string;
  isLocked: boolean;
  
  // Actions
  setChainId: (chainId: number) => void;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  setWallet: (encryptedWallet: string, address: string) => void;
  updateBalance: () => Promise<void>;
  reset: () => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      encryptedWallet: null,
      address: null,
      chainId: DEFAULT_CHAIN_ID,
      decryptedWallet: null,
      balance: '0.00',
      isLocked: true,

      setChainId: (chainId: number) => {
        set({ chainId });
        get().updateBalance();
      },

      lock: () => {
        set({ decryptedWallet: null, isLocked: true });
      },

      unlock: async (password: string) => {
        const { encryptedWallet } = get();
        if (!encryptedWallet) return false;

        try {
          const decryptedData = await decryptData(encryptedWallet, password);
          const walletData: WalletData = JSON.parse(decryptedData);
          
          let wallet: Wallet | HDNodeWallet;
          if (walletData.type === 'mnemonic' && walletData.mnemonic) {
            const { deriveWalletFromMnemonic } = await import('@/lib/wallet/manager');
            wallet = deriveWalletFromMnemonic(walletData.mnemonic);
          } else {
            const { deriveWalletFromPrivateKey } = await import('@/lib/wallet/manager');
            wallet = deriveWalletFromPrivateKey(walletData.privateKey);
          }

          set({ decryptedWallet: wallet, isLocked: false });
          get().updateBalance();
          return true;
        } catch (error) {
          console.error('Unlock failed:', error);
          return false;
        }
      },

      setWallet: (encryptedWallet: string, address: string) => {
        set({ encryptedWallet, address, isLocked: true });
      },

      updateBalance: async () => {
        const { address, chainId } = get();
        if (!address) return;

        try {
          const chain = getChain(chainId);
          const provider = new JsonRpcProvider(chain.rpc);
          const balanceWei = await provider.getBalance(address);
          set({ balance: formatEther(balanceWei) });
        } catch (error) {
          console.error('Balance update failed:', error);
        }
      },

      reset: () => {
        set({
          encryptedWallet: null,
          address: null,
          decryptedWallet: null,
          balance: '0.00',
          isLocked: true,
        });
        localStorage.removeItem('mgwallet-store');
      }
    }),
    {
      name: 'mgwallet-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        encryptedWallet: state.encryptedWallet,
        address: state.address,
        chainId: state.chainId,
      }),
    }
  )
);
