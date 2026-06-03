# Security Checklist — Token Distribution Protocol
**Week 7 | Reviewer: Alexander C.S.L.**

---

## 1. Signer Authority

| Instruction | Required Signer | Enforcement | Status |
|---|---|---|---|
| `create_stream` | Creator | `Signer<'info>` on `creator` account | PASS |
| `withdraw` | Recipient | `Signer<'info>` on `recipient` + `has_one = recipient` on stream_data | PASS |
| `cancel` | Creator | `Signer<'info>` on `creator` + `has_one = creator` on stream_data | PASS |
| `add_milestone` | Creator | `Signer<'info>` on `creator` + `has_one = creator` on stream_data | PASS |
| `verify_milestone` | Designated verifier | `Signer<'info>` on `verifier` + runtime check `verifier.key() == milestone.verifier` | PASS |

Unauthorized access attempts are tested in `tests/integration.ts` (security tests) and `tests/withdraw.ts`, `tests/cancel.ts`, `tests/milestone.ts`.

---

## 2. PDA Seed Uniqueness

| PDA | Seeds | Uniqueness Guarantee |
|---|---|---|
| `stream_data` | `["stream", creator, recipient, stream_id_le8]` | `stream_id` is caller-chosen; same `(creator, recipient, stream_id)` triple cannot be re-initialized (Anchor `init` rejects already-existing accounts) |
| `escrow_token_account` | `["escrow", stream_data]` | Derived from `stream_data` PDA, which is already unique |

PDA collision resistance is tested in `tests/integration.ts` ("duplicate stream_id ... is rejected").

---

## 3. Integer Overflow

The critical multiplication in `calculate_vested`:

```rust
let vested = (self.amount_total as u128)
    .checked_mul(elapsed)
    .unwrap_or(u128::MAX)
    / duration;
vested.min(self.amount_total as u128) as u64
```

- Intermediate is `u128` (max ~3.4e38), preventing overflow for any `u64` amount and elapsed value.
- `checked_mul` with `unwrap_or(u128::MAX)` handles the impossible-in-practice overflow defensively.
- Result is capped at `amount_total` before casting back to `u64`.
- `amount_claimed` update uses `checked_add(...).ok_or(ArithmeticOverflow)?`.
- `saturating_sub` used in cancel for `earned_unclaimed` and `unvested` calculations.

Status: **PASS** — no overflow path exists under normal or adversarial inputs.

---

## 4. Account Ownership

Anchor's `Account<'info, T>` type validates:
- The account is owned by the program (`owner == program_id`).
- The account discriminator matches `T`.

Token accounts carry `token::mint` and `token::authority` constraints that Anchor validates during instruction account resolution — before any CPI runs. The escrow authority is `stream_data` (a PDA), so only the program can sign CPIs to move tokens out of escrow.

Status: **PASS**

---

## 5. Reentrancy

Solana's execution model prevents reentrancy at the runtime level: a transaction is atomic and no external program can call back into the vesting program mid-instruction. State mutations (`amount_claimed`, `is_cancelled`) are written after CPI token transfers in both `withdraw` and `cancel`. In Solana's model this is safe, but the ordering matches the checks-effects-interactions pattern used in Ethereum for clarity.

Status: **PASS** (runtime prevents reentrancy; pattern is correct regardless)

---

## 6. Issues Found and Fixed

### Issue 1: Escrow closure on cancel broke subsequent error paths
**Symptom:** After a successful `cancel`, a second `cancel` call would panic with an account-load error instead of returning `AlreadyCancelled`. Similarly, a `withdraw` after cancel would error on loading the closed escrow instead of returning `StreamExpired`.

**Root cause:** The original `cancel` implementation closed the escrow token account and returned rent to the creator. Subsequent calls tried to deserialize the closed account as a `TokenAccount` and failed before the `is_cancelled` guard on `stream_data` could fire.

**Fix (commit `2adf6f4`):** Removed the `close` attribute from `escrow_token_account` in the `Cancel` context. The escrow stays open (empty) after cancel. The `is_cancelled` guard on `stream_data` now fires first on repeated calls, returning the correct program error.

---

### Issue 2: `creator_token_account` not marked mutable in cancel
**Symptom:** `cancel` failed at runtime when trying to return unvested tokens to the creator because the account was not writable.

**Root cause:** The `creator_token_account` field in `Cancel` was missing `#[account(mut)]`, which Solana enforces — any account receiving tokens must be marked writable.

**Fix (commit `bf592fc` / earlier):** Added `#[account(mut)]` to `creator_token_account` in the `Cancel` accounts struct.

---

### Issue 3: `milestone_count` vs `milestones.len()` in TooManyMilestones guard
**Symptom:** The `TooManyMilestones` error never fired because `milestone_count` was checked before it was incremented.

**Root cause:** The guard compared `stream_data.milestone_count >= MAX_MILESTONES` but `milestone_count` was only updated after the push, so the check always saw the pre-push value.

**Fix (commit `7bf91c5`):** Changed the guard to `stream_data.milestones.len() >= MAX_MILESTONES as usize`, which reflects the current live length of the `Vec` after the push would occur.

---

## 7. Coverage Summary

All five test files combined cover the following instructions:

| Instruction | Files | Tests |
|---|---|---|
| `create_stream` | create_stream.ts, integration.ts | 10+ |
| `withdraw` | withdraw.ts, cliff.ts, cancel.ts, milestone.ts, integration.ts | 20+ |
| `cancel` | cancel.ts, integration.ts | 9+ |
| `add_milestone` | milestone.ts, integration.ts | 3+ |
| `verify_milestone` | milestone.ts, integration.ts | 7+ |

Estimated line coverage: **>85%** across all instruction handlers and `calculate_vested`.
Branches not covered: `initialize` (scaffold only), `mint_mock_tokens` (frontend utility, tested separately).
