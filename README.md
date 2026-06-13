# Vestra

Vestra is a Solana/Anchor program and Next.js app for token vesting streams. Creators lock SPL tokens into a PDA-owned escrow, define a schedule, and recipients withdraw the amount that has vested. No wallet can move the locked tokens directly -- only the program can.

## How it works

Tokens are locked in a Program Derived Address (PDA) escrow at stream creation. The program tracks how much has vested using one of three schedules and releases only what the recipient has earned.

Three vesting schedules are supported:

- **Linear**: tokens unlock continuously from start to end.
- **Cliff + Linear**: no tokens unlock until the cliff date, then vesting continues linearly.
- **Milestone**: tokens unlock when a designated verifier marks each milestone complete.

## Folder structure

```
token-distribution-protocol/
├── contracts/                     # Anchor workspace
│   ├── programs/token-distribution-protocol/src/
│   │   ├── lib.rs                 # Program entry point
│   │   ├── constant.rs            # Seeds and size constants
│   │   ├── error.rs               # 20 error variants (codes 6000-6019)
│   │   ├── event.rs               # Emitted events
│   │   ├── state/mod.rs           # StreamData, Milestone, ProtocolState
│   │   └── instructions/          # One file per instruction
│   ├── scripts/                   # Deployment helpers
│   ├── tests/                     # Anchor TypeScript test suite (7 files)
│   ├── Anchor.toml
│   └── Cargo.toml
├── docs/                          # Technical documentation
│   ├── INSTRUCTION_REFERENCE.md   # Every instruction, parameter, and error code
│   ├── INTEGRATION_GUIDE.md       # Step-by-step guide with working code samples
│   └── ADR.md                     # Architecture decision records
├── frontend/                      # Next.js app
│   ├── app/
│   ├── components/
│   └── lib/
└── README.md
```

## Account structure

| Account | Type | Owner | Purpose |
|---------|------|-------|---------|
| `StreamData` | PDA | Vesting Program | Stores all stream fields: schedule, amounts, flags, milestones |
| `EscrowTokenAccount` | SPL TokenAccount | StreamData PDA | Holds locked tokens -- no human key controls this |
| `Mint Account` | SPL Mint | SPL Token Program | Defines which token is distributed |
| `Creator Token Account` | ATA | Creator | Source of tokens at creation |
| `Recipient Token Account` | ATA | Recipient | Destination of claimed tokens |

`StreamData` PDA seeds: `["stream", creator_pubkey, recipient_pubkey, stream_id_bytes]`

Escrow PDA seeds: `["escrow", stream_data_pubkey]`

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| On-chain program | Anchor 0.32.1 (Rust) | Auto IDL, declarative account validation, industry standard |
| Frontend | Next.js + TypeScript | Wallet connection and stream management UI |
| On-chain SDK | `@coral-xyz/anchor` | Reads IDL, typed instruction calls, Borsh serialization |
| Wallet | `@solana/wallet-adapter-react` | Phantom, Backpack, Solflare in one hook |
| Testing | Anchor test suite (Mocha/Chai) | Auto-scaffolded, typed, error-code assertions |
| Local dev | Solana test validator | Ships with Solana CLI, zero extra setup |

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

**3. Anchor CLI** (must be 0.32.1)

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

## Setup contracts

Install the Anchor workspace dependencies:

```bash
cd contracts
pnpm install
```

For local development, configure the Solana CLI:

```bash
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --keypair ~/.config/solana/id.json
solana config set --url localhost
```

### Dedicated devnet deploy wallet

For deployment, use a dedicated wallet at the root of the Anchor workspace:

```bash
cd contracts
solana-keygen new --outfile ./mancer-deployer.json
```

The file `contracts/mancer-deployer.json` is ignored by git. Do not commit it.

```bash
solana-keygen pubkey ./mancer-deployer.json
solana config set --keypair ./mancer-deployer.json
solana config set --url devnet
solana airdrop 5 --url devnet
solana balance --url devnet
```

## Build

```bash
cd contracts
anchor build
```

The compiled program binary goes to `contracts/target/deploy/token_distribution_protocol.so`. The IDL and TypeScript types land in `contracts/target/idl/` and `contracts/target/types/`.

If you see a program ID mismatch warning, sync it:

```bash
anchor keys sync
```

## Run tests

Tests run against a local validator that Anchor spins up automatically.

```bash
cd contracts
anchor test
```

Expected output: `27 passing`

To run tests against a manually started validator:

```bash
# Terminal 1
solana-test-validator

# Terminal 2
cd contracts
anchor test --skip-local-validator
```

## Deploy to devnet

```bash
cd contracts
pnpm run deploy:devnet
```

For an existing deployment:

```bash
cd contracts
pnpm run upgrade:devnet   # deploy new .so, keep same program ID
pnpm run redeploy:devnet  # full redeploy via anchor deploy
```

