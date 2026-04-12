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
  isVisible: boolean;
}

interface WalletAccount {
  id: string;
  name: string;
  encryptedMnemonic: string;
  addresses: {
    evm: string | null;
    btcSegwit: string | null;
    btcTaproot: string | null;
    solana: string | null;
    bch: string | null;
    ltc: string | null;
    near: string | null;
    sui: string | null;
    aptos: string | null;
    cardano: string | null;
    xrp: string | null;
    ton: string | null;
    tron: string | null;
  };
}

interface WalletStore {
  // Persistence V5 (Multi-wallet)
  wallets: WalletAccount[];
  activeWalletId: string | null;
  chainId: number;
  theme: 'light' | 'dark';
  hiddenTokens: string[]; // chainId:tokenAddress
  
  // In-memory (not persisted)
  decryptedWallet: Wallet | HDNodeWallet | null;
  balance: string; // Native balance
  tokenBalances: TokenBalance[];
  isLocked: boolean;
  prices: Record<string, number>;
  transactions: Transaction[];
  
  // Persisted settings
  customTokens: Token[];
  networks: Chain[];
  addressBook: Record<string, string>; // name -> address
  isBiometricEnabled: boolean;
  biometricCredentialId: string | null;
  biometricEncryptedPassword: string | null;
  
