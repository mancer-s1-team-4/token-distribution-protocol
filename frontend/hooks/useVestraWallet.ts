"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as usePrivySolanaWallets } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";

/**
 * Unified wallet hook: returns WalletContextState regardless of whether
 * the user logged in via Privy Gmail (embedded wallet) or a browser extension
 * (Phantom / Solflare via wallet adapter). Downstream code does not need to
 * know which path was used.
 */
export function useVestraWallet(): WalletContextState {
  const adapterWallet = useWallet();
  const { authenticated } = usePrivy();
  const { wallets: privyWallets } = usePrivySolanaWallets();

  const privyWallet = useMemo(() => privyWallets[0] ?? null, [privyWallets]);

  return useMemo<WalletContextState>(() => {
    // Browser extension wallet takes priority when connected.
    if (adapterWallet.connected && adapterWallet.publicKey) {
      return adapterWallet;
    }

    // Fall back to Privy embedded wallet (Gmail login).
    if (authenticated && privyWallet?.address) {
      const publicKey = new PublicKey(privyWallet.address);

      const signTransaction = async <T extends Transaction | VersionedTransaction>(
        tx: T
      ): Promise<T> => {
        const bytes =
          tx instanceof VersionedTransaction
            ? tx.serialize()
            : tx.serialize({ requireAllSignatures: false });

        const { signedTransaction } = await privyWallet.signTransaction({
          transaction: bytes,
        });

        return (
          tx instanceof VersionedTransaction
            ? VersionedTransaction.deserialize(signedTransaction)
            : Transaction.from(signedTransaction)
        ) as T;
      };

      const signAllTransactions = async <
        T extends Transaction | VersionedTransaction
      >(
        txs: T[]
      ): Promise<T[]> => Promise.all(txs.map(signTransaction));

      return {
        ...adapterWallet,
        publicKey,
        connected: true,
        connecting: false,
        disconnecting: false,
        signTransaction,
        signAllTransactions,
      } as unknown as WalletContextState;
    }

    return adapterWallet;
  }, [adapterWallet, authenticated, privyWallet]);
}
