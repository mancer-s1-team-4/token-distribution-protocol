# Architecture Decision Records

This document records the significant technical decisions made during the development of Vestra. Each record explains the context, the options considered, the decision reached, and the consequences.

---

## ADR-001: PDA Escrow as Token Custodian

**Date:** Week 4  
**Status:** Accepted

### Context

When a creator funds a vesting stream, the tokens must be held somewhere the creator cannot unilaterally reclaim while simultaneously being inaccessible to the recipient until they vest. Three options were evaluated:

1. Store tokens in the creator's own wallet and enforce a "promise not to move them."
2. Use a multisig wallet shared between the creator and a protocol authority.
3. Lock tokens in a program-controlled Program Derived Address (PDA) escrow.

### Decision

Option 3. The escrow token account is a standard SPL `TokenAccount` whose authority is the `StreamData` PDA rather than any human wallet. Because no private key exists for a PDA, only the Vestra program itself can sign transfers out of the escrow.

```
EscrowTokenAccount
  authority = StreamData PDA (["escrow", stream_data])
  → no private key, only the program can move tokens
```

### Consequences

**Positive:**
- Recipient has a cryptographic guarantee that locked tokens cannot be redirected. This is not a promise backed by legal language; it is enforced by the Solana runtime.
- Creator cannot "rug" a non-cancelable stream even if they wanted to.
- No protocol authority key to lose or compromise.

**Negative:**
- Tokens are illiquid for the duration of the stream. There is no emergency escape valve short of deploying a program upgrade.
- Rent for two accounts (StreamData + EscrowTokenAccount) is paid by the creator at stream creation.

---

## ADR-002: Cancel Leaves the Escrow Account Open

**Date:** Week 5  
**Status:** Accepted (revised from original design)

### Context

The original cancel implementation closed both the `EscrowTokenAccount` and the `StreamData` account after transferring funds, returning rent to the creator. During testing, a problem was discovered: when `cancel` was called a second time on an already-cancelled stream, the Anchor account loader tried to deserialize the escrow `TokenAccount` and found it no longer existed. This produced a confusing low-level "account not found" error rather than a meaningful program error like `AlreadyCancelled`.

### Decision

Keep the escrow open (empty) after cancel completes. Do not close it.

The `is_cancelled` flag on `StreamData` is set to `true`. All subsequent instructions (`withdraw`, `cancel`, `add_milestone`) check this flag first and return `StreamExpired` or `AlreadyCancelled` before attempting any token operation. The empty escrow is never touched again.

### Consequences

**Positive:**
- Any call to a cancelled stream returns a clear, named program error immediately.
- Simpler reasoning about account lifecycle: accounts exist for the lifetime of the stream.

**Negative:**
- The creator does not reclaim escrow rent when cancelling. The rent is locked until the stream account is closed (currently requires a program upgrade to add a close instruction).
- Marginally more on-chain state remains after a cancellation.

**Trade-off accepted:** The rent cost is small (a few thousand lamports) and the correctness benefit is significant. A future `close_stream` instruction could return rent after the stream is fully settled.

---

## ADR-003: Three Vesting Schedules in a Single Account Type

**Date:** Week 4  
**Status:** Accepted

### Context

Vestra supports three distinct token release mechanisms: linear, cliff+linear, and milestone. The design question was whether to have one `StreamData` account type with a `stream_type` discriminator or three separate account types (e.g., `LinearStream`, `CliffStream`, `MilestoneStream`).

### Decision

One account type with a `stream_type: u8` discriminator and a `Vec<Milestone>` field that is populated only for milestone streams.

The vesting calculation is dispatched on `stream_type` inside `calculate_vested`:

```rust
match self.stream_type {
    STREAM_TYPE_MILESTONE => { /* sum verified milestone amounts */ }
    _ => { /* linear formula with cliff gate */ }
}
```

### Consequences

**Positive:**
- One account type means one set of PDAs, one IDL type, and one set of SDK helpers on the client side.
- `withdraw`, `cancel`, and the frontend can handle any stream type without needing to know which subtype they are dealing with.
- Adding a fourth schedule type in the future is a single match arm and a flag value.

**Negative:**
- Every `StreamData` account allocates space for `MAX_MILESTONES = 20` milestone entries regardless of stream type. For time-based streams this is wasted space (~1 KB per stream).
- The `milestone_count` and `milestones` fields are dead weight on linear and cliff+linear streams, which requires documentation to clarify.

**Trade-off accepted:** At current Solana rent rates the overhead is under 0.01 SOL per stream. Simplicity of a unified type outweighs the storage cost at this stage.

---

## ADR-004: Caller-Chosen stream_id for PDA Derivation

**Date:** Week 4  
**Status:** Accepted

### Context

The `StreamData` PDA needs a unique seed component to allow a single creator to open multiple streams to the same recipient. Options considered:

1. Use a protocol-global counter stored in `ProtocolState`.
2. Use a hash of (creator, recipient, timestamp).
3. Let the caller pass an arbitrary `u64` identifier.

### Decision

Option 3: the caller provides a `stream_id: u64`. The full PDA seed is `["stream", creator, recipient, stream_id.to_le_bytes()]`.

### Consequences

**Positive:**
- Deterministic: the client can derive the PDA off-chain before the transaction is sent. No additional read is needed to discover the next valid ID.
- No global state contention: clients using counters from a shared state account would need to sequence transactions or risk collision.
- Simple to test: the test suite passes `Date.now()` as a stream ID and gets a unique address every run.

**Negative:**
- The caller must ensure uniqueness for the (creator, recipient) pair. If the same `stream_id` is reused, the transaction fails with an "account already exists" error from Anchor.
- There is no canonical way for a third party to enumerate all streams for a given creator without fetching all `StreamData` accounts and filtering by the `creator` field.

**Mitigation for enumeration:** The client library queries all program accounts of type `StreamData` and filters by `creator` or `recipient` using `getProgramAccounts` with a memcmp filter. The frontend already does this.

---

## ADR-005: Milestone Verification is Off-Chain-Hash-Anchored

**Date:** Week 5  
**Status:** Accepted

### Context

Milestone streams need some way to describe what work triggers a token unlock. Storing full descriptions on-chain would be expensive (variable-length strings with unbounded size). Storing nothing would make the stream opaque. A third approach is to store a fixed-size commitment on-chain and keep the description off-chain.

### Decision

The `Milestone` struct stores a `description_hash: [u8; 32]` field, which is the SHA-256 hash of the off-chain description string. The actual description is stored by the creator in whatever system they prefer (IPFS, Notion, email, a legal contract).

```rust
pub description_hash: [u8; 32],
```

### Consequences

**Positive:**
- Storage is exactly 32 bytes per milestone, regardless of description length.
- The hash creates a tamper-evident link: anyone can verify the description matches the hash without trusting the creator's word.
- The verifier does not need to read the description to call `verify_milestone`; they independently attest based on their own off-chain judgment.

**Negative:**
- The on-chain record alone is not human-readable. A block explorer shows only a hash.
- If the off-chain description is lost, the hash is unverifiable (though the token unlock still functions).

**Trade-off accepted:** On-chain storage costs make storing descriptions impractical. The hash-based approach is standard practice for Solana programs that need to anchor off-chain data.