  // Actions
  setChainId: (chainId: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTokenVisibility: (chainId: number, tokenAddress: string) => void;
  lock: () => void;
  unlock: (password: string, walletId?: string) => Promise<boolean>;
  addWallet: (name: string, encryptedMnemonic: string, addresses: WalletAccount['addresses']) => void;
  switchWallet: (walletId: string) => void;
  removeWallet: (walletId: string) => void;
  updateBalance: () => Promise<void>;
  updatePrices: () => Promise<void>;
  updateTransactions: () => Promise<void>;
  addToken: (token: Token) => void;
  addNetwork: (chain: Chain) => void;
  updateNetwork: (chainId: number, chain: Partial<Chain>) => void;
  removeNetwork: (chainId: number) => void;
  resetNetworks: () => void;
  updateWalletName: (walletId: string, name: string) => void;
  enableBiometric: (password: string) => Promise<boolean>;
  disableBiometric: () => void;
  unlockWithBiometric: () => Promise<boolean>;
  upsertContact: (name: string, address: string) => void;
  sendBitcoin: (recipient: string, amountBtc: string, mnemonic: string, feePriority?: 'slow' | 'average' | 'fast') => Promise<string>;
  sendSolana: (recipient: string, amountSol: string, mnemonic: string) => Promise<string>;
  sendBitcoinCash: (recipient: string, amountBch: string, mnemonic: string) => Promise<string>;
  sendLitecoin: (recipient: string, amountLtc: string, mnemonic: string, feePriority?: 'slow' | 'average' | 'fast') => Promise<string>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  reset: () => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      wallets: [],
      activeWalletId: null,
      chainId: DEFAULT_CHAIN_ID,
      theme: 'light',
      hiddenTokens: [],
      decryptedWallet: null,
      balance: '0.00',
      tokenBalances: [],
      isLocked: true,
      prices: {},
      transactions: [],
      customTokens: [],
      networks: Object.values(DEFAULT_CHAINS),
      addressBook: {},
      isBiometricEnabled: false,
      biometricCredentialId: null,
      biometricEncryptedPassword: null,

      setChainId: (chainId: number) => {
        set({ chainId });
        get().updateBalance();
        get().updateTransactions();
        get().updatePrices();
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      toggleTokenVisibility: (chainId, tokenAddress) => {
        const key = `${chainId}:${tokenAddress}`;
        set((state) => ({
          hiddenTokens: state.hiddenTokens.includes(key)
            ? state.hiddenTokens.filter((k) => k !== key)
            : [...state.hiddenTokens, key],
        }));
        get().updateBalance();
      },

      lock: () => {
        set({ decryptedWallet: null, isLocked: true });
      },

      unlock: async (password: string, walletId?: string) => {
        const id = walletId || get().activeWalletId;
        const walletAccount = get().wallets.find(w => w.id === id);
        if (!walletAccount) return false;

        try {
          const { getDeviceFingerprint } = await import('@/lib/crypto/fingerprint');
          const fingerprint = await getDeviceFingerprint();
          
          const decryptedData = await decryptData(walletAccount.encryptedMnemonic, password, fingerprint);
          const walletData: WalletData = JSON.parse(decryptedData);
          
          let wallet: Wallet | HDNodeWallet;
          if (walletData.type === 'mnemonic' && walletData.mnemonic) {
            const { deriveWalletFromMnemonic } = await import('@/lib/wallet/manager');
            wallet = deriveWalletFromMnemonic(walletData.mnemonic);
          } else {
            const { deriveWalletFromPrivateKey } = await import('@/lib/wallet/manager');
            wallet = deriveWalletFromPrivateKey(walletData.privateKey);
          }

          set({ activeWalletId: id, decryptedWallet: wallet, isLocked: false });
          get().updateBalance();
          get().updateTransactions();
          get().updatePrices();
          return true;
        } catch (error) {
          console.error('Unlock failed:', error);
          return false;
        }
      },

      addWallet: (name, encryptedMnemonic, addresses) => {
        const newWallet: WalletAccount = {
          id: Math.random().toString(36).substring(2, 11),
          name,
          encryptedMnemonic,
          addresses
        };
        set((state) => ({
          wallets: [...state.wallets, newWallet],
          activeWalletId: state.activeWalletId || newWallet.id
        }));
      },

      switchWallet: (walletId) => {
        set({ activeWalletId: walletId, decryptedWallet: null, isLocked: true });
      },

      removeWallet: (walletId) => {
        set((state) => {
          const newWallets = state.wallets.filter(w => w.id !== walletId);
          return {
            wallets: newWallets,
            activeWalletId: state.activeWalletId === walletId ? (newWallets[0]?.id || null) : state.activeWalletId,
            decryptedWallet: state.activeWalletId === walletId ? null : state.decryptedWallet,
            isLocked: state.activeWalletId === walletId ? true : state.isLocked
          };
        });
      },

      updateWalletName: (walletId, name) => {
        set((state) => ({
          wallets: state.wallets.map(w => w.id === walletId ? { ...w, name } : w)
        }));
      },

      enableBiometric: async (password: string) => {
        try {
          const { registerBiometric, deriveKeyFromPrf } = await import('@/lib/crypto/webauthn');
          const result = await registerBiometric('MG Wallet User');
          if (!result) return false;

          const aesKey = await deriveKeyFromPrf(result.prfSecret);
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const encodedPassword = new TextEncoder().encode(password);
          
          const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            encodedPassword
          );

          const encryptedArray = new Uint8Array(encryptedBuffer);
          const packed = new Uint8Array(iv.length + encryptedArray.length);
          packed.set(iv, 0);
          packed.set(encryptedArray, iv.length);

          set({
            isBiometricEnabled: true,
            biometricCredentialId: result.credentialId,
            biometricEncryptedPassword: btoa(String.fromCharCode(...packed))
          });
          return true;
        } catch (e) {
          console.error("Enable biometric failed:", e);
          return false;
        }
      },

      disableBiometric: () => {
        set({
          isBiometricEnabled: false,
          biometricCredentialId: null,
          biometricEncryptedPassword: null
        });
      },

      unlockWithBiometric: async () => {
        const { isBiometricEnabled, biometricCredentialId, biometricEncryptedPassword } = get();
        if (!isBiometricEnabled || !biometricCredentialId || !biometricEncryptedPassword) return false;

        try {
          const { authenticateBiometric, deriveKeyFromPrf } = await import('@/lib/crypto/webauthn');
          const prfSecret = await authenticateBiometric(biometricCredentialId);
          if (!prfSecret) return false;

          const aesKey = await deriveKeyFromPrf(prfSecret);
          const packed = new Uint8Array(atob(biometricEncryptedPassword).split("").map(c => c.charCodeAt(0)));
          const iv = packed.slice(0, 12);
          const ciphertext = packed.slice(12);

          const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            ciphertext
          );

          const password = new TextDecoder().decode(decryptedBuffer);
          return await get().unlock(password);
        } catch (e) {
          console.error("Biometric unlock failed:", e);
          return false;
        }
      },

