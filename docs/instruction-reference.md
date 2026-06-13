# Instruction Reference — Token Distribution Protocol

**Program ID:** `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`

---

## PDA Derivation

All state lives in two PDAs per stream.

**StreamData PDA**
```
seeds = ["stream", creator, recipient, stream_id.to_le_bytes(8)]
```

**Escrow token account PDA**
```
seeds = ["escrow", stream_data]
authority = stream_data
```

The escrow authority is `stream_data`, so only the program (signing via PDA seeds) can move tokens out of escrow.

---

## Stream Types

| Value | Name | Behavior |
|---|---|---|
| `0` | Linear | Tokens vest continuously from `start_time` to `end_time` |
| `1` | Cliff + Linear | No tokens vest before `cliff_time`; linear vesting from `start_time` to `end_time` after cliff |
| `2` | Milestone | Tokens unlock per verified milestone; time parameters are stored but ignored for vesting math |

**Vesting formula (Linear and Cliff+Linear):**
```
vested = amount_total × (now − start_time) / (end_time − start_time)
```
- Intermediate calculation uses `u128` to prevent overflow.
- Result capped at `amount_total`.
- Returns `0` if `now < cliff_time`.
- Returns `amount_total` if `now >= end_time`.

**Vesting formula (Milestone):**
```
vested = sum of amount for all milestones where is_verified == true
```

---

## Instructions

### `create_stream`

Locks tokens in a PDA-owned escrow and writes the vesting schedule. After this call, tokens are under program control — the creator cannot withdraw them directly.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `stream_id` | `u64` | Caller-chosen ID. Allows multiple parallel streams between the same two wallets. Must be unique per `(creator, recipient)` pair. |
| `amount` | `u64` | Total tokens to lock (raw units, respects mint decimals). Must be > 0. |
| `start_time` | `i64` | Unix timestamp when vesting begins. |
| `cliff_time` | `i64` | Unix timestamp of first unlock. Must be in `[start_time, end_time]`. Set equal to `start_time` for no cliff. |
| `end_time` | `i64` | Unix timestamp when fully vested. Must be > `start_time`. |
| `stream_type` | `u8` | `0` = Linear, `1` = Cliff+Linear, `2` = Milestone. |
| `is_cancelable` | `bool` | If `false`, the creator can never cancel this stream — a hard payment guarantee. |

**Accounts**