Both commands sync the generated IDL into `frontend/lib/idl/token_distribution_protocol.json`.

To deploy with the dedicated wallet without changing your global Solana config:

```bash
cd contracts
ANCHOR_WALLET=./mancer-deployer.json pnpm run deploy:devnet
```

Current devnet deployment:

- Program ID: `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`
- Devnet Explorer: [View program on Solana Explorer](https://explorer.solana.com/address/J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3?cluster=devnet)
- Upgrade authority: `G5zy6qdVJ71Z1hP5QiGYkfyRLZ34CZaLBRQEYrNT1ocY`
- Last deployed slot: `463910857`

The deploy script runs:

1. `solana config set --url devnet --keypair <wallet>`
2. `solana balance`
3. `anchor build`
4. `anchor deploy --provider.cluster devnet`
5. `bash scripts/sync-idl-to-frontend.sh`
6. `solana program show <PROGRAM_ID>`

## Setup frontend

```bash
cd frontend
pnpm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_TDP_PROGRAM_ID=J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-RLN61Y19VN

# Server-only faucet key. Never prefix this with NEXT_PUBLIC.
DEVNET_FAUCET_SECRET_KEY=[1,2,3,...]
DEVNET_FAUCET_AMOUNT_SOL=0.05
DEVNET_FAUCET_MAX_BALANCE_SOL=0.1
```

Run the Next.js app:

```bash
cd frontend
bun run dev
```

The app runs at `http://localhost:3000`.

Features: create linear/cliff/milestone streams, view streams for connected wallet, withdraw vested tokens, verify milestones, cancel cancelable streams.

## Smart contract instructions

Seven instructions are exposed. See [docs/INSTRUCTION_REFERENCE.md](docs/INSTRUCTION_REFERENCE.md) for the full reference including parameters, error codes, and code examples.

| Instruction | Signer | Purpose |
|-------------|--------|---------|
| `initialize` | anyone | One-time scaffold setup; stores protocol authority |
| `create_stream` | creator | Lock tokens and define vesting schedule |
| `withdraw` | recipient | Claim vested tokens |
| `cancel` | creator | Terminate a cancelable stream; split escrow |
| `add_milestone` | creator | Append a milestone to a milestone-type stream |
| `verify_milestone` | designated verifier | Mark a milestone complete, unlocking its tokens |
| `mint_mock_tokens` | anyone | Devnet faucet for testing (max 1,000,000 tokens) |

### Vesting math

**Linear / Cliff+Linear:**

```
if now < cliff_time:  vested = 0
elif now >= end_time: vested = amount_total
else:                 vested = floor(amount_total * (now - start_time) / (end_time - start_time))
```

**Milestone:**

```
vested = sum(milestone.amount for each verified milestone)
```

## Documentation

| File | Contents |
|------|----------|
| [docs/INSTRUCTION_REFERENCE.md](docs/INSTRUCTION_REFERENCE.md) | Every instruction with full parameter tables, error codes, and TypeScript examples |
| [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) | Step-by-step guide to integrate with the program from scratch |
| [docs/ADR.md](docs/ADR.md) | Architecture decision records explaining key technical choices |
| [contracts/SECURITY_CHECKLIST.md](contracts/SECURITY_CHECKLIST.md) | Security review findings and fixes |

## End-to-end local flow

```bash
# 1. Build and test
cd contracts
anchor build
anchor test

# 2. Create and fund a devnet deploy wallet
solana-keygen new --outfile ./mancer-deployer.json
solana config set --keypair ./mancer-deployer.json
solana config set --url devnet
solana airdrop 5 --url devnet

# 3. Deploy
ANCHOR_WALLET=./mancer-deployer.json pnpm run deploy:devnet

# 4. Start the frontend
cd ../frontend
pnpm install
bun run dev
```

---

## Common issues

| Error | Fix |
|-------|-----|
| `anchor: command not found` | Run `avm use 0.32.1` and restart your terminal |
| `Program id mismatch` | Run `anchor keys sync` inside `contracts/` |
| `Error: Account not found` | Validator is not running. Run `anchor test` or start `solana-test-validator` manually |
| `insufficient funds` | Run `solana airdrop 5 --url devnet` |
| `Wallet not found` | Set `ANCHOR_WALLET=./mancer-deployer.json` or run `solana config set --keypair ./mancer-deployer.json` |
| pnpm not found | Run `npm install -g pnpm` |
| Stale IDL errors after Rust changes | Run `anchor build` before `anchor test` |

---

## Tips

- Use `pnpm` for all JS package management -- `npm` and `yarn` may cause lock file conflicts.
- The `contracts/rust-toolchain.toml` pins the Rust version -- do not remove it.
- `stream_id` must be unique per (creator, recipient) pair. Using `Date.now()` works well in scripts and tests.