      updateBalance: async () => {
        const { activeWalletId, wallets, chainId, customTokens, networks, hiddenTokens } = get();
        const activeWallet = wallets.find(w => w.id === activeWalletId);
        if (!activeWallet) return;

        const { evm, btcSegwit, btcTaproot, solana, bch, ltc } = activeWallet.addresses;
        if (!evm) return;

        try {
          const chain = networks.find(n => n.id === chainId) || getChain(chainId);
          
          if (chain.type === 'bitcoin') {
            const btcAddress = chain.bitcoinType === 'segwit' ? btcSegwit : btcTaproot;
            const targetAddress = chain.id === (await import('@/lib/blockchain/chains')).LTC_CHAIN_ID ? ltc : btcAddress;
            
            if (!targetAddress) return;

            const response = await fetch(`${chain.rpc}/address/${targetAddress}`);
            const data = await response.json();
            const balanceSats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            const balanceLtcOrBtc = (balanceSats / 100000000).toString();
            
            set({ balance: balanceLtcOrBtc, tokenBalances: [] });
            return;
          }

          if (chain.type === 'solana') {
            if (!solana) return;
            const { fetchSolanaBalance } = await import('@/lib/blockchain/solana');
            const solBalance = await fetchSolanaBalance(chain.rpc, solana);
            set({ balance: solBalance, tokenBalances: [] });
            return;
          }

          if (chain.type === 'bitcoin-cash') {
            if (!bch) return;
            const { fetchBchBalance } = await import('@/lib/blockchain/bitcoincash');
            const bchBal = await fetchBchBalance(bch);
            set({ balance: bchBal, tokenBalances: [] });
            return;
          }

          const { NEAR_CHAIN_ID, SUI_CHAIN_ID, APTOS_CHAIN_ID, CARDANO_CHAIN_ID, XRP_CHAIN_ID, TON_CHAIN_ID, TRX_CHAIN_ID } = await import('@/lib/blockchain/chains');
          
          if (chainId === NEAR_CHAIN_ID || chainId === SUI_CHAIN_ID || chainId === APTOS_CHAIN_ID || chainId === CARDANO_CHAIN_ID || chainId === XRP_CHAIN_ID || chainId === TON_CHAIN_ID || chainId === TRX_CHAIN_ID) {
            set({ balance: '0.00', tokenBalances: [] });
            return;
          }

          const provider = new JsonRpcProvider(
            chain.rpc, 
            { chainId: chain.id, name: chain.name.toLowerCase() }, 
            { staticNetwork: true }
          );
          
          const balanceWei = await provider.getBalance(evm);
          const nativeBal = formatEther(balanceWei);
          
          const tokensToFetch = [
            ...(POPULAR_TOKENS[chainId] || []),
            ...customTokens.filter(t => t.chainId === chainId)
          ];

          const tokenBals: TokenBalance[] = await Promise.all(
            tokensToFetch.map(async (token) => {
              const isVisible = !hiddenTokens.includes(`${chainId}:${token.address}`);
              try {
                const { balance } = await fetchTokenBalance(chain.rpc, token.address, evm, chainId);
                return { ...token, balance, usdValue: 0, isVisible };
              } catch (e) {
                return { ...token, balance: '0', usdValue: 0, isVisible };
              }
            })
          );

          set({ balance: nativeBal, tokenBalances: tokenBals });
        } catch (error) {
          console.error(`Balance update failed for chain ${chainId}:`, error);
        }
      },

