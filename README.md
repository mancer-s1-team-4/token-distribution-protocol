<div align="center">

# Token Distribution Protocol

A trustless, on-chain token vesting program built on Solana with Anchor.
Lock tokens in a PDA-controlled escrow, define a schedule, and let recipients claim what they've earned — no manual steps, no intermediaries.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## How it works

Tokens are locked in a Program Derived Address (PDA) escrow at stream creation. The program tracks how much has vested using one of three schedules and releases only what the recipient has earned. No human — including the stream creator — can move the locked tokens directly.

Three vesting schedules are supported:

- **Linear** — tokens unlock continuously from start to end
- **Cliff + Linear** — zero tokens until the cliff date, then linear from cliff to end
- **Milestone** — tokens unlock when a designated verifier marks each milestone complete

---

## Folder structure

```
token-distribution-protocol/
├── contracts/                     # Anchor program (on-chain)
│   ├── programs/
│   │   └── token-distribution-protocol/
│   │       └── src/
│   │           ├── lib.rs         # Program entry point, instruction routing
│   │           ├── constant.rs    # Shared constants (seeds, discriminator size)
│   │           ├── error.rs       # VestingError enum — 16 custom error codes
│   │           ├── event.rs       # Anchor events emitted by instructions
│   │           ├── state/
│   │           │   └── mod.rs     # StreamData, Milestone, ProtocolState structs
│   │           └── instructions/
│   │               ├── mod.rs
│   │               ├── initialize.rs
│   │               ├── create_stream.rs   # Arya (Week 4)
│   │               ├── withdraw.rs        # Alex (Week 4)
│   │               └── cancel.rs          # Alex (Week 4)
│   ├── tests/
│   │   └── token-distribution-protocol.ts
│   ├── Anchor.toml
│   └── Cargo.toml
└── README.md
```

---

## Account structure

| Account | Type | Owner | Purpose |
|---|---|---|---|
| `StreamData` | PDA | Vesting Program | Stores all stream fields — schedule, amounts, flags |
| `EscrowTokenAccount` | SPL ATA | StreamData PDA | Holds locked tokens — no human key controls this |
| `Mint Account` | SPL Mint | SPL Token Program | Defines which token is distributed |
| `Creator Token Account` | ATA | Creator | Source of tokens at creation |
| `Recipient Token Account` | ATA | Recipient | Destination of claimed tokens |

**StreamData PDA seeds:** `["stream", creator_pubkey, recipient_pubkey, stream_id_bytes]`

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| On-chain program | Anchor 0.32.1 (Rust) | Auto IDL, declarative account validation, industry standard |
| Frontend (Week 5+) | Next.js + TypeScript | File-based routing, Vercel preview deploys for BD demos |
| On-chain SDK | `@coral-xyz/anchor` | Reads IDL, typed instruction calls, Borsh serialization |
| Wallet | `@solana/wallet-adapter-react` | Phantom, Backpack, Solflare in one hook |
| Testing | Anchor test suite (Mocha/Chai) | Auto-scaffolded, typed, error-code assertions |
| Local dev | Solana test validator | Ships with Solana CLI, zero extra setup |

---

## Prerequisites

Install these tools before running anything.

**1. Rust**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable
```

**2. Solana CLI** (1.18.x recommended)

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana --version   # should print 1.18.x
```

**3. Anchor CLI** (must be 0.32.1 — this project uses 0.32.1 syntax)

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.32.1
avm use 0.32.1
anchor --version   # should print anchor-cli 0.32.1
```

**4. Node.js** (20 or later)

```bash
node --version   # should print v20.x.x or higher
```

**5. pnpm**

```bash
npm install -g pnpm
pnpm --version
```

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/<org>/token-distribution-protocol.git
cd token-distribution-protocol

# 2. Install JS dependencies
cd contracts
pnpm install

# 3. Generate a local keypair (skip if you already have one)
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --keypair ~/.config/solana/id.json

# 4. Set cluster to localnet for development
solana config set --url localhost
```

---

## Build

```bash
cd contracts
anchor build
```

The compiled program binary goes to `contracts/target/deploy/token_distribution_protocol.so`.
The IDL and TypeScript types land in `contracts/target/idl/` and `contracts/target/types/`.

If you see a program ID mismatch warning, sync it:

```bash
anchor keys sync
```

---

## Run tests

Tests run against a local validator that Anchor spins up automatically.

```bash
cd contracts
anchor test
```

Expected output (Week 3):

```
token-distribution-protocol
  ✔ deploys successfully — program ID is set
  ✔ initialize — executes and returns a transaction signature
  ✔ create_stream — stub compiles and returns Ok
  ✔ withdraw — stub compiles and returns Ok
  ✔ cancel — stub compiles and returns Ok

5 passing
```

To run tests against a manually started validator:

```bash
# Terminal 1
solana-test-validator

# Terminal 2
cd contracts
anchor test --skip-local-validator
```

---

## Deploy to devnet

```bash
# 1. Switch cluster
solana config set --url devnet

# 2. Airdrop SOL for deploy fees (devnet faucet)
solana airdrop 2

# 3. Build for deployment
cd contracts
anchor build

# 4. Deploy
anchor deploy --provider.cluster devnet

# 5. Verify deployment
solana program show <PROGRAM_ID>
```

The program ID is `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`.

To run tests on devnet (slower, requires funded keypair):

```bash
cd contracts
anchor test --provider.cluster devnet
```

---

## Common issues

| Error | Fix |
|---|---|
| `anchor: command not found` | Run `avm use 0.32.1` and restart your terminal |
| `Program id mismatch` | Run `anchor keys sync` inside `contracts/` |
| `Error: Account not found` | The test validator isn't running — run `anchor test` (auto-starts) or start `solana-test-validator` manually |
| `insufficient funds` | Run `solana airdrop 2` |
| pnpm not found | Run `npm install -g pnpm` |

---

## Tips

- Use `pnpm` for all JS package management — `npm` and `yarn` may cause lock file conflicts
- Run `anchor build` before `anchor test` if you change Rust code and see stale IDL errors
- The `contracts/rust-toolchain.toml` pins the Rust version — don't remove it
