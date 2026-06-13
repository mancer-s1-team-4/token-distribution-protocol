# Instruction Reference

Program ID: `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`

This document covers every instruction exposed by the Vestra token distribution program. For each instruction you'll find: required accounts, parameters, validation rules, error codes it can return, and a minimal TypeScript/Anchor SDK call.

---

## Table of Contents

1. [initialize](#initialize)
2. [create_stream](#create_stream)
3. [withdraw](#withdraw)
4. [cancel](#cancel)
5. [add_milestone](#add_milestone)
6. [verify_milestone](#verify_milestone)
7. [mint_mock_tokens](#mint_mock_tokens)
8. [Error Code Reference](#error-code-reference)

---

## initialize

A scaffold instruction kept from the project template. It takes no accounts, writes no state, and can be called by anyone. Its only effect is logging the program ID and emitting an `Initialized` event.

### Accounts

None.

### Parameters

None.

### Behavior

Logs the program ID via `msg!` and emits an `Initialized` event containing the program ID. No accounts are created or modified.

### Errors

None. This instruction has no validation and cannot fail under normal circumstances.

### Example

```typescript
await program.methods
  .initialize()
  .rpc();
```

---

## create_stream

Locks SPL tokens into a PDA-owned escrow and records the vesting schedule on-chain. This is the entry point for all three vesting types.

### Accounts

| Name | Type | Mut | Signer | Description |
|------|------|-----|--------|-------------|
| `creator` | Signer | yes | yes | Funds the stream and pays rent for all new accounts |
| `recipient` | UncheckedAccount | no | no | Wallet that will receive vested tokens |
| `stream_data` | PDA (init) | yes | no | Seeds: `["stream", creator, recipient, stream_id_le8]` |
| `escrow_token_account` | PDA (init) | yes | no | Seeds: `["escrow", stream_data]`; authority is `stream_data` |
| `creator_token_account` | ATA | yes | no | Source of tokens; must hold >= `amount` |
| `mint` | Mint | no | no | The SPL token being vested |
| `token_program` | Program | no | no | SPL Token program |
| `associated_token_program` | Program | no | no | ATA program |
| `system_program` | Program | no | no | Required for account creation |

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `stream_id` | `u64` | Caller-chosen identifier. Allows multiple parallel streams between the same two wallets. Used in PDA derivation — must be unique per (creator, recipient) pair. |
| `amount` | `u64` | Raw token units to lock. Must be greater than zero. |
| `start_time` | `i64` | Unix timestamp when vesting begins. For cliff+linear this is still the baseline for the vesting rate, even though tokens don't unlock until `cliff_time`. |
| `cliff_time` | `i64` | Unix timestamp of the first possible unlock. For linear streams with no cliff, set this equal to `start_time`. Must satisfy `start_time <= cliff_time <= end_time`. |
| `end_time` | `i64` | Unix timestamp when the stream is fully vested. Must be strictly greater than `start_time`. |
| `stream_type` | `u8` | `0` = Linear, `1` = Cliff+Linear, `2` = Milestone. |
| `is_cancelable` | `bool` | If `true`, the creator can call `cancel` at any time before full vesting. If `false`, the stream is a permanent payment guarantee. |

### Behavior

1. Validates all parameters (see error table below).
2. Initializes `StreamData` PDA and `EscrowTokenAccount` PDA.
3. Transfers `amount` tokens from `creator_token_account` to `escrow_token_account` via CPI to the SPL Token program.
4. Populates all `StreamData` fields. `amount_claimed` starts at `0`, `is_cancelled` starts at `false`.

### Validation and Errors

| Condition | Error Code | Error Name |
|-----------|-----------|------------|
| `amount == 0` | 6000 | `InvalidAmount` |
| `end_time <= start_time` | 6001 | `InvalidTimeRange` |
| `cliff_time < start_time` or `cliff_time > end_time` | 6002 | `InvalidCliffTime` |
| `creator_token_account.amount < amount` | 6003 | `InsufficientFunds` |
| `creator == recipient` | 6004 | `SelfVesting` |
| `stream_type > 2` | 6018 | `InvalidStreamType` |

### Example

```typescript
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const streamId = new anchor.BN(Date.now()); // unique ID
const now = Math.floor(Date.now() / 1000);

// Derive the StreamData PDA
const [streamDataPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("stream"),
    creator.publicKey.toBuffer(),
    recipient.publicKey.toBuffer(),
    streamId.toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

// Derive the escrow PDA
const [escrowPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), streamDataPda.toBuffer()],
  program.programId
);

const creatorAta = await getAssociatedTokenAddress(mint, creator.publicKey);

await program.methods
  .createStream(
    streamId,
    new anchor.BN(1_000_000), // amount: 1,000,000 tokens
    new anchor.BN(now),       // start_time: now
    new anchor.BN(now),       // cliff_time: same as start (no cliff)
    new anchor.BN(now + 365 * 24 * 3600), // end_time: 1 year
    0,                        // stream_type: Linear
    true                      // is_cancelable
  )
  .accounts({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData: streamDataPda,
    escrowTokenAccount: escrowPda,
    creatorTokenAccount: creatorAta,
    mint,
  })
  .signers([creator])
  .rpc();
```

---

## withdraw

Lets the recipient claim any tokens that have vested since their last withdrawal.

### Accounts

| Name | Type | Mut | Signer | Description |
|------|------|-----|--------|-------------|
| `recipient` | Signer | yes | yes | Must match `stream_data.recipient` |
| `creator` | UncheckedAccount | no | no | Needed only for PDA seed derivation |
| `stream_data` | PDA | yes | no | The stream's vesting record |
| `escrow_token_account` | PDA | yes | no | Source of vested tokens |
| `recipient_token_account` | ATA (init_if_needed) | yes | no | Destination for vested tokens; created if it doesn't exist |
| `mint` | Mint | no | no | Verified transitively via `stream_data.has_one` |
| `token_program` | Program | no | no | |
| `associated_token_program` | Program | no | no | |
| `system_program` | Program | no | no | |

### Parameters

None. The program reads the current on-chain clock to determine how much has vested.

### Behavior

1. Reads `Clock::unix_timestamp` from the Solana runtime.
2. Calls `stream_data.calculate_vested(now)` to get the total vested amount.
3. Computes `claimable = vested - stream_data.amount_claimed`. Rejects if zero.
4. Transfers `claimable` tokens from escrow to the recipient's ATA using PDA-signed CPI.
5. Increments `stream_data.amount_claimed` by `claimable`.

### Vesting math

**Linear / Cliff+Linear:**

```
if now < cliff_time:
    vested = 0
elif now >= end_time:
    vested = amount_total
else:
    vested = floor(amount_total * (now - start_time) / (end_time - start_time))
```

**Milestone:**

```
vested = sum(m.amount for m in milestones if m.is_verified)
```

### Validation and Errors

| Condition | Error Code | Error Name |
|-----------|-----------|------------|
| Signer is not `stream_data.recipient` | 6007 | `Unauthorized` |
| `stream_data.is_cancelled == true` | 6014 | `StreamExpired` |
| `claimable == 0` | 6009 | `NothingToWithdraw` |

### Example

```typescript
const recipientAta = await getAssociatedTokenAddress(mint, recipient.publicKey);

await program.methods
  .withdraw()
  .accounts({
    recipient: recipient.publicKey,
    creator: creator.publicKey,
    streamData: streamDataPda,
    escrowTokenAccount: escrowPda,
    recipientTokenAccount: recipientAta,
    mint,
  })
  .signers([recipient])
  .rpc();
```

---

## cancel

Lets the creator terminate a cancelable stream. Vested tokens (minus any already claimed) go to the recipient; unvested tokens return to the creator.

### Accounts

| Name | Type | Mut | Signer | Description |
|------|------|-----|--------|-------------|
| `creator` | Signer | yes | yes | Must match `stream_data.creator` |
| `recipient` | UncheckedAccount | yes | no | Receives vested-but-unclaimed tokens |
| `stream_data` | PDA | yes | no | The stream's vesting record |
| `escrow_token_account` | PDA | yes | no | Holding account to split |
| `recipient_token_account` | ATA (init_if_needed) | yes | no | Created if it doesn't exist yet |
| `creator_token_account` | ATA | yes | no | Receives unvested tokens |
| `mint` | Mint | no | no | |
| `token_program` | Program | no | no | |
| `associated_token_program` | Program | no | no | |
| `system_program` | Program | no | no | |

### Parameters

None.

### Behavior

1. Validates the stream is cancelable and not already cancelled (enforced by Anchor constraints).
2. Calls `calculate_vested(now)` at the current timestamp.
3. Computes `earned_unclaimed = vested - amount_claimed` and `unvested = amount_total - vested`.
4. If `earned_unclaimed > 0`, transfers it to the recipient's ATA.
5. If `unvested > 0`, transfers it back to the creator's ATA.
6. Sets `stream_data.is_cancelled = true`. The escrow account is left open so that subsequent calls to `cancel` or `withdraw` can still load the account and receive a clean program error.

### Validation and Errors

| Condition | Error Code | Error Name |
|-----------|-----------|------------|
| Signer is not `stream_data.creator` | 6007 | `Unauthorized` |
| `stream_data.is_cancelable == false` | 6010 | `StreamNotCancelable` |
| `stream_data.is_cancelled == true` | 6012 | `AlreadyCancelled` |
| `vested == amount_total` (fully vested) | 6013 | `FullyVested` |

### Example

```typescript
const creatorAta = await getAssociatedTokenAddress(mint, creator.publicKey);
const recipientAta = await getAssociatedTokenAddress(mint, recipient.publicKey);

await program.methods
  .cancel()
  .accounts({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData: streamDataPda,
    escrowTokenAccount: escrowPda,
    recipientTokenAccount: recipientAta,
    creatorTokenAccount: creatorAta,
    mint,
  })
  .signers([creator])
  .rpc();
```

---

## add_milestone

Appends a new milestone entry to a milestone-type stream. Only the stream creator can call this, and only before the recipient has claimed any tokens.

### Accounts

| Name | Type | Mut | Signer | Description |
|------|------|-----|--------|-------------|
| `creator` | Signer | yes | yes | Must match `stream_data.creator` |
| `recipient` | UncheckedAccount | no | no | Needed for PDA seed derivation |
| `stream_data` | PDA | yes | no | Must be type 2 (Milestone) and not cancelled |
| `system_program` | Program | no | no | Required by Anchor |

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `amount` | `u64` | Tokens unlocked when this milestone is verified. The cumulative sum of all milestone amounts must not exceed `stream_data.amount_total`. |
| `description_hash` | `[u8; 32]` | SHA-256 hash of the milestone description. The description itself is stored off-chain; the hash is what gets verified on-chain. |
| `verifier` | `Pubkey` | The only wallet authorized to call `verify_milestone` for this entry. Can be an oracle, multisig, or any Solana keypair. |

### Behavior

1. Validates the stream is milestone type, not cancelled, and that the recipient has not yet claimed tokens.
2. Pushes a new `Milestone` struct onto `stream_data.milestones`.
3. Validates the cumulative milestone amounts don't exceed `amount_total`.
4. Increments `milestone_count`.

### Validation and Errors

| Condition | Error Code | Error Name |
|-----------|-----------|------------|
| Signer is not `stream_data.creator` | 6007 | `Unauthorized` |
| `stream_data.stream_type != 2` | 6018 | `InvalidStreamType` |
| `stream_data.is_cancelled == true` | 6014 | `StreamExpired` |
| `stream_data.amount_claimed > 0` | 6011 | `StreamAlreadyComplete` |
| `milestones.len() >= 20` | 6006 | `TooManyMilestones` |
| Cumulative milestone amounts exceed `amount_total` | 6005 | `MilestoneAmountMismatch` |

### Example

```typescript
import * as anchor from "@coral-xyz/anchor";
import * as crypto from "crypto";

const description = "Deliver MVP by Q2";
const descriptionHash = Array.from(
  crypto.createHash("sha256").update(description).digest()
);

await program.methods
  .addMilestone(
    new anchor.BN(250_000),   // amount: unlock 250,000 tokens on completion
    descriptionHash,           // SHA-256 hash of description
    verifier.publicKey         // who can verify this milestone
  )
  .accounts({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData: streamDataPda,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .signers([creator])
  .rpc();
```

---

## verify_milestone

Marks a single milestone as complete. Once verified, that milestone's token amount becomes available for the recipient to withdraw.

### Accounts

| Name | Type | Mut | Signer | Description |
|------|------|-----|--------|-------------|
| `verifier` | Signer | yes | yes | Must match the `verifier` field stored on the target milestone |
| `creator` | UncheckedAccount | no | no | Needed for PDA seed derivation |
| `recipient` | UncheckedAccount | no | no | Needed for PDA seed derivation |
| `stream_data` | PDA | yes | no | The stream's vesting record |
| `system_program` | Program | no | no | Required by Anchor |

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `milestone_index` | `u8` | Zero-based index into `stream_data.milestones`. |

### Behavior

1. Validates the index is in-bounds and the milestone is not already verified.
2. Validates the signer matches `milestone.verifier`.
3. Sets `milestone.is_verified = true`. The next `withdraw` call will include this milestone's amount in the vested total.

### Validation and Errors

| Condition | Error Code | Error Name |
|-----------|-----------|------------|
| `milestone_index >= milestones.len()` | 6015 | `InvalidMilestoneIndex` |
| `milestone.is_verified == true` | 6016 | `MilestoneAlreadyVerified` |
| Signer does not match `milestone.verifier` | 6007 | `Unauthorized` |

### Example

```typescript
await program.methods
  .verifyMilestone(0) // verify the first milestone (index 0)
  .accounts({
    verifier: verifier.publicKey,
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData: streamDataPda,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .signers([verifier])
  .rpc();
```

---

## mint_mock_tokens

A devnet-only faucet that mints test tokens to the caller's wallet. Uses a program-controlled mint PDA so no separate token authority is needed during testing.

### Accounts

| Name | Type | Mut | Signer | Description |
|------|------|-----|--------|-------------|
| `minter` | Signer | yes | yes | Recipient of the minted tokens; pays rent |
| `mock_mint` | PDA (init_if_needed) | yes | no | Seeds: `["mock_mint"]`; program-controlled |
| `minter_token_account` | ATA (init_if_needed) | yes | no | Destination for minted tokens |
| `token_program` | Program | no | no | |
| `associated_token_program` | Program | no | no | |
| `system_program` | Program | no | no | |

### Parameters

| Name | Type | Description |
|------|------|-------------|
| `amount` | `u64` | Number of tokens to mint. Must be greater than zero. Maximum is `1,000,000`. |

### Validation and Errors

| Condition | Error Code | Error Name |
|-----------|-----------|------------|
| `amount == 0` | 6000 | `InvalidAmount` |
| `amount > 1_000_000` | 6019 | `MockTokenMintTooLarge` |

### Example

```typescript
const [mockMintPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("mock_mint")],
  program.programId
);

const minterAta = await getAssociatedTokenAddress(
  mockMintPda,
  wallet.publicKey
);

await program.methods
  .mintMockTokens(new anchor.BN(500_000))
  .accounts({
    minter: wallet.publicKey,
    mockMint: mockMintPda,
    minterTokenAccount: minterAta,
  })
  .rpc();
```

---

## Error Code Reference

All errors are defined in `contracts/programs/token-distribution-protocol/src/error.rs`. Anchor adds a base offset of 6000.

| Code | Name | Message | Raised By |
|------|------|---------|-----------|
| 6000 | `InvalidAmount` | amount must be greater than zero | `create_stream`, `mint_mock_tokens` |
| 6001 | `InvalidTimeRange` | end_time must be after start_time | `create_stream` |
| 6002 | `InvalidCliffTime` | cliff_time must be within [start_time, end_time] | `create_stream` |
| 6003 | `InsufficientFunds` | creator token balance is insufficient | `create_stream` |
| 6004 | `SelfVesting` | creator and recipient cannot be the same wallet | `create_stream` |
| 6005 | `MilestoneAmountMismatch` | milestone amounts must sum to amount_total | `add_milestone` |
| 6006 | `TooManyMilestones` | maximum of 20 milestones allowed per stream | `add_milestone` |
| 6007 | `Unauthorized` | signer is not authorized for this instruction | `withdraw`, `cancel`, `add_milestone`, `verify_milestone` |
| 6008 | `StreamNotStarted` | stream has not started yet | reserved |
| 6009 | `NothingToWithdraw` | no tokens are available to withdraw at this time | `withdraw` |
| 6010 | `StreamNotCancelable` | this stream does not allow cancellation | `cancel` |
| 6011 | `StreamAlreadyComplete` | stream is already fully claimed | `add_milestone` |
| 6012 | `AlreadyCancelled` | stream has already been cancelled | `cancel` |
| 6013 | `FullyVested` | stream is already fully vested and cannot be cancelled | `cancel` |
| 6014 | `StreamExpired` | stream has been cancelled | `withdraw`, `add_milestone` |
| 6015 | `InvalidMilestoneIndex` | milestone index out of bounds | `verify_milestone` |
| 6016 | `MilestoneAlreadyVerified` | this milestone has already been verified | `verify_milestone` |
| 6017 | `ArithmeticOverflow` | arithmetic overflow in vesting calculation | `withdraw` |
| 6018 | `InvalidStreamType` | invalid stream type -- must be 0 (Linear), 1 (Cliff+Linear), or 2 (Milestone) | `create_stream`, `add_milestone` |
| 6019 | `MockTokenMintTooLarge` | mock token mint amount is too large | `mint_mock_tokens` |

### Catching errors in TypeScript

```typescript
import { AnchorError } from "@coral-xyz/anchor";

try {
  await program.methods.withdraw().accounts({ ... }).rpc();
} catch (err) {
  if (err instanceof AnchorError) {
    console.log(err.error.errorCode.number); // e.g. 6009
    console.log(err.error.errorCode.code);   // e.g. "NothingToWithdraw"
    console.log(err.error.errorMessage);     // e.g. "no tokens are available..."
  }
}
```
