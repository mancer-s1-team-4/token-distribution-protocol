# ADR-002: Two-PDA Account Structure (StreamData + Escrow)

**Status:** Accepted
**Date:** 2026-06-11

---

## Context

Every stream needs to store two things: the vesting schedule (creator, recipient, amounts, times, milestones) and the locked tokens themselves. The question is how to structure the on-chain accounts that hold these.

Options considered:
1. One account holds both state and tokens.
2. Two accounts: a state PDA (`stream_data`) and a separate token account PDA (`escrow_token_account`).

---

## Decision

Two separate PDAs: `stream_data` for state, `escrow_token_account` for tokens.

**`stream_data` PDA seeds:** `["stream", creator, recipient, stream_id_le8]`

**`escrow_token_account` PDA seeds:** `["escrow", stream_data]`

---

## Reasons

**1. SPL token accounts have a fixed layout**

An SPL token account is a 165-byte struct defined by the Token program. It cannot be extended with custom fields. A Solana account is either owned by the Token program (and uses token account layout) or owned by this program (and uses custom layout) — it cannot be both. State and token storage must live in separate accounts.

**2. Escrow authority via PDA**

Setting `token::authority = stream_data` on the escrow means the escrow is controlled by the `stream_data` PDA, which has no private key. Only the vesting program — signing with `stream_data`'s seeds and bump — can authorize transfers out of escrow. No wallet can directly drain the escrow. This is the core security invariant of the protocol.

**3. Derived escrow address removes trust from the creator**

The escrow PDA is deterministically derived from `stream_data`. Any observer can recompute the escrow address from the stream and verify on-chain that the correct amount is locked. The creator has no ability to substitute a different token account.

**4. `stream_id` enables parallel streams**

Including `stream_id` in the `stream_data` seeds means a `(creator, recipient)` pair can have multiple concurrent streams with different schedules. Without `stream_id`, only one stream could exist between two wallets at a time.

---

## Tradeoffs

**Two accounts = two rent deposits.** Each stream requires two account creations (paid by the creator). `stream_data` is roughly 500 bytes; `escrow_token_account` is 165 bytes. Combined rent is approximately 0.003–0.005 SOL depending on Solana's rent schedule at time of creation.

Alternatives that avoid the second account don't exist within the SPL token model — the token program enforces its own account layout, making a merged account architecturally impossible.

---

## Consequences

- Every `create_stream` call initializes two accounts and requires two sets of PDA seeds.
- `withdraw` and `cancel` CPIs use `stream_data` as the authority, signing with its seeds + bump.
- The escrow is verifiable independently — any client can derive its address and check its balance without trusting the stream creator.
- Escrow rent is paid by the creator at stream creation and is NOT reclaimed on cancel (see ADR-003).
