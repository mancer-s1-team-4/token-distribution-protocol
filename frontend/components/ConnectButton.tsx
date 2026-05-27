"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets as usePrivySolanaWallets } from "@privy-io/react-auth/solana";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRef, useState, useEffect } from "react";

function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets: privyWallets } = usePrivySolanaWallets();
  const adapterWallet = useWallet();
  const { setVisible } = useWalletModal();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const privyWallet = privyWallets[0] ?? null;

  const isAdapterConnected = adapterWallet.connected && !!adapterWallet.publicKey;
  const isPrivyConnected = authenticated && !!privyWallet?.address;
  const isConnected = isAdapterConnected || isPrivyConnected;

  const displayAddress = isAdapterConnected
    ? shortenAddress(adapterWallet.publicKey!.toBase58())
    : privyWallet?.address
    ? shortenAddress(privyWallet.address)
    : null;

  const displayName = user?.email?.address ?? user?.google?.email ?? displayAddress;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  if (isConnected && displayName) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
          {displayName}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {showMenu ? (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-lg">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent"
              onClick={async () => {
                setShowMenu(false);
                if (isAdapterConnected) await adapterWallet.disconnect();
                if (isPrivyConnected) await logout();
              }}
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu((v) => !v)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Connect Wallet
      </button>

      {showMenu ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[210px] rounded-lg border border-border bg-popover py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent"
            onClick={() => {
              setShowMenu(false);
              login();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Continue with Email
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent"
            onClick={() => {
              setShowMenu(false);
              setVisible(true);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
            Phantom / Solflare
          </button>
        </div>
      ) : null}
    </div>
  );
}
