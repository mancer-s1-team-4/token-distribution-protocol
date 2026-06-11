# ADR-001: Use Anchor Framework Over Native Solana

**Status:** Accepted
**Date:** 2026-06-11

---

## Context

Solana programs can be written in two ways: Native (raw `solana_program` crate, manual account deserialization) or with the Anchor framework (`anchor-lang`, declarative account constraints via macros).

The Token Distribution Protocol requires:
- Multiple instructions with different account sets and validation rules
- Custom error codes with descriptive messages
- PDA derivation and verification on every instruction
- SPL Token CPI calls with PDA signing authority
- An IDL for client-side type generation

---

## Decision

Use Anchor.

---

## Reasons

**1. Declarative account validation**

Native programs require manually checking: account ownership, discriminators, PDA seeds, signer presence, mutability. Each check is several lines. Anchor's `#[derive(Accounts)]` macro with `seeds`, `bump`, `has_one`, and `constraint` attributes handles all of this before the handler runs. The `create_stream` instruction has 8 accounts with non-trivial cross-validation — Native would require ~80 lines of boilerplate that Anchor collapses to the attribute block.

**2. Automatic discriminators**

Anchor prepends an 8-byte discriminator (hash of the account type name) to every account. This prevents one account type from being passed where another is expected — a class of confusion attacks that Native programs must guard against manually.

**3. `has_one` constraint for authority checks**

The `withdraw` and `cancel` instructions use `has_one = recipient @ VestingError::Unauthorized` and `has_one = creator @ ...` on `stream_data`. Anchor validates that the field on the loaded account matches the provided account — a two-line constraint that would otherwise require explicit equality checks after deserialization in Native.

**4. CPI helpers**

`anchor_spl` provides `transfer()`, `Mint`, `TokenAccount`, and associated token helpers with typed accounts. SPL Token CPIs in Native require manually packing instruction data and account metas.

**5. IDL generation**

Anchor generates a JSON IDL from the source. The frontend uses `@coral-xyz/anchor` with the generated type (`TokenDistributionProtocol`) for fully typed instruction builders and account deserializers. This is not available in Native.

**6. `#[error_code]` macro**

Anchor's error macro assigns offset codes (starting at 6000) and attaches human-readable messages. Native programs encode errors as raw `u32` values with no message metadata.

---

## Tradeoffs

**Cost of Anchor:**
- Larger binary size due to the framework runtime (~30-50KB overhead on a fresh program).
- Discriminator check adds one comparison per instruction — negligible.
- Anchor versions must be pinned carefully; minor version bumps occasionally introduce breaking IDL changes.

**What Native would give:**
- Full control over account layout and instruction dispatch.
- Smaller binary.
- No dependency on Anchor's account model or IDL format.

For this protocol, the verbosity of Native offers no advantage. The program has five production instructions, no exotic account structures, and a frontend that benefits directly from type-safe IDL clients. Anchor is the correct tool.

---

## Consequences

- All instruction accounts use `#[derive(Accounts)]` with Anchor constraints.
- Error codes start at 6000 per Anchor's `#[error_code]` offset.
- Client integration uses `@coral-xyz/anchor` and the generated IDL type.
- The IDL is committed to `frontend/lib/idl/token_distribution_protocol.json`.