      updatePrices: async () => {
        const { chainId } = get();
        if (CHAIN_PRICE_IDS[chainId]) {
          const prices = await fetchLivePrices([chainId]);
          set({ prices });
        }
      },

      updateTransactions: async () => {
        const { activeWalletId, wallets, chainId } = get();
        const activeWallet = wallets.find(w => w.id === activeWalletId);
        if (!activeWallet) return;
        const { evm, btcSegwit, btcTaproot } = activeWallet.addresses;
        if (!evm) return;

        try {
          const chain = getChain(chainId);
          if (chain.type === 'bitcoin') {
            const btcAddress = chain.bitcoinType === 'segwit' ? btcSegwit : btcTaproot;
            if (!btcAddress) return;
            
            const response = await fetch(`https://mempool.space/api/address/${btcAddress}/txs`);
            const data = await response.json();
            
            const txs: Transaction[] = data.map((tx: any) => {
              const isOutgoing = tx.vin.some((vin: any) => vin.prevout?.scriptpubkey_address === btcAddress);
              const value = isOutgoing 
                ? tx.vout.filter((vout: any) => vout.scriptpubkey_address !== btcAddress).reduce((sum: number, v: any) => sum + v.value, 0)
                : tx.vout.filter((vout: any) => vout.scriptpubkey_address === btcAddress).reduce((sum: number, v: any) => sum + v.value, 0);

              return {
                hash: tx.txid,
                from: isOutgoing ? btcAddress : 'External',
                to: isOutgoing ? 'External' : btcAddress,
                value: (value / 1e8).toString(),
                timeStamp: tx.status.block_time?.toString() || Math.floor(Date.now() / 1000).toString(),
                input: '',
                confirmations: tx.status.confirmed ? '1' : '0'
              };
            });
            
            set({ transactions: txs });
            return;
          }

          if (DEFAULT_CHAINS[chainId]) {
            const txs = await getTransactionHistory(evm, chainId);
            set({ transactions: txs });
          }
        } catch (error) {
          console.warn(`Failed to fetch transactions for chain ${chainId}:`, error);
          set({ transactions: [] });
        }
      },

      addToken: (token: Token) => {
        set((state) => ({ customTokens: [...state.customTokens, token] }));
        get().updateBalance();
      },

      addNetwork: (chain: Chain) => {
        set((state) => ({
          networks: [...state.networks.filter(n => n.id !== chain.id), chain]
        }));
      },

      updateNetwork: (chainId: number, chainUpdate: Partial<Chain>) => {
        set((state) => ({
          networks: state.networks.map(n => n.id === chainId ? { ...n, ...chainUpdate } : n)
        }));
      },

      removeNetwork: (chainId: number) => {
        set((state) => ({
          networks: state.networks.filter((c) => c.id !== chainId),
          chainId: state.chainId === chainId ? DEFAULT_CHAIN_ID : state.chainId
        }));
      },

      resetNetworks: () => {
        set({ networks: Object.values(DEFAULT_CHAINS) });
      },

      upsertContact: (name: string, address: string) => {
        set((state) => ({ 
          addressBook: { ...state.addressBook, [name]: address } 
        }));
      },

      changePassword: async (oldPassword, newPassword) => {
        const { wallets } = get();
        if (wallets.length === 0) return false;

        try {
          const { encryptData } = await import('@/lib/crypto/encryption');
          const { getDeviceFingerprint } = await import('@/lib/crypto/fingerprint');
          const fingerprint = await getDeviceFingerprint();
          
          const updatedWallets = await Promise.all(wallets.map(async (w) => {
            const decryptedData = await decryptData(w.encryptedMnemonic, oldPassword, fingerprint);
            const newEncryptedMnemonic = await encryptData(decryptedData, newPassword, fingerprint);
            return { ...w, encryptedMnemonic: newEncryptedMnemonic };
          }));
          
          set({ wallets: updatedWallets });
          return true;
        } catch (error) {
          console.error('Password change failed:', error);
          return false;
        }
      },

