# Vestra Frontend

Next.js app for creating and managing Vestra token vesting streams on Solana.

## Setup

Install dependencies from the frontend workspace:

```bash
rtk pnpm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_TDP_PROGRAM_ID=J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-RLN61Y19VN
```

`NEXT_PUBLIC_GA_MEASUREMENT_ID` is optional. Google Analytics scripts are only loaded when this value is configured.

## Development

```bash
rtk bun run dev
```

Open `http://localhost:3000`.

## Verification

```bash
rtk pnpm type-check
rtk pnpm run build
```

## Devnet Program

- Program ID: `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`
- Explorer: https://explorer.solana.com/address/J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3?cluster=devnet
