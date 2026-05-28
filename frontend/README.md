# Vestra — Frontend

Web interface for the Vestra token distribution protocol on Solana.

Built with Next.js 16, Tailwind CSS v4, and Solana Wallet Adapter.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Phantom or Solflare wallet

### Install

```bash
pnpm install
```

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | Explorer cluster for custom RPC URLs (`devnet`, `testnet`, or `mainnet-beta`) | Derived from RPC URL |
| `NEXT_PUBLIC_TDP_PROGRAM_ID` | Deployed program ID | Read from IDL (`J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics ID (optional) | — |

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Type-check + build

```bash
pnpm type-check
pnpm build
```

---

## Devnet program

- Program ID: `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`
- Explorer: https://explorer.solana.com/address/J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3?cluster=devnet

---

## Demo flow

A BD teammate can demo the product end-to-end using this sequence:

1. **Open the app** — click "Open app" on the landing page.
2. **Connect wallet** — click "Select Wallet", choose Phantom or Solflare. The button shows your truncated address when connected.
3. **Create an agreement** — click "New agreement". Use the onboarding tour ("How to use this form?") to walk through each field step by step.
   - Search for a token (e.g. USDC) or paste a custom mint address.
   - Set recipient, amount, start and end dates.
   - Click "Review agreement", then "Confirm and send".
   - Watch the toast: **Approve in wallet → Sending → Confirmed** with a Solana Explorer link.
4. **View the dashboard** — agreements appear automatically after confirmation. Each card shows:
   - Status pill: Pending / Active / Completed / Cancelled
   - Total, Unlocked, Claimed, and Claimable amounts
   - Time remaining (updates every 30 seconds)
   - A progress bar for claimed vs total
5. **Claim tokens** — as the recipient wallet, click "Claim tokens" on an active agreement.
6. **Cancel an agreement** — as the creator, click "Cancel". A confirmation dialog shows exactly what happens to unreleased tokens before the transaction fires.

> All demo transactions run on **Devnet**. Get test SOL at [faucet.solana.com](https://faucet.solana.com).

---

## Key decisions

- **Client-side vesting math** — unlocked and claimable amounts are computed in the browser by mirroring the on-chain `calculate_vested` formula (`lib/streamMath.ts`). Avoids an extra RPC call per stream card and keeps the dashboard fast.
- **In-house toast** — no external library. ~150 LOC, brand-consistent, supports three-phase transaction feedback (approve → sending → confirmed).
- **Token search** — replaces raw address paste with a searchable picker for known devnet tokens, plus a manual fallback for any custom mint.
- **Decimal handling** — decimals are fetched per-mint via `getMint` from `@solana/spl-token` and cached in memory. User-entered amounts are always converted to base units before the transaction, so `1000` USDC correctly becomes `1_000_000_000` on-chain.

---

## Project structure

```
app/
  page.tsx              Landing page
  layout.tsx            Root layout (WalletProvider + ToastProvider)
  globals.css           Design tokens + animations
  streams/
    page.tsx            Dashboard — list, withdraw, cancel
    create/page.tsx     Create agreement form
components/
  WalletProvider.tsx    Phantom + Solflare adapters
  ToastProvider.tsx     Toast context + stack
  Toast.tsx             Single toast item
  ConfirmDialog.tsx     Native <dialog> modal
  Address.tsx           Truncate + copy to clipboard
  StatusPill.tsx        Status badge (Active / Pending / Completed / Cancelled)
  TokenSearch.tsx       Searchable token picker with manual fallback
  FormTour.tsx          Interactive step-by-step onboarding tour
lib/
  tokenDistribution.ts  Anchor program client + transaction helpers
  mint.ts               Mint decimal fetch + UI amount formatting
  streamMath.ts         Client-side vesting math (mirrors on-chain logic)
  errors.ts             Friendly error message mapping
  txRunner.ts           Three-phase transaction driver
```