| Account | Writable | Signer | Description |
|---|---|---|---|
| `creator` | ✓ | ✓ | Pays rent for new accounts; source of tokens. |
| `recipient` | — | — | Stored in `StreamData`; enforced on later instructions. |
| `stream_data` | ✓ | — | New PDA. Seeds: `["stream", creator, recipient, stream_id_le8]`. |
| `escrow_token_account` | ✓ | — | New PDA token account. Seeds: `["escrow", stream_data]`. |
| `creator_token_account` | ✓ | — | Creator's ATA for `mint`; tokens are debited here. |
| `mint` | — | — | SPL token being vested. |
| `token_program` | — | — | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| `associated_token_program` | — | — | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1brs` |
| `system_program` | — | — | `11111111111111111111111111111111` |

**Behavior**
1. Validates: `amount > 0`, `end_time > start_time`, `cliff_time ∈ [start_time, end_time]`, `stream_type ≤ 2`, `creator ≠ recipient`, `creator_token_account.amount ≥ amount`.
2. Initializes `stream_data` PDA and `escrow_token_account` PDA.
3. CPIs `amount` tokens from `creator_token_account` → `escrow_token_account`.
4. Populates all `StreamData` fields; sets `amount_claimed = 0`, `is_cancelled = false`.

**Errors**

| Code | Name | Condition |
|---|---|---|
| 6000 | `InvalidAmount` | `amount == 0` |
| 6001 | `InvalidTimeRange` | `end_time <= start_time` |
| 6002 | `InvalidCliffTime` | `cliff_time < start_time` or `cliff_time > end_time` |
| 6003 | `InsufficientFunds` | `creator_token_account.amount < amount` |
| 6004 | `SelfVesting` | `creator == recipient` |
| 6018 | `InvalidStreamType` | `stream_type > 2` |

---

### `withdraw`

Recipient claims all vested-but-unclaimed tokens. Calculates `claimable = vested(now) − amount_claimed`. Transfers `claimable` tokens from escrow to the recipient's ATA. Takes no parameters — the clock is read on-chain.

**Parameters:** none

**Accounts**

| Account | Writable | Signer | Description |
|---|---|---|---|
| `recipient` | ✓ | ✓ | Must match `stream_data.recipient`. |
| `creator` | — | — | Needed for PDA seed derivation only. |
| `stream_data` | ✓ | — | PDA. `has_one = recipient`. Guards: `!is_cancelled`. |
| `escrow_token_account` | ✓ | — | PDA token account. Authority = `stream_data`. |
| `recipient_token_account` | ✓ | — | Recipient's ATA. Created (`init_if_needed`) if not present. |
| `mint` | — | — | Verified transitively via `stream_data.has_one`. |
| `token_program` | — | — | |
| `associated_token_program` | — | — | |
| `system_program` | — | — | |

**Behavior**
1. Reads `Clock::unix_timestamp`.
2. Calls `calculate_vested(now)`.
3. `claimable = vested − amount_claimed`. Rejects if `claimable == 0`.
4. CPIs `claimable` tokens from escrow → `recipient_token_account`, signing with `stream_data` PDA seeds.
5. Increments `stream_data.amount_claimed` by `claimable`.

**Errors**

| Code | Name | Condition |
|---|---|---|
| 6007 | `Unauthorized` | Signer is not `stream_data.recipient` |
| 6009 | `NothingToWithdraw` | `claimable == 0` (nothing vested, or all already claimed) |
| 6014 | `StreamExpired` | `stream_data.is_cancelled == true` |
| 6017 | `ArithmeticOverflow` | `amount_claimed + claimable` overflows `u64` (defensive; unreachable under normal inputs) |

---

### `cancel`

Creator terminates a cancelable stream. Vested-but-unclaimed tokens go to the recipient; unvested tokens return to the creator. Stream is marked `is_cancelled = true`. The escrow and `stream_data` accounts are left open so subsequent calls return clear program errors rather than account-load panics.

**Parameters:** none

**Accounts**

| Account | Writable | Signer | Description |
|---|---|---|---|
| `creator` | ✓ | ✓ | Must match `stream_data.creator`. Pays rent for `recipient_token_account` if created. |
| `recipient` | ✓ | — | Needed for PDA derivation; receives vested-but-unclaimed tokens. |
| `stream_data` | ✓ | — | PDA. Guards: `is_cancelable`, `!is_cancelled`. |
| `escrow_token_account` | ✓ | — | PDA token account. Left open after transfer. |
| `recipient_token_account` | ✓ | — | Recipient's ATA. Created (`init_if_needed`) if not present. |
| `creator_token_account` | ✓ | — | Creator's ATA. Receives unvested tokens. |
| `mint` | — | — | |
| `token_program` | — | — | |
| `associated_token_program` | — | — | |
| `system_program` | — | — | |

**Behavior**
1. Guards checked at account resolution: `is_cancelable`, `!is_cancelled`.
2. Reads `Clock::unix_timestamp`, calls `calculate_vested(now)`.
3. Rejects if `vested >= amount_total` (stream fully vested — nothing unvested to return).
4. `earned_unclaimed = vested − amount_claimed` (saturating).
5. `unvested = amount_total − vested` (saturating).
6. If `earned_unclaimed > 0`: CPI transfer → `recipient_token_account`.
7. If `unvested > 0`: CPI transfer → `creator_token_account`.
8. Sets `stream_data.is_cancelled = true`.

**Errors**

| Code | Name | Condition |
|---|---|---|
| 6007 | `Unauthorized` | Signer is not `stream_data.creator` |
| 6010 | `StreamNotCancelable` | `stream_data.is_cancelable == false` |
| 6012 | `AlreadyCancelled` | `stream_data.is_cancelled == true` |
| 6013 | `FullyVested` | `vested >= amount_total` — all tokens already belong to recipient |

---

### `add_milestone`

Appends a milestone entry to a `Milestone`-type stream (`stream_type == 2`). Must be called after `create_stream` and before any recipient activity (no withdrawals, no verified milestones).

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `amount` | `u64` | Tokens unlocked when this milestone is verified. Cumulative milestone amounts must not exceed `amount_total`. |
| `description_hash` | `[u8; 32]` | SHA-256 hash of the milestone description string. Fixed-size; full text stored off-chain. |
| `verifier` | `Pubkey` | The only wallet authorized to call `verify_milestone` for this entry. Can be a multisig, oracle, or the investor. |

**Accounts**

| Account | Writable | Signer | Description |
|---|---|---|---|
| `creator` | ✓ | ✓ | Must match `stream_data.creator`. |
| `recipient` | — | — | Needed for PDA seed derivation only. |
| `stream_data` | ✓ | — | PDA. Guards: `stream_type == 2`, `!is_cancelled`, `milestones.len() < 20`. |
| `system_program` | — | — | |

**Behavior**
1. Guards: creator is signer, `stream_type == Milestone`, not cancelled, `milestones.len() < 20`, `amount_claimed == 0 && no milestones verified` (prevents reshaping after activity starts).
2. Pushes `Milestone { amount, description_hash, is_verified: false, verifier }` to `stream_data.milestones`.
3. Validates cumulative milestone amounts ≤ `amount_total`.
4. Increments `stream_data.milestone_count`.

**Errors**

| Code | Name | Condition |
|---|---|---|
| 6007 | `Unauthorized` | Signer is not `stream_data.creator` |
| 6005 | `MilestoneAmountMismatch` | Cumulative milestone amounts > `amount_total` |
| 6006 | `TooManyMilestones` | `milestones.len() >= 20` |
| 6011 | `StreamAlreadyComplete` | `amount_claimed > 0` or at least one milestone is already verified |
| 6014 | `StreamExpired` | `stream_data.is_cancelled == true` |
| 6018 | `InvalidStreamType` | `stream_data.stream_type != 2` |

---

### `verify_milestone`

Designated verifier marks a milestone as completed. After this call, `calculate_vested` includes that milestone's `amount` in the unlocked total, and the recipient can withdraw it via `withdraw`.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `milestone_index` | `u8` | Zero-based index into `stream_data.milestones`. |

**Accounts**

| Account | Writable | Signer | Description |
|---|---|---|---|
| `verifier` | ✓ | ✓ | Must match `stream_data.milestones[milestone_index].verifier`. |
| `creator` | — | — | Needed for PDA seed derivation only. |
| `recipient` | — | — | Needed for PDA seed derivation only. |
| `stream_data` | ✓ | — | PDA. Guard: `!is_cancelled`. |
| `system_program` | — | — | |

**Behavior**
1. Bounds check: `milestone_index < stream_data.milestones.len()`.
2. Loads milestone; rejects if `milestone.is_verified == true`.
3. Rejects if `ctx.signer != milestone.verifier`.
4. Sets `stream_data.milestones[milestone_index].is_verified = true`.

Note: Different milestones can have different verifiers. One can be a technical auditor, another the investor, another a DAO multisig.

**Errors**

| Code | Name | Condition |
|---|---|---|
| 6007 | `Unauthorized` | Signer is not `milestones[milestone_index].verifier` |
| 6014 | `StreamExpired` | `stream_data.is_cancelled == true` |
| 6015 | `InvalidMilestoneIndex` | `milestone_index >= milestones.len()` |
| 6016 | `MilestoneAlreadyVerified` | `milestones[milestone_index].is_verified == true` |

---

### `mint_mock_tokens` (devnet/testnet only)

Mints mock SPL tokens to the caller for testing without requiring a real token. Not for production use.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `amount` | `u64` | Number of tokens to mint. |

**Errors**

| Code | Name | Condition |
|---|---|---|
| 6019 | `MockTokenMintTooLarge` | Amount exceeds the faucet limit |

---

## Error Code Reference

| Code | Name | Message |
|---|---|---|
| 6000 | `InvalidAmount` | amount must be greater than zero |
| 6001 | `InvalidTimeRange` | end_time must be after start_time |
| 6002 | `InvalidCliffTime` | cliff_time must be within [start_time, end_time] |
| 6003 | `InsufficientFunds` | creator token balance is insufficient |
| 6004 | `SelfVesting` | creator and recipient cannot be the same wallet |
| 6005 | `MilestoneAmountMismatch` | milestone amounts must sum to amount_total |
| 6006 | `TooManyMilestones` | maximum of 20 milestones allowed per stream |
| 6007 | `Unauthorized` | signer is not authorized for this instruction |
| 6008 | `StreamNotStarted` | stream has not started yet |
| 6009 | `NothingToWithdraw` | no tokens are available to withdraw at this time |
| 6010 | `StreamNotCancelable` | this stream does not allow cancellation |
| 6011 | `StreamAlreadyComplete` | stream is already fully claimed |
| 6012 | `AlreadyCancelled` | stream has already been cancelled |
| 6013 | `FullyVested` | stream is already fully vested and cannot be cancelled |
| 6014 | `StreamExpired` | stream has been cancelled |
| 6015 | `InvalidMilestoneIndex` | milestone index out of bounds |
| 6016 | `MilestoneAlreadyVerified` | this milestone has already been verified |
| 6017 | `ArithmeticOverflow` | arithmetic overflow in vesting calculation |
| 6018 | `InvalidStreamType` | invalid stream type — must be 0 (Linear), 1 (Cliff+Linear), or 2 (Milestone) |
| 6019 | `MockTokenMintTooLarge` | mock token mint amount is too large |

---

## `StreamData` Account Layout

| Field | Type | Description |
|---|---|---|
| `creator` | `Pubkey` | Wallet that created and funded the stream |
| `recipient` | `Pubkey` | Wallet that receives vested tokens |
| `mint` | `Pubkey` | SPL token mint being distributed |
| `escrow_token_account` | `Pubkey` | Address of the PDA-owned escrow token account |
| `stream_id` | `u64` | Caller-chosen ID used to derive this PDA |
| `amount_total` | `u64` | Total tokens locked at creation (raw units) |
| `amount_claimed` | `u64` | Running total of tokens already withdrawn |
| `start_time` | `i64` | Unix timestamp when vesting begins |
| `cliff_time` | `i64` | Unix timestamp of first unlock |
| `end_time` | `i64` | Unix timestamp when fully vested |
| `stream_type` | `u8` | `0` = Linear, `1` = Cliff+Linear, `2` = Milestone |
| `is_cancelable` | `bool` | Whether the creator can cancel this stream |
| `is_cancelled` | `bool` | Set to `true` when cancel is called |
| `milestone_count` | `u8` | Number of milestone entries (0 for time-based streams) |
| `milestones` | `Vec<Milestone>` | Up to 20 milestone entries (Milestone streams only) |
| `bump` | `u8` | Canonical PDA bump, stored to avoid recomputing |

**`Milestone` struct**

| Field | Type | Description |
|---|---|---|
| `amount` | `u64` | Tokens unlocked when verified |
| `description_hash` | `[u8; 32]` | SHA-256 of the off-chain description string |
| `is_verified` | `bool` | Flipped to `true` by `verify_milestone` |
| `verifier` | `Pubkey` | Only this wallet may call `verify_milestone` for this entry |
