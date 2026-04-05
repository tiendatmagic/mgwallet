import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { JsonRpcProvider, formatEther, Wallet, HDNodeWallet, Contract, parseUnits } from 'ethers';
import { Chain, getChain, DEFAULT_CHAINS, DEFAULT_CHAIN_ID } from '@/lib/blockchain/chains';
import { WalletData } from '@/lib/wallet/manager';
import { decryptData } from '@/lib/crypto/encryption';
import { POPULAR_TOKENS, Token, fetchTokenBalance } from '@/lib/blockchain/tokens';
import { fetchLivePrices, CHAIN_PRICE_IDS } from '@/lib/blockchain/prices';
import { getTransactionHistory, Transaction } from '@/lib/blockchain/explorer';

interface TokenBalance extends Token {
  balance: string;
  usdValue: number;
}

interface WalletStore {
  // Persistence
  encryptedWallet: string | null;
  address: string | null;
  chainId: number;
  
  // In-memory (not persisted)
  decryptedWallet: Wallet | HDNodeWallet | null;
  balance: string; // Native balance
  tokenBalances: TokenBalance[];
  isLocked: boolean;
  prices: Record<string, number>;
  transactions: Transaction[];
  
  // Persisted settings
  customTokens: Token[];
  customChains: Chain[];
  addressBook: Record<string, string>; // name -> address
  
  // Actions
  setChainId: (chainId: number) => void;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  setWallet: (encryptedWallet: string, address: string) => void;
  updateBalance: () => Promise<void>;
  updatePrices: () => Promise<void>;
  updateTransactions: () => Promise<void>;
  addToken: (token: Token) => void;
  addCustomChain: (chain: Chain) => void;
  removeCustomChain: (chainId: number) => void;
  upsertContact: (name: string, address: string) => void;
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
      tokenBalances: [],
      isLocked: true,
      prices: {},
      transactions: [],
      customTokens: [],
      customChains: [],
      addressBook: {},

      setChainId: (chainId: number) => {
        set({ chainId });
        get().updateBalance();
        get().updateTransactions();
        get().updatePrices();
      },

      lock: () => {
        set({ decryptedWallet: null, isLocked: true });
      },

      unlock: async (password: string) => {
        const { encryptedWallet, customChains } = get();
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
          get().updateTransactions();
          get().updatePrices();
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
        const { address, chainId, customTokens, customChains } = get();
        if (!address) return;

        try {
          const chain = getChain(chainId, customChains);
          const provider = new JsonRpcProvider(chain.rpc);
          
          // 1. Update native balance
          const balanceWei = await provider.getBalance(address);
          const nativeBal = formatEther(balanceWei);
          
          // 2. Update popular & custom tokens
          const tokensToFetch = [
            ...(POPULAR_TOKENS[chainId] || []),
            ...customTokens.filter(t => t.chainId === chainId)
          ];

          const tokenBals: TokenBalance[] = await Promise.all(
            tokensToFetch.map(async (token) => {
              try {
                const { balance } = await fetchTokenBalance(chain.rpc, token.address, address);
                return { ...token, balance, usdValue: 0 };
              } catch (e) {
                return { ...token, balance: '0', usdValue: 0 };
              }
            })
          );

          set({ balance: nativeBal, tokenBalances: tokenBals });
        } catch (error) {
          console.error('Balance update failed:', error);
        }
      },

      updatePrices: async () => {
        const { chainId } = get();
        // Prices only for default chains for now to avoid Coingecko mismatch
        if (DEFAULT_CHAINS[chainId]) {
          const prices = await fetchLivePrices([chainId]);
          set({ prices });
        }
      },

      updateTransactions: async () => {
        const { address, chainId } = get();
        if (!address || !DEFAULT_CHAINS[chainId]) return; // History only for default chains
        const txs = await getTransactionHistory(address, chainId);
        set({ transactions: txs });
      },

      addToken: (token: Token) => {
        set((state) => ({ customTokens: [...state.customTokens, token] }));
        get().updateBalance();
      },

      addCustomChain: (chain: Chain) => {
        set((state) => ({ customChains: [...state.customChains, chain] }));
      },

      removeCustomChain: (chainId: number) => {
        set((state) => ({ 
          customChains: state.customChains.filter(c => c.id !== chainId),
          chainId: state.chainId === chainId ? DEFAULT_CHAIN_ID : state.chainId
        }));
      },

      upsertContact: (name: string, address: string) => {
        set((state) => ({ 
          addressBook: { ...state.addressBook, [name]: address } 
        }));
      },

      reset: () => {
        set({
          encryptedWallet: null,
          address: null,
          decryptedWallet: null,
          balance: '0.00',
          tokenBalances: [],
          isLocked: true,
          prices: {},
          transactions: [],
          customTokens: [],
          customChains: [],
          addressBook: {},
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
        customTokens: state.customTokens,
        customChains: state.customChains,
        addressBook: state.addressBook,
      }),
    }
  )
);