      sendBitcoin: async (recipient, amountBtc, mnemonic, feePriority = 'average') => {
        const { activeWalletId, wallets, chainId } = get();
        const activeWallet = wallets.find(w => w.id === activeWalletId);
        const chain = getChain(chainId);
        const sourceAddress = chain.bitcoinType === 'segwit' ? activeWallet?.addresses.btcSegwit : activeWallet?.addresses.btcTaproot;
        
        if (!sourceAddress) throw new Error('Bitcoin address not initialized');

        try {
          const { fetchUtxos, fetchRecommendedFees, broadcastTx, getScriptPubKey } = await import('@/lib/blockchain/bitcoin');
          const { deriveBitcoinKeyPair } = await import('@/lib/wallet/manager');
          const bitcoin = await import('bitcoinjs-lib');
          const ECPairFactory = (await import('ecpair')).ECPairFactory;
          const ecc = await import('tiny-secp256k1');
          const ECPair = ECPairFactory(ecc);

          // 1. Get Fee Rates
          const fees = await fetchRecommendedFees();
          const selectedFeeRate = feePriority === 'fast' ? fees.fastestFee : (feePriority === 'slow' ? fees.economyFee : fees.halfHourFee);

          // 2. Fetch UTXOs
          const utxos = await fetchUtxos(sourceAddress);
          if (utxos.length === 0) throw new Error('No unspent outputs found');

          // 3. Prepare Signing Keys
          const keyPairData = deriveBitcoinKeyPair(mnemonic, chain.bitcoinType as 'segwit' | 'taproot');
          const network = bitcoin.networks.bitcoin;
          const signer = ECPair.fromPrivateKey(keyPairData.privateKey);

          // 4. Build Transaction
          const amountSats = Math.round(parseFloat(amountBtc) * 1e8);
          const psbt = new bitcoin.Psbt({ network });
          
          let inputSum = 0;
          let inputsCount = 0;
          
          for (const utxo of utxos) {
            inputSum += utxo.value;
            inputsCount++;
            
            const inputData: any = {
              hash: utxo.txid,
              index: utxo.vout,
              witnessUtxo: {
                script: getScriptPubKey(sourceAddress),
                value: BigInt(utxo.value),
              },
            };

            if (chain.bitcoinType === 'taproot') {
              inputData.tapInternalKey = keyPairData.internalPubkey;
            }

            psbt.addInput(inputData);
            // Rough estimation for fee calculation
            if (inputSum >= amountSats + (inputsCount * 150 + 2 * 34 + 10) * selectedFeeRate) break;
          }

          if (inputSum < amountSats) throw new Error('Insufficient balance');

          // Final Fee Calculation (Virtual Size estimation)
          // Input P2WPKH is ~68 vbytes, P2TR is ~58 vbytes
          // Output is ~31-34 vbytes
          const inputSize = chain.bitcoinType === 'taproot' ? 58 : 68;
          const estimatedSize = inputsCount * inputSize + 2 * 34 + 10;
          const totalFee = estimatedSize * selectedFeeRate;
          const change = inputSum - amountSats - totalFee;

          psbt.addOutput({ address: recipient, value: BigInt(amountSats) });
          if (change > 546) { // Dust limit
            psbt.addOutput({ address: sourceAddress, value: BigInt(Math.floor(change)) });
          }

          // 5. Sign & Finalize
          for (let i = 0; i < inputsCount; i++) {
            if (chain.bitcoinType === 'taproot') {
              // Taproot (P2TR) requires tweaking the private key for single-key paths
              const tweakedPrivKey = ecc.privateAdd(
                keyPairData.privateKey,
                bitcoin.crypto.taggedHash('TapTweak', keyPairData.internalPubkey!)
              );
              if (!tweakedPrivKey) throw new Error('Failed to tweak private key for Taproot');
              const tweakedSigner = ECPair.fromPrivateKey(Buffer.from(tweakedPrivKey));
              psbt.signInput(i, tweakedSigner);
            } else {
              psbt.signInput(i, signer);
            }
          }
          
          psbt.finalizeAllInputs();
          const txHex = psbt.extractTransaction().toHex();

          // 6. Broadcast
          return await broadcastTx(txHex);
          
        } catch (error: any) {
          console.error('BTC Send Error:', error);
          throw new Error(error.message || 'Failed to send Bitcoin');
        }
      },

