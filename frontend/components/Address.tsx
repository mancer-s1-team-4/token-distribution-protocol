"use client";

import { useState } from "react";

type AddressProps = {
  address: string;
  chars?: number;
};

export function Address({ address, chars = 4 }: AddressProps) {
  const [copied, setCopied] = useState(false);

  const truncated =
    address.length > chars * 2 + 3
      ? `${address.slice(0, chars)}…${address.slice(-chars)}`
      : address;

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono tabular-nums text-foreground">{truncated}</span>
      <button
        type="button"
        onClick={copy}
        title="Copy full address"
        aria-label="Copy address"
        className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#187640]"
            aria-hidden="true"
          >
            <path d="m20 6-11 11-5-5" />
          </svg>
        ) : (
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
        )}
      </button>
    </span>
  );
}
