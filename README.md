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

| Account                   | Type     | Owner             | Purpose                                             |
| ------------------------- | -------- | ----------------- | --------------------------------------------------- |
| `StreamData`              | PDA      | Vesting Program   | Stores all stream fields — schedule, amounts, flags |
| `EscrowTokenAccount`      | SPL ATA  | StreamData PDA    | Holds locked tokens — no human key controls this    |
| `Mint Account`            | SPL Mint | SPL Token Program | Defines which token is distributed                  |
| `Creator Token Account`   | ATA      | Creator           | Source of tokens at creation                        |
| `Recipient Token Account` | ATA      | Recipient         | Destination of claimed tokens                       |

**StreamData PDA seeds:** `["stream", creator_pubkey, recipient_pubkey, stream_id_bytes]`

---

## Tech stack

| Layer              | Choice                         | Why                                                         |
| ------------------ | ------------------------------ | ----------------------------------------------------------- |
| On-chain program   | Anchor 0.32.1 (Rust)           | Auto IDL, declarative account validation, industry standard |
| Frontend (Week 5+) | Next.js + TypeScript           | File-based routing, Vercel preview deploys for BD demos     |
| On-chain SDK       | `@coral-xyz/anchor`            | Reads IDL, typed instruction calls, Borsh serialization     |
| Wallet             | `@solana/wallet-adapter-react` | Phantom, Backpack, Solflare in one hook                     |
| Testing            | Anchor test suite (Mocha/Chai) | Auto-scaffolded, typed, error-code assertions               |
| Local dev          | Solana test validator          | Ships with Solana CLI, zero extra setup                     |

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

| Error                       | Fix                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `anchor: command not found` | Run `avm use 0.32.1` and restart your terminal                                                               |
| `Program id mismatch`       | Run `anchor keys sync` inside `contracts/`                                                                   |
| `Error: Account not found`  | The test validator isn't running — run `anchor test` (auto-starts) or start `solana-test-validator` manually |
| `insufficient funds`        | Run `solana airdrop 2`                                                                                       |
| pnpm not found              | Run `npm install -g pnpm`                                                                                    |

---

## Tips

- Use `pnpm` for all JS package management — `npm` and `yarn` may cause lock file conflicts
- Run `anchor build` before `anchor test` if you change Rust code and see stale IDL errors
- The `contracts/rust-toolchain.toml` pins the Rust version — don't remove it

---

## Working with agents

This project uses Claude Code skills (specialized agent workflows) to accelerate development and enforce best practices. Skills provide domain-specific knowledge, structured workflows, and automated quality checks.

### Why use agents?

- **Faster iterations:** Pre-built workflows for common tasks (program setup, testing, deployment)
- **Domain expertise:** Solana-specific patterns, security checks, and API best practices
- **Consistency:** Enforced coding standards, test coverage, and UI/UX patterns
- **Reduced errors:** Automated validation catches issues before they hit CI

### Skills used in this project

#### 1. **solana-dev**

**Purpose:** End-to-end Solana development — Anchor programs, testing, deployment, client SDK generation

**Use when:**

- Building or modifying on-chain programs
- Setting up testing infrastructure (LiteSVM, Mollusk, Surfpool)
- Debugging Rust/Anchor errors
- Generating typed clients from IDL
- Deploying to devnet/mainnet

**What it provides:**

- Anchor best practices (account validation, CPI patterns, error handling)
- Security checklist (integer overflow, PDA derivation, signer checks)
- Testing patterns (unit tests with LiteSVM, integration tests with Surfpool)
- Toolchain setup guidance (Rust/Solana/Anchor version compatibility)

**Invoke:**

```bash
# In Claude Code
User: "Build a withdraw instruction for linear vesting"
Claude: *invokes solana-dev skill, implements with security checks + tests*
```

#### 2. **ui-ux-pro-max**

**Purpose:** Frontend design system, component architecture, accessibility, and UX patterns

**Use when:**

- Designing UI components (dashboards, forms, modals)
- Building responsive layouts
- Implementing design systems (colors, typography, spacing)
- Optimizing user flows (onboarding, error states, loading states)

**What it provides:**

- React/Next.js component patterns
- Tailwind CSS best practices
- Accessibility guidelines (WCAG compliance, keyboard nav, screen reader support)
- Wallet connection UX patterns

**Invoke:**

```bash
# In Claude Code
User: "Design a stream creation form with wallet connect"
Claude: *invokes ui-ux-pro-max, builds accessible form with error handling*
```

#### 3. **superpowers**

**Purpose:** Meta-skills for systematic problem-solving and development workflows

**Sub-skills used:**

- `brainstorming`: Explore requirements and design before implementation
- `systematic-debugging`: Structured debugging workflow for test failures
- `test-driven-development`: TDD workflow (test first, then implement)
- `writing-plans`: Break complex tasks into step-by-step implementation plans
- `verification-before-completion`: Final checks before marking work complete

**Use when:**

- Starting a new feature (brainstorming → planning → TDD)
- Debugging failing tests (systematic-debugging)
- Complex multi-step tasks (writing-plans → executing-plans)
- Before claiming "done" (verification-before-completion)

**What it provides:**

- Structured workflows that prevent skipped steps
- Quality gates (tests must pass, security checks, edge case coverage)
- Clear deliverables (diffs, test output, deployment steps)

**Invoke:**

```bash
# In Claude Code
User: "Add milestone vesting support"
Claude: *invokes brainstorming → solana-dev → TDD workflow*
  1. Brainstorm requirements and edge cases
  2. Plan implementation (state changes, validation, tests)
  3. Write failing tests
  4. Implement instruction
  5. Verify all tests pass + security checks
```

### How to use these skills

This project is configured to work with Agent CLIs (Claude Code, Codex, etc.) that support skill-based workflows.

#### Basic usage

**Auto-invoke (recommended):**
Just describe what you want to build. The agent detects context and picks the right skill automatically.

```bash
# Example sessions
You: "Build a withdraw instruction with linear vesting calculation"
Agent: *auto-invokes solana-dev → implements with security checks + tests*

You: "Fix the CI error with edition2024"
Agent: *auto-invokes solana-dev → diagnoses version mismatch → fixes Cargo.toml + CI*

You: "Design a stream creation form with wallet connect"
Agent: *auto-invokes ui-ux-pro-max → builds accessible component*

You: "Add milestone vesting support"
Agent: *chains: brainstorming → solana-dev → TDD → verification*
```

**Manual invoke:**
If you want to force a specific skill, use the skill command:

```bash
# Claude Code
/skill solana-dev "implement cancel with escrow refund"
/skill ui-ux-pro-max "design stream dashboard"
/skill superpowers:brainstorming "plan milestone verification"

# Codex
"use solana-dev skill to add withdraw logic"

# Other agents
Check your agent's documentation for skill invocation syntax
```

#### Tips

- **Let auto-detection work:** Describe the full task instead of just invoking a skill name. The agent gets better context.
- **Skills chain automatically:** Complex tasks trigger multiple skills in sequence (brainstorming → implementation → testing → verification).
- **Check available skills:** Run `/help skills` (Claude Code) or check `.claude/skills/` directory.