      sendSolana: async (recipient, amountSol, mnemonic) => {
        const { chainId, networks } = get();
        const chain = networks.find(n => n.id === chainId) || getChain(chainId);
        if (chain.type !== 'solana') throw new Error('Not on Solana network');

        const { deriveSolanaKeyPair } = await import('@/lib/wallet/manager');
        const { sendSolana } = await import('@/lib/blockchain/solana');
        
        const keypair = deriveSolanaKeyPair(mnemonic);
        const signature = await sendSolana(chain.rpc, keypair, recipient, amountSol);
        return signature;
      },

      reset: () => {
        set({
          wallets: [],
          activeWalletId: null,
          theme: 'light',
          hiddenTokens: [],
          decryptedWallet: null,
          balance: '0.00',
          tokenBalances: [],
          isLocked: true,
          prices: {},
          transactions: [],
          customTokens: [],
          networks: Object.values(DEFAULT_CHAINS),
          addressBook: {},
        });
        localStorage.removeItem('mgwallet-store');
      },

      sendBitcoinCash: async (recipient, amountBch, mnemonic) => {
        const { activeWalletId, wallets, chainId, networks } = get();
        const activeWallet = wallets.find(w => w.id === activeWalletId);
        const chain = networks.find(n => n.id === chainId) || getChain(chainId);
        if (chain.type !== 'bitcoin-cash') throw new Error('Not on Bitcoin Cash network');
        if (!activeWallet?.addresses.bch) throw new Error('BCH address not initialized');

        const { deriveBitcoinCashKeyPair } = await import('@/lib/wallet/manager');
        const { fetchBchUtxos, sendBitcoinCash } = await import('@/lib/blockchain/bitcoincash');
        
        const keypair = deriveBitcoinCashKeyPair(mnemonic);
        const utxos = await fetchBchUtxos(activeWallet.addresses.bch);
        
        // bitcore-lib-cash PrivateKey handles the signing
        const { ECPairFactory } = await import('ecpair');
        const ecc = await import('tiny-secp256k1');
        const ECPair = ECPairFactory(ecc);
        const wif = ECPair.fromPrivateKey(Buffer.from(keypair.privateKey)).toWIF();

        return await sendBitcoinCash(chain.rpc, wif, recipient, amountBch, utxos);
      },

