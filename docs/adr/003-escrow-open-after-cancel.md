# ADR-003: Escrow Account Stays Open After Cancel

**Status:** Accepted
**Date:** 2026-06-11

---

## Context

When `cancel` is called, all tokens are transferred out of the escrow (vested tokens to recipient, unvested to creator). The escrow token account ends up empty. The original implementation used Anchor's `close = creator` attribute on `escrow_token_account`, which closes the account and returns its rent lamports to the creator.

This caused a discovered bug: after a successful cancel, a second `cancel` call or a `withdraw` call would panic with an account-load error instead of returning a meaningful program error.

---

## Decision

Do not close the escrow token account on cancel. Leave it open (empty) after token transfers. Mark `stream_data.is_cancelled = true` instead.

---

## Reasons

**Root cause of the bug:**

When Anchor's `close` attribute runs, it zeros the account data and reassigns ownership to the System Program. On the next instruction call, Anchor tries to deserialize `escrow_token_account` as a `TokenAccount`. But a System-owned account with zeroed data fails the Token program's ownership check — the deserialization panics before any instruction handler code runs.

This means the `is_cancelled` guard on `stream_data` never fires. The caller receives an opaque account-load error instead of `AlreadyCancelled` or `StreamExpired`.

**Why keeping the escrow open fixes it:**

An empty token account is still a valid `TokenAccount`. Anchor can load it, validate it, and pass control to the instruction handler. The handler then checks `stream_data.is_cancelled` and returns the correct program error immediately.

**Guard ordering:**

`stream_data.is_cancelled` is checked as an account constraint (before handler code). On `cancel`: constraint `!is_cancelled` fires → `AlreadyCancelled`. On `withdraw`: constraint `!is_cancelled` fires → `StreamExpired`. Both return clear, typed errors with descriptive messages.

---

## Tradeoffs

**Rent not reclaimed.** An empty token account still holds ~0.002 SOL of rent. The creator does not recover this on cancel. This is a permanent cost of creating the stream.

Alternatives:
- Close the escrow on cancel and add a custom pre-check: possible but requires reading and deserializing `escrow_token_account` in a separate instruction or using `AccountInfo` instead of typed `Account<TokenAccount>`. This defeats Anchor's account safety guarantees and adds complexity.
- Close the escrow and add `#[account(close = creator)]` only after confirming all guards pass: Anchor's attribute-based closing happens at account resolution, before the handler, so the ordering cannot be rearranged this way.

Keeping the escrow open is the simplest correct solution.

---

## Consequences

- Escrow rent (~0.002 SOL) is a sunk cost for the creator, not reclaimed on cancel.
- Repeated `cancel` calls return `AlreadyCancelled` (not a panic).
- `withdraw` on a cancelled stream returns `StreamExpired` (not a panic).
- All error paths after cancel return typed `VestingError` variants.
- This fix is tested in `tests/cancel.ts` and `tests/integration.ts`.
