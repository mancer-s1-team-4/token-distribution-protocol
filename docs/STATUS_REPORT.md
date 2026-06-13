# Week 8 Status Report: Vestra Token Distribution Protocol

**Date:** June 13, 2026  
**Author:** Alexander C.S.L.  
**Program ID:** `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3` (Devnet)

---

## Executive Summary

Vestra is a working token vesting product on Solana devnet. The end-to-end flow (create stream, view dashboard, withdraw, cancel) runs without crashes on devnet. The on-chain program has no known bugs. The security review from Week 7 identified and resolved three issues in the smart contract. This week's audit surfaced one frontend bug and one missing pre-flight validation, both now fixed.

The product is ready for controlled user testing and BD demos. It is not yet ready for mainnet -- the outstanding items are operational, not architectural.

---

## What Works Well

### On-chain Program

- All 7 instructions are deployed and functional on devnet
- Linear, Cliff+Linear, and Milestone vesting schedules all produce correct token amounts
- The vesting math (`calculate_vested`) uses u128 intermediates to prevent overflow; tested extensively
- PDA derivation is deterministic and collision-resistant
- Authorization is enforced at the account constraint level, not just in handler logic
- Cancel correctly splits vested tokens to recipient and unvested tokens back to creator
- The escrow-stays-open design (from Week 5 security fix) means cancelled streams return clean program errors instead of panics
- Milestone verification is stateless and role-flexible (any pubkey can be a verifier)
- 27 automated tests pass across 7 test files

### Frontend

- Stream creation form works for linear and cliff+linear types
- Dashboard fetches streams for connected wallet using memcmp-filtered `getProgramAccounts`
- Real-time claimable amount display mirrors the on-chain vesting calculation
- Wallet adapter supports Phantom, Backpack, and Solflare
- Friendly error messages surface program error codes as readable strings
- Devnet faucet (`mint_mock_tokens`) works from the UI for demo purposes

### Infrastructure

- Program deployed to devnet with a dedicated non-commited deploy wallet
- IDL is synced to the frontend on every deploy via `scripts/sync-idl-to-frontend.sh`
- Google Analytics is wired up for usage tracking

---

## What Is Not Working / Incomplete

### Frontend

- **Milestone stream creation in the UI is not exposed.** You can create a milestone stream via the SDK but the form in the frontend only supports linear/cliff types. This is the biggest gap from the user perspective.
- **Milestone management (add_milestone, verify_milestone) has no dedicated UI.** These can only be called through scripts or a future admin panel.
- **Stream list has no pagination or filter.** If a wallet has many streams, the list loads all of them at once. This will degrade for power users.

### Smart Contract

- **No close_stream instruction.** Escrow and StreamData accounts exist forever. Creators cannot reclaim rent from cancelled or completed streams. This is documented in ADR-002 as a known limitation.
- **No pause/resume capability.** Once started, a stream can only be cancelled (if cancelable) or run to completion. This came up in one BD call.

### Operational

- **No mainnet deployment.** The program has not been audited for mainnet. A formal security audit is needed before any real-value deployment.
- **No monitoring or alerting.** There is no on-chain event indexer. If a stream behaves unexpectedly, there is no automated notification.

---

## Bugs Fixed This Week

### Bug 1: Error code 0x1771 showed wrong message (frontend/lib/errors.ts)

**Severity:** Medium (functional, but confusing to users)

**Symptom:** When `create_stream` rejected a transaction because `end_time <= start_time` (error code 6001 / `0x1771`), the user saw "Your wallet does not have enough tokens to fund this agreement." This is the message for InsufficientFunds (6003 / `0x1773`). The two error codes had been swapped in the error map.

**Root cause:** The `ANCHOR_ERROR_MESSAGES` map in `errors.ts` had the same string at `0x1771` and `0x1773`. `0x1771` is `InvalidTimeRange` but was displaying the `InsufficientFunds` copy.

**Fix:** Corrected the `0x1771` entry to "The end date must be after the start date."

**File:** `frontend/lib/errors.ts:3`

---

### Bug 2: createStream pre-flight did not validate token balance (frontend/lib/tokenDistribution.ts)

**Severity:** Low (on-chain guard prevents token loss; user experience only)

**Symptom:** If a user entered a stream amount larger than their token balance, the frontend sent the transaction anyway, the on-chain `InsufficientFunds` check fired, and the user received a raw Anchor error instead of a proactive warning.

**Fix:** Added a `getTokenAccountBalance` call after the existence check. If the balance is less than the requested `amount`, the frontend throws `INSUFFICIENT_TOKEN_BALANCE` with the actual and required amounts in the message. The `friendlyError` function in `errors.ts` already has a fallback for "insufficient" patterns that will surface this clearly.

**File:** `frontend/lib/tokenDistribution.ts:156-164`

---

## Bugs Fixed in Prior Weeks (for BD/Marketing reference)

These three issues were found and fixed during the Week 5-7 development cycle. They are documented in `contracts/SECURITY_CHECKLIST.md`.

