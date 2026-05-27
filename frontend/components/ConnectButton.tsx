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

  const displayName = user?.google?.email ?? displayAddress;

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
              width="16"
              height="16"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
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
