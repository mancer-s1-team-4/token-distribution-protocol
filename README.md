# Token Distribution Protocol

Token Distribution Protocol is a Solana/Anchor program and Next.js app for token vesting streams. Creators lock SPL tokens into a PDA-owned escrow, define a schedule, and recipients withdraw the amount that has vested.

## How it works

Tokens are locked in a Program Derived Address (PDA) escrow at stream creation. The program tracks how much has vested using one of three schedules and releases only what the recipient has earned. No wallet can move the locked tokens directly.

Three vesting schedules are supported:

- **Linear**: tokens unlock continuously from start to end.
- **Cliff + Linear**: no tokens unlock until the cliff date, then vesting continues linearly.
- **Milestone**: tokens unlock when a designated verifier marks each milestone complete.

## Folder structure

```
token-distribution-protocol/
├── contracts/                     # Anchor workspace
│   ├── programs/token-distribution-protocol/src/
│   ├── scripts/                   # Manual deployment helpers
│   ├── tests/                     # Anchor TypeScript tests
│   ├── Anchor.toml
│   └── Cargo.toml
├── frontend/                      # Next.js app
│   ├── app/
│   ├── components/
│   └── lib/
└── README.md
```

## Account structure

| Account                   | Type     | Owner             | Purpose                                             |
| ------------------------- | -------- | ----------------- | --------------------------------------------------- |
| `StreamData`              | PDA      | Vesting Program   | Stores all stream fields — schedule, amounts, flags |
| `EscrowTokenAccount`      | SPL ATA  | StreamData PDA    | Holds locked tokens — no human key controls this    |
| `Mint Account`            | SPL Mint | SPL Token Program | Defines which token is distributed                  |
| `Creator Token Account`   | ATA      | Creator           | Source of tokens at creation                        |
| `Recipient Token Account` | ATA      | Recipient         | Destination of claimed tokens                       |

`StreamData` PDA seeds: `["stream", creator_pubkey, recipient_pubkey, stream_id_bytes]`.

## Tech stack

| Layer              | Choice                         | Why                                                         |
| ------------------ | ------------------------------ | ----------------------------------------------------------- |
| On-chain program   | Anchor 0.32.1 (Rust)           | Auto IDL, declarative account validation, industry standard |
| Frontend           | Next.js + TypeScript           | Wallet connection and stream management UI                  |
| On-chain SDK       | `@coral-xyz/anchor`            | Reads IDL, typed instruction calls, Borsh serialization     |
| Wallet             | `@solana/wallet-adapter-react` | Phantom, Backpack, Solflare in one hook                     |
| Testing            | Anchor test suite (Mocha/Chai) | Auto-scaffolded, typed, error-code assertions               |
| Local dev          | Solana test validator          | Ships with Solana CLI, zero extra setup                     |

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

## Setup contracts

Install the Anchor workspace dependencies:

```bash
cd contracts
rtk pnpm install
```

For local development, you can use the default Solana CLI wallet:

```bash
rtk solana-keygen new --outfile ~/.config/solana/id.json
rtk solana config set --keypair ~/.config/solana/id.json
rtk solana config set --url localhost
```

### Dedicated Mancer deploy wallet

For deployment, use a dedicated wallet stored at the root of the Anchor workspace:

```bash
cd contracts
rtk solana-keygen new --outfile ./mancer-deployer.json
```

The file `contracts/mancer-deployer.json` is ignored by git. Do not commit it, share it, or paste its contents anywhere.

Check the wallet address:

```bash
rtk solana-keygen pubkey ./mancer-deployer.json
```

Use it as the active Solana CLI wallet:

```bash
rtk solana config set --keypair ./mancer-deployer.json
rtk solana config set --url devnet
rtk solana config get
```

Fund it on devnet:

```bash
rtk solana airdrop 5 --url devnet
rtk solana balance --url devnet
```

## Build

```bash
cd contracts
rtk anchor build
```

The compiled program binary goes to `contracts/target/deploy/token_distribution_protocol.so`.
The IDL and TypeScript types land in `contracts/target/idl/` and `contracts/target/types/`.

If you see a program ID mismatch warning, sync it:

```bash
rtk anchor keys sync
```

## Run tests

Tests run against a local validator that Anchor spins up automatically.

```bash
cd contracts
rtk anchor test
```

Expected output:

```
27 passing
```

To run tests against a manually started validator:

```bash
# Terminal 1
rtk solana-test-validator

# Terminal 2
cd contracts
rtk anchor test --skip-local-validator
```

## Deploy to devnet

Use the manual deployment script. It uses the active Solana CLI wallet unless `ANCHOR_WALLET` is set.

```bash
cd contracts
rtk pnpm run deploy:devnet
```

To deploy with the dedicated Mancer deploy wallet without changing your global Solana config:

```bash
cd contracts
ANCHOR_WALLET=./mancer-deployer.json rtk pnpm run deploy:devnet
```

Current devnet deployment:

- Program ID: `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`
- Devnet Explorer: [View program on Solana Explorer](https://explorer.solana.com/address/J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3?cluster=devnet)
- Upgrade authority: `G5zy6qdVJ71Z1hP5QiGYkfyRLZ34CZaLBRQEYrNT1ocY`
- ProgramData address: `HUXED9EDLgqxfB7xToBfajeQQTjDb9MM5TRDQ6MHmP9X`
- Last deployed slot: `463910857`
- Deploy signature: `3ELDie8q3t6yNwpRxfSEcsTvegoEFHWSjjYfrarNs8VJWDeeuc35iQDy5DvXhBqA1AeSJutbCEQcJV9BsDa3Yp4g`

The deploy script runs:

1. `solana config set --url devnet --keypair <wallet>`
2. `solana balance`
3. `anchor build`
4. `anchor deploy --provider.cluster devnet`
5. `solana program show <PROGRAM_ID>`

## Setup frontend

Install frontend dependencies:

```bash
cd frontend
rtk pnpm install
```

Create `frontend/.env.local` for devnet:

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_TDP_PROGRAM_ID=J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3
```

Run the Next.js app:

```bash
cd frontend
rtk bun run dev
```

The local app runs at `http://localhost:3000`.

The app supports creating linear/cliff streams, viewing streams for the connected wallet, withdrawing vested tokens, verifying milestones, and cancelling cancelable streams.

### Analytics

The frontend is already connected to Google Analytics through `frontend/app/layout.tsx`.

- Google Analytics measurement ID: `G-RLN61Y19VN`
- Script source: `https://www.googletagmanager.com/gtag/js`
- Tracking is loaded with Next.js `Script` using the `afterInteractive` strategy.

## Smart contract instructions

### `initialize`

Creates the protocol state PDA and stores the authority. This is a setup instruction kept from the project scaffold.

### `create_stream`

Creates a new vesting stream and locks tokens into escrow.

The creator signs the transaction, provides the recipient, SPL mint, token amount, schedule times, stream type, and cancelability flag. The program creates:

- `StreamData` PDA using `["stream", creator, recipient, stream_id]`
- escrow token account PDA using `["escrow", stream_data]`

Then it transfers tokens from the creator token account into the escrow token account. The escrow authority is the `StreamData` PDA, so only the program can release the funds.

Supported stream types:

- `0`: linear vesting from `start_time` to `end_time`
- `1`: cliff + linear vesting, blocked until `cliff_time`
- `2`: milestone vesting, unlocked by verified milestones

### `withdraw`

Lets the recipient claim vested tokens.

The program calculates:

```text
claimable = vested_amount_now - amount_claimed
```

If `claimable` is greater than zero, the program signs with the `StreamData` PDA seeds and transfers tokens from escrow to the recipient associated token account. It then updates `amount_claimed`.

### `cancel`

Lets the creator cancel a cancelable stream before it is fully vested.

The program calculates vested and unvested balances:

- vested but unclaimed tokens go to the recipient
- unvested tokens go back to the creator

The stream is then marked as cancelled, which prevents further withdraws.

### `add_milestone`

Lets the creator add a milestone to a milestone-type stream.

Each milestone stores:

- token amount unlocked by that milestone
- SHA-256 description hash
- verifier public key
- verification status

The program prevents adding milestones after recipient activity has started and prevents the total milestone amount from exceeding the stream total.

### `verify_milestone`

Lets the designated verifier mark one milestone as complete.

Only the verifier stored on that milestone can call this instruction. Once verified, that milestone's token amount becomes part of the recipient's vested balance and can be withdrawn through `withdraw`.

## End-to-end local flow

1. Build and test the program:

```bash
cd contracts
rtk anchor build
rtk anchor test
```

2. Create and fund the Mancer devnet deploy wallet:

```bash
cd contracts
rtk solana-keygen new --outfile ./mancer-deployer.json
rtk solana config set --keypair ./mancer-deployer.json
rtk solana config set --url devnet
rtk solana airdrop 5 --url devnet
```

3. Deploy:

```bash
cd contracts
ANCHOR_WALLET=./mancer-deployer.json rtk pnpm run deploy:devnet
```

4. Start the frontend:

```bash
cd frontend
rtk pnpm install
rtk bun run dev
```

---

## Common issues

| Error                       | Fix                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `anchor: command not found` | Run `avm use 0.32.1` and restart your terminal                                                                   |
| `Program id mismatch`       | Run `rtk anchor keys sync` inside `contracts/`                                                                   |
| `Error: Account not found`  | The test validator is not running. Run `rtk anchor test` or start `rtk solana-test-validator` manually.           |
| `insufficient funds`        | Run `rtk solana airdrop 5 --url devnet` for devnet.                                                             |
| `Wallet not found`          | Set `ANCHOR_WALLET=./mancer-deployer.json` or run `rtk solana config set --keypair ./mancer-deployer.json`.      |
| pnpm not found              | Run `npm install -g pnpm`.                                                                                        |

---

## Tips

- Use `pnpm` for all JS package management — `npm` and `yarn` may cause lock file conflicts
- Run `anchor build` before `anchor test` if you change Rust code and see stale IDL errors
- The `contracts/rust-toolchain.toml` pins the Rust version — don't remove it
