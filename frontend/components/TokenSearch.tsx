"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type KnownToken = {
  name: string;
  symbol: string;
  mint: string;
  decimals: number;
};

const DEVNET_TOKENS: KnownToken[] = [
  {
    name: "USD Coin",
    symbol: "USDC",
    mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    decimals: 6,
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    mint: "EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS",
    decimals: 6,
  },
  {
    name: "Wrapped SOL",
    symbol: "wSOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
  },
  {
    name: "Bonk",
    symbol: "BONK",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
  },
  {
    name: "Jupiter",
    symbol: "JUP",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
  },
  {
    name: "Raydium",
    symbol: "RAY",
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
  },
  {
    name: "Orca",
    symbol: "ORCA",
    mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    decimals: 6,
  },
  {
    name: "Pyth Network",
    symbol: "PYTH",
    mint: "HZ1JovNiVvGqGHjms4bDGhkbmnnynG1NxZEQj9ksGSJP",
    decimals: 6,
  },
  {
    name: "Jito",
    symbol: "JTO",
    mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    decimals: 9,
  },
  {
    name: "Marinade Staked SOL",
    symbol: "mSOL",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9,
  },
  {
    name: "Samoyedcoin",
    symbol: "SAMO",
    mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    decimals: 9,
  },
  {
    name: "Dogwifhat",
    symbol: "WIF",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
  },
];

function looksLikePubkey(s: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

type TokenSearchProps = {
  value: string;
  onChange: (mint: string, decimals?: number) => void;
  error?: string;
};

export function TokenSearch({ value, onChange, error }: TokenSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [manualMode, setManualMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive selectedToken from value — no state needed
  const selectedToken = useMemo(
    () => DEVNET_TOKENS.find((t) => t.mint === value) ?? null,
    [value]
  );

  // No sync effect needed — parent resets via key prop change.

  const filtered = query
    ? DEVNET_TOKENS.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.symbol.toLowerCase().includes(query.toLowerCase())
      )
    : DEVNET_TOKENS;

  function selectToken(token: KnownToken) {
    setQuery("");
    setOpen(false);
    setManualMode(false);
    onChange(token.mint, token.decimals);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    const count = filtered.length + 1; // +1 for "paste manually"
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + count) % count);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        selectToken(filtered[activeIndex]);
      } else {
        setManualMode(true);
        setOpen(false);
        setQuery("");
        onChange("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  if (manualMode) {
    return (
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste token contract address"
            autoComplete="off"
            className={`w-full rounded-md border bg-secondary/45 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              error ? "border-destructive" : "border-border"
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setManualMode(false);
              setQuery("");
              onChange("");
            }}
            className="shrink-0 rounded-md border border-border bg-card/70 px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary/70"
          >
            Search tokens
          </button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-md border bg-secondary/45 px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={
            selectedToken
              ? `${selectedToken.name} (${selectedToken.symbol})`
              : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            onChange("");
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search token by name or symbol…"
          autoComplete="off"
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        {selectedToken ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
              setOpen(true);
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear selection"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-md border border-border bg-white text-foreground shadow-lg"
        >
          {filtered.length === 0 && !looksLikePubkey(query) ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No tokens match &ldquo;{query}&rdquo;
            </li>
          ) : null}

          {filtered.map((token, i) => (
            <li key={token.mint}>
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === i}
                onClick={() => selectToken(token)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                  activeIndex === i
                    ? "bg-secondary text-foreground"
                    : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <div>
                  <span className="font-bold">{token.symbol}</span>
                  <span className="ml-2 text-muted-foreground">
                    {token.name}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {token.mint.slice(0, 4)}…{token.mint.slice(-4)}
                </span>
              </button>
            </li>
          ))}

          {looksLikePubkey(query) ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(query);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-primary transition-colors hover:bg-secondary/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Use this address:{" "}
                <span className="font-mono">{query.slice(0, 8)}…</span>
              </button>
            </li>
          ) : null}

          <li>
            <button
              type="button"
              onClick={() => {
                setManualMode(true);
                setOpen(false);
                setQuery("");
                onChange("");
              }}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Paste address manually
            </button>
          </li>
        </ul>
      ) : null}

      {error && !open ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
