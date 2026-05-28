"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from "@solana/kit";
import { clusterApiUrl } from "@solana/web3.js";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { PrivyProvider } from "@privy-io/react-auth";

import "@solana/wallet-adapter-react-ui/styles.css";

const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "cmpmuqh7s005p0dle996tutnw";

function getRpcSubscriptionsEndpoint(endpoint: string) {
  if (process.env.NEXT_PUBLIC_RPC_WS_URL) {
    return process.env.NEXT_PUBLIC_RPC_WS_URL;
  }

  return endpoint.replace(/^http/, "ws");
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet"),
    []
  );
  const rpcSubscriptionsEndpoint = useMemo(
    () => getRpcSubscriptionsEndpoint(endpoint),
    [endpoint]
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );
  const privyConfig = useMemo<PrivyClientConfig>(
    () => ({
      solana: {
        rpcs: {
          "solana:devnet": {
            rpc: createSolanaRpc(endpoint),
            rpcSubscriptions: createSolanaRpcSubscriptions(
              rpcSubscriptionsEndpoint
            ),
          },
        },
      },
      loginMethods: ["email", "wallet"],
      appearance: {
        theme: "dark",
        accentColor: "#7c3aed",
        walletChainType: "solana-only",
      },
      embeddedWallets: {
        solana: {
          createOnLogin: "off",
        },
      },
    }),
    [endpoint, rpcSubscriptionsEndpoint]
  );

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={privyConfig}
    >
      <ConnectionProvider endpoint={endpoint}>
        <SolanaWalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  );
}
