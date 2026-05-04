# AGENTS.md

## Project Overview

Token Distribution Protocol is a Solana/Anchor project. The active on-chain
program lives under `contracts/programs/token-distribution-protocol`.

The repository currently has:

- `contracts/`: Anchor workspace, Rust program, migrations, and TypeScript tests.
- `README.md`: high-level project notes.
- `skills-lock.json`: project skill metadata.

## Command Rules

Always prefix shell commands with `rtk`.

Examples:

```bash
rtk git status --short
rtk anchor build
rtk anchor test
rtk pnpm install
```

Use `pnpm` for Node package management. The Anchor workspace is configured with
`package_manager = "pnpm"` in `contracts/Anchor.toml`.

## Anchor Workspace

Run Anchor commands from `contracts/`:

```bash
cd contracts
rtk anchor build
rtk anchor test
```

`anchor test` starts a local validator and runs the TypeScript suite through:

```bash
pnpm exec ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
```

If the sandbox blocks local RPC access, rerun the same command with the required
approval instead of changing the code.

## Program Structure

Keep `contracts/programs/token-distribution-protocol/src/lib.rs` thin. It should
declare modules, expose instruction account types, and route each program method
to an instruction handler.

Use this layout for program code:

```text
src/
  lib.rs
  constant.rs
  error.rs
  event.rs
  instructions/
    mod.rs
    initialize.rs
  state/
    mod.rs
```

Do not create a top-level Rust module named `instruction`. Anchor's `#[program]`
macro generates an internal `instruction` module, so use `instructions/` for the
project module.

For each instruction:

- Put the `#[derive(Accounts)]` context in `instructions/<name>.rs`.
- Put the handler function in the same file as its account context.
- Re-export instruction account types from `instructions/mod.rs`.
- Call handlers from `lib.rs`, for example:

```rust
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    instructions::initialize::handler(ctx)
}
```

## Account Sizing

Use Anchor's `InitSpace` derive for account size templates.

Keep the Anchor discriminator size in `constant.rs`:

```rust
pub const ACCOUNT_DISCRIMINATOR_SIZE: usize = 8;
```

For account structs in `state/`, expose a `SPACE` constant:

```rust
#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub bump: u8,
}

impl ProtocolState {
    pub const SPACE: usize = ACCOUNT_DISCRIMINATOR_SIZE + Self::INIT_SPACE;
}
```

Use that constant in init constraints:

```rust
#[account(init, payer = authority, space = ProtocolState::SPACE)]
```

## Production Anchor Guidelines

- Prefer explicit account constraints over runtime-only checks.
- Store PDA seeds in `constant.rs`.
- Put custom errors in `error.rs` with `#[error_code]`.
- Put emitted event structs in `event.rs`.
- Put persistent account data in `state/`.
- Avoid `UncheckedAccount` unless there is a clear reason and validation follows.
- Add tests for failure cases when adding meaningful instructions or constraints.
- Do not change declared program IDs casually; keep `declare_id!` and
  `Anchor.toml` in sync if the ID must change.

## Git Safety

The worktree may contain user edits. Do not revert unrelated changes. Before
editing, check:

```bash
rtk git status --short
```

Keep changes scoped to the requested task.