      sendLitecoin: async (recipient, amountLtc, mnemonic, feePriority = 'average') => {
        const { activeWalletId, wallets, chainId, networks } = get();
        const activeWallet = wallets.find(w => w.id === activeWalletId);
        const { LTC_CHAIN_ID } = await import('@/lib/blockchain/chains');
        if (chainId !== LTC_CHAIN_ID) throw new Error('Not on Litecoin network');
        if (!activeWallet?.addresses.ltc) throw new Error('Litecoin address not initialized');

        const { LITECOIN_NETWORK } = await import('@/lib/wallet/manager');
        const { fetchLtcUtxos, broadcastLtcTx, getLtcScriptPubKey } = await import('@/lib/blockchain/litecoin');
        const { fetchRecommendedFees } = await import('@/lib/blockchain/bitcoin'); // Can reuse fee estimator logic if applicable to LTCSpace
        
        const utxos = await fetchLtcUtxos(activeWallet.addresses.ltc);
        const fees = await fetchRecommendedFees(); // LTC usually has extremely low fees
        const feeRate = feePriority === 'fast' ? fees.fastestFee : (feePriority === 'average' ? fees.halfHourFee : fees.hourFee);

        const { BIP32Factory } = await import('bip32');
        const ecc = await import('tiny-secp256k1');
        const bip32 = BIP32Factory(ecc);
        
        const { Mnemonic } = await import('ethers');
        const seed = Mnemonic.fromPhrase(mnemonic).computeSeed();
        const root = bip32.fromSeed(Buffer.from(seed.slice(2), 'hex'), LITECOIN_NETWORK);
        const child = root.derivePath("m/84'/2'/0'/0/0");
        
        const psbt = new (await import('bitcoinjs-lib')).Psbt({ network: LITECOIN_NETWORK });
        
        let totalInput = 0n;
        const amountSats = BigInt(Math.floor(parseFloat(amountLtc) * 100000000));
        
        for (const utxo of utxos) {
          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
              script: getLtcScriptPubKey(activeWallet.addresses.ltc!),
              value: BigInt(utxo.value),
            },
          });
          totalInput += BigInt(utxo.value);
          if (totalInput >= amountSats + 10000n) break; // Rough fee estimate
        }

        const fee = 1000n; // LTC fees are typically very small
        psbt.addOutput({
          address: recipient,
          value: amountSats,
        });

        if (totalInput > amountSats + fee) {
          psbt.addOutput({
            address: activeWallet.addresses.ltc!,
            value: totalInput - amountSats - fee,
          });
        }

        const { ECPairFactory } = await import('ecpair');
        const ECPair = ECPairFactory(ecc);
        const signer = ECPair.fromPrivateKey(Buffer.from(child.privateKey!), { network: LITECOIN_NETWORK });
        
        psbt.signAllInputs(signer);
        psbt.finalizeAllInputs();
        
        const txHex = psbt.extractTransaction().toHex();
        return await broadcastLtcTx(txHex);
      },
    }),
    {
      name: 'mgwallet-store',
      storage: createJSONStorage(() => localStorage),
      version: 5,
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;

        if (version < 4) {
          const defaults = Object.values(DEFAULT_CHAINS);
          const current = state.networks || [];
          const missing = defaults.filter((d: any) => !current.find((n: any) => n.id === d.id));
          state = {
            ...state,
            networks: [...current, ...missing]
          };
        }

        if (version < 5) {
          if (state.encryptedWallet && state.address) {
            const mainWallet: WalletAccount = {
              id: 'main-1',
              name: 'Main Wallet 1',
              encryptedMnemonic: state.encryptedWallet,
              addresses: {
                evm: state.address,
                btcSegwit: state.btcSegwitAddress,
                btcTaproot: state.btcTaprootAddress,
                solana: state.solanaAddress,
                bch: state.bchAddress,
                ltc: state.ltcAddress,
                near: state.nearAddress,
                sui: state.suiAddress,
                aptos: state.aptosAddress,
                cardano: state.cardanoAddress,
                xrp: state.xrpAddress,
                ton: state.tonAddress,
                tron: state.tronAddress,
              }
            };
            state = {
              ...state,
              wallets: [mainWallet],
              activeWalletId: 'main-1',
              theme: state.theme || 'light',
              hiddenTokens: state.hiddenTokens || [],
            };
            delete state.encryptedWallet;
            delete state.address;
            delete state.btcSegwitAddress;
            delete state.btcTaprootAddress;
            delete state.solanaAddress;
            delete state.bchAddress;
            delete state.ltcAddress;
            delete state.nearAddress;
            delete state.suiAddress;
            delete state.aptosAddress;
            delete state.cardanoAddress;
            delete state.xrpAddress;
            delete state.tonAddress;
            delete state.tronAddress;
          }
        }
        return state;
      },
      partialize: (state) => ({
        wallets: state.wallets,
        activeWalletId: state.activeWalletId,
        chainId: state.chainId,
        theme: state.theme,
        hiddenTokens: state.hiddenTokens,
        customTokens: state.customTokens,
        networks: state.networks,
        addressBook: state.addressBook,
        isBiometricEnabled: state.isBiometricEnabled,
        biometricCredentialId: state.biometricCredentialId,
        biometricEncryptedPassword: state.biometricEncryptedPassword,
      }),
    }
  )
);