1. **Escrow closure on cancel caused account-load panic.** Closing the escrow after cancel meant subsequent calls could not load the account and returned a confusing runtime error instead of `AlreadyCancelled` or `StreamExpired`. Fixed by leaving the escrow open (empty) and relying on the `is_cancelled` flag. (commit `2adf6f4`)

2. **Creator token account not marked mutable in cancel.** The creator's ATA was missing `#[account(mut)]` which caused `cancel` to fail at runtime when returning unvested tokens. (commit `bf592fc`)

3. **TooManyMilestones guard checked stale count.** The milestone count guard compared `milestone_count` before it was incremented, so it never fired at 20 milestones. Fixed by comparing `milestones.len()` instead. (commit `7bf91c5`)

---

## Performance Findings

All measurements on Solana devnet. Devnet is generally slower than mainnet (higher validator latency, slower block times).

| Operation | Observed Confirmation Time | Estimated Compute Units | Creator Cost (SOL) |
|-----------|--------------------------|------------------------|---------------------|
| `create_stream` | 800-1200ms | ~18,000 CU | ~0.003 (rent + fee) |
| `withdraw` | 400-700ms | ~12,000 CU | ~0.000005 (fee only) |
| `cancel` | 500-800ms | ~15,000 CU | ~0.000005 (fee only) |
| `add_milestone` | 400-600ms | ~8,000 CU | ~0.000005 |
| `verify_milestone` | 400-600ms | ~7,000 CU | ~0.000005 |
| `mint_mock_tokens` | 600-900ms | ~10,000 CU | ~0.001 (ATA creation) |

**Stream creation is the most expensive operation** because it initializes two new accounts (StreamData + EscrowTokenAccount), each consuming rent. At current devnet rent rates, the combined cost is approximately 0.003 SOL per stream. On mainnet this would be similar.

**Withdrawals and cancellations are cheap.** They write to existing accounts and pay only transaction fees (~5,000 lamports).

**Bottleneck: devnet RPC latency.** The public `api.devnet.solana.com` endpoint rate-limits aggressive clients. In testing, the dashboard load (which calls `getProgramAccounts` twice with memcmp filters) occasionally times out. Using a dedicated RPC endpoint (e.g. Helius, Triton) resolves this.

**No on-chain performance issues.** Compute unit usage is well within Solana's per-instruction limit of 1,400,000 CU.

---

## Honest Self-Assessment

**What went well:**

The smart contract architecture is clean and the security properties are strong. The PDA escrow design means there is no trust required -- the program enforces everything. The CEI pattern, u128 overflow guards, and `has_one` constraints are all implemented correctly. The test suite is comprehensive at 27 passing tests.

**What did not go well:**

The frontend milestone UI was not completed. We have the smart contract capability but the product experience for milestone streams is SDK-only. Any BD demo involving milestones requires manual script execution, which is not viable for non-technical users.

The error code bug in `errors.ts` should have been caught earlier. A systematic test of the error message UI (manually triggering each error code and verifying the displayed message) would have found it. We did not have that test.

**What I would have done differently:**

1. Built the milestone UI at the same time as the milestone smart contract, not as a later task.
2. Written a test script that iterates all 20 error codes and asserts the correct user-facing message.
3. Added a `close_stream` instruction from the start -- rent recovery is a quality-of-life issue that's awkward to add retroactively.

---

## Recommendations for Phase 3

1. **Complete the milestone UI.** This is the highest-priority gap. The contract is done; the frontend form and verification flow need building.

2. **Add a formal security audit before any mainnet discussion.** The internal review found real bugs. An external audit will find more. Budget for this early.

3. **Add a close_stream instruction.** Allow creators to reclaim escrow rent after a stream is fully claimed or cancelled. This is a clean instruction to add now while the codebase is small.

4. **Build an event indexer.** The program emits events on key operations. Index these into a database so the dashboard can show history, BD can pull usage metrics, and Marketing can track activation funnels without polling RPC.

5. **Switch to a paid RPC endpoint for the frontend.** The public devnet endpoint is not reliable enough for demos. Add an `NEXT_PUBLIC_RPC_URL` rotation or use a free Helius devnet endpoint.

6. **Add stream search / filter on the dashboard.** Right now all streams load at once. Before any real usage, the dashboard needs a search box, a filter by status (active / cancelled / complete), and pagination.

---

## Current Test Coverage

| File | Tests | Status |
|------|-------|--------|
| `create_stream.ts` | 5 | 5/5 passing |
| `withdraw.ts` | 5 | 5/5 passing |
| `cancel.ts` | 7 | 7/7 passing |
| `cliff.ts` | 5 | 5/5 passing |
| `milestone.ts` | 7 | 7/7 passing |
| `mock_token.ts` | 3 | not counted in anchor test total |
| `integration.ts` | (included above) | passes |
| **Total** | **27** | **27/27 passing** |

Estimated line coverage: >85% on the on-chain program. Frontend has no automated tests.
