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
  address: string | null; // Primary EVM address
  btcSegwitAddress: string | null;
  btcTaprootAddress: string | null;
  solanaAddress: string | null;
  bchAddress: string | null;
  ltcAddress: string | null;
  nearAddress: string | null;
  suiAddress: string | null;
  aptosAddress: string | null;
  cardanoAddress: string | null;
  xrpAddress: string | null;
  tonAddress: string | null;
  tronAddress: string | null;
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
  networks: Chain[];
  addressBook: Record<string, string>; // name -> address
  
  // Actions
  setChainId: (chainId: number) => void;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  setWallet: (encryptedWallet: string, address: string, otherAddresses?: Partial<WalletStore>) => void;
  updateBalance: () => Promise<void>;
  updatePrices: () => Promise<void>;
  updateTransactions: () => Promise<void>;
  addToken: (token: Token) => void;
  addNetwork: (chain: Chain) => void;
  updateNetwork: (chainId: number, chain: Partial<Chain>) => void;
  removeNetwork: (chainId: number) => void;
  resetNetworks: () => void;
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
      encryptedWallet: null,
      address: null,
      btcSegwitAddress: null,
      btcTaprootAddress: null,
      solanaAddress: null,
      bchAddress: null,
      ltcAddress: null,
      nearAddress: null,
      suiAddress: null,
      aptosAddress: null,
      cardanoAddress: null,
      xrpAddress: null,
      tonAddress: null,
      tronAddress: null,
      chainId: DEFAULT_CHAIN_ID,
      decryptedWallet: null,
      balance: '0.00',
      tokenBalances: [],
      isLocked: true,
      prices: {},
      transactions: [],
      customTokens: [],
      networks: Object.values(DEFAULT_CHAINS),
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
        const { encryptedWallet } = get();
        if (!encryptedWallet) return false;

        try {
          const decryptedData = await decryptData(encryptedWallet, password);
          const walletData: WalletData = JSON.parse(decryptedData);
          
          let wallet: Wallet | HDNodeWallet;
          if (walletData.type === 'mnemonic' && walletData.mnemonic) {
            const { deriveWalletFromMnemonic, deriveBitcoinAddress, deriveSolanaAddress } = await import('@/lib/wallet/manager');
            wallet = deriveWalletFromMnemonic(walletData.mnemonic);
            
            const segwit = deriveBitcoinAddress(walletData.mnemonic, 'segwit');
            const taproot = deriveBitcoinAddress(walletData.mnemonic, 'taproot');
            const solana = deriveSolanaAddress(walletData.mnemonic);
            const mg = await import('@/lib/wallet/manager');
            const bch = mg.deriveBitcoinCashAddress(walletData.mnemonic);
            const ltc = mg.deriveLitecoinAddress(walletData.mnemonic);
            const near = await mg.deriveNearAddress(walletData.mnemonic);
            const sui = await mg.deriveSuiAddress(walletData.mnemonic);
            const aptos = await mg.deriveAptosAddress(walletData.mnemonic);
            const cardano = await mg.deriveCardanoAddress(walletData.mnemonic);
            const xrp = await mg.deriveRippleAddress(walletData.mnemonic);
            const ton = await mg.deriveTonAddress(walletData.mnemonic);
            const tron = await mg.deriveTronAddress(walletData.mnemonic);

            set({ 
              btcSegwitAddress: segwit, 
              btcTaprootAddress: taproot, 
              solanaAddress: solana, 
              bchAddress: bch, 
              ltcAddress: ltc,
              nearAddress: near,
              suiAddress: sui,
              aptosAddress: aptos,
              cardanoAddress: cardano,
              xrpAddress: xrp,
              tonAddress: ton,
              tronAddress: tron
            });
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

      setWallet: (encryptedWallet, address, otherAddresses = {}) => {
        set({ 
          encryptedWallet, 
          address, 
          ...otherAddresses,
          isLocked: true 
        });
      },

      updateBalance: async () => {
        const { address, btcSegwitAddress, btcTaprootAddress, solanaAddress, bchAddress, ltcAddress, chainId, customTokens, networks } = get();
        if (!address) return;

        try {
          const chain = networks.find(n => n.id === chainId) || getChain(chainId);
          
          if (chain.type === 'bitcoin') {
            const btcAddress = chain.bitcoinType === 'segwit' ? btcSegwitAddress : btcTaprootAddress;
            // For Litecoin, use ltcAddress, otherwise use BTC addresses
            const targetAddress = chain.id === (await import('@/lib/blockchain/chains')).LTC_CHAIN_ID ? ltcAddress : btcAddress;
            
            if (!targetAddress) return;

            const response = await fetch(`${chain.rpc}/address/${targetAddress}`);
            const data = await response.json();
            const balanceSats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            const balanceLtcOrBtc = (balanceSats / 100000000).toString();
            
            set({ balance: balanceLtcOrBtc, tokenBalances: [] });
            return;
          }

          if (chain.type === 'solana') {
            if (!solanaAddress) return;
            const { fetchSolanaBalance } = await import('@/lib/blockchain/solana');
            const solBalance = await fetchSolanaBalance(chain.rpc, solanaAddress);
            set({ balance: solBalance, tokenBalances: [] });
            return;
          }

          if (chain.type === 'bitcoin-cash') {
            if (!bchAddress) return;
            const { fetchBchBalance } = await import('@/lib/blockchain/bitcoincash');
            const bchBal = await fetchBchBalance(bchAddress);
            set({ balance: bchBal, tokenBalances: [] });
            return;
          }

          const { NEAR_CHAIN_ID, SUI_CHAIN_ID, APTOS_CHAIN_ID, CARDANO_CHAIN_ID, XRP_CHAIN_ID, TON_CHAIN_ID, TRX_CHAIN_ID } = await import('@/lib/blockchain/chains');
          
          if (chainId === NEAR_CHAIN_ID || chainId === SUI_CHAIN_ID || chainId === APTOS_CHAIN_ID || chainId === CARDANO_CHAIN_ID || chainId === XRP_CHAIN_ID || chainId === TON_CHAIN_ID || chainId === TRX_CHAIN_ID) {
            // Placeholder for new chains balance fetching
            set({ balance: '0.00', tokenBalances: [] });
            return;
          }

          const provider = new JsonRpcProvider(
            chain.rpc, 
            { chainId: chain.id, name: chain.name.toLowerCase() }, 
            { staticNetwork: true }
          );
          
          const balanceWei = await provider.getBalance(address);
          const nativeBal = formatEther(balanceWei);
          
          const tokensToFetch = [
            ...(POPULAR_TOKENS[chainId] || []),
            ...customTokens.filter(t => t.chainId === chainId)
          ];

          const tokenBals: TokenBalance[] = await Promise.all(
            tokensToFetch.map(async (token) => {
              try {
                const { balance } = await fetchTokenBalance(chain.rpc, token.address, address, chainId);
                return { ...token, balance, usdValue: 0 };
              } catch (e) {
                console.warn(`Failed to fetch balance for ${token.symbol}:`, e);
                return { ...token, balance: '0', usdValue: 0 };
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
        const { address, btcSegwitAddress, btcTaprootAddress, chainId } = get();
        if (!address) return;

        try {
          const chain = getChain(chainId);
          if (chain.type === 'bitcoin') {
            const btcAddress = chain.bitcoinType === 'segwit' ? btcSegwitAddress : btcTaprootAddress;
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
            const txs = await getTransactionHistory(address, chainId);
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
        const { encryptedWallet } = get();
        if (!encryptedWallet) return false;

        try {
          const { encryptData } = await import('@/lib/crypto/encryption');
          const decryptedData = await decryptData(encryptedWallet, oldPassword);
          const newEncryptedWallet = await encryptData(decryptedData, newPassword);
          
          set({ encryptedWallet: newEncryptedWallet });
          return true;
        } catch (error) {
          console.error('Password change failed:', error);
          return false;
        }
      },

      sendBitcoin: async (recipient, amountBtc, mnemonic, feePriority = 'average') => {
        const { btcSegwitAddress, btcTaprootAddress, chainId } = get();
        const chain = getChain(chainId);
        const sourceAddress = chain.bitcoinType === 'segwit' ? btcSegwitAddress : btcTaprootAddress;
        
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
          encryptedWallet: null,
          address: null,
          btcSegwitAddress: null,
          btcTaprootAddress: null,
          solanaAddress: null,
          bchAddress: null,
          ltcAddress: null,
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
        const { chainId, networks, bchAddress } = get();
        const chain = networks.find(n => n.id === chainId) || getChain(chainId);
        if (chain.type !== 'bitcoin-cash') throw new Error('Not on Bitcoin Cash network');
        if (!bchAddress) throw new Error('BCH address not initialized');

        const { deriveBitcoinCashKeyPair } = await import('@/lib/wallet/manager');
        const { fetchBchUtxos, sendBitcoinCash } = await import('@/lib/blockchain/bitcoincash');
        
        const keypair = deriveBitcoinCashKeyPair(mnemonic);
        const utxos = await fetchBchUtxos(bchAddress);
        
        // bitcore-lib-cash PrivateKey handles the signing
        const { ECPairFactory } = await import('ecpair');
        const ecc = await import('tiny-secp256k1');
        const ECPair = ECPairFactory(ecc);
        const wif = ECPair.fromPrivateKey(Buffer.from(keypair.privateKey)).toWIF();

        return await sendBitcoinCash(chain.rpc, wif, recipient, amountBch, utxos);
      },

      sendLitecoin: async (recipient, amountLtc, mnemonic, feePriority = 'average') => {
        const { chainId, networks, ltcAddress } = get();
        const { LTC_CHAIN_ID } = await import('@/lib/blockchain/chains');
        if (chainId !== LTC_CHAIN_ID) throw new Error('Not on Litecoin network');
        if (!ltcAddress) throw new Error('Litecoin address not initialized');

        const { LITECOIN_NETWORK } = await import('@/lib/wallet/manager');
        const { fetchLtcUtxos, broadcastLtcTx, getLtcScriptPubKey } = await import('@/lib/blockchain/litecoin');
        const { fetchRecommendedFees } = await import('@/lib/blockchain/bitcoin'); // Can reuse fee estimator logic if applicable to LTCSpace
        
        const utxos = await fetchLtcUtxos(ltcAddress);
        const fees = await fetchRecommendedFees(); // LTC usually has extremely low fees, we can use these or fixed 1-2 sat/vB
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
              script: getLtcScriptPubKey(ltcAddress),
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
            address: ltcAddress,
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
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version < 4) {
          // Ensure new default chains (like NEAR, Sui, Aptos, etc) are added to existing users
          const { DEFAULT_CHAINS } = require('@/lib/blockchain/chains');
          const defaults = Object.values(DEFAULT_CHAINS);
          const current = persistedState.networks || [];
          const missing = defaults.filter((d: any) => !current.find((n: any) => n.id === d.id));
          return {
            ...persistedState,
            networks: [...current, ...missing]
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        encryptedWallet: state.encryptedWallet,
        address: state.address,
        btcSegwitAddress: state.btcSegwitAddress,
        btcTaprootAddress: state.btcTaprootAddress,
        solanaAddress: state.solanaAddress,
        bchAddress: state.bchAddress,
        ltcAddress: state.ltcAddress,
        nearAddress: state.nearAddress,
        suiAddress: state.suiAddress,
        aptosAddress: state.aptosAddress,
        cardanoAddress: state.cardanoAddress,
        xrpAddress: state.xrpAddress,
        tonAddress: state.tonAddress,
        tronAddress: state.tronAddress,
        chainId: state.chainId,
        customTokens: state.customTokens,
        networks: state.networks,
        addressBook: state.addressBook,
      }),
    }
  )
);
