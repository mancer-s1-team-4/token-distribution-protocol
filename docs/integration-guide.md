# Integration Guide — Token Distribution Protocol

**Program ID:** `J4zBUJeaXA26nV6i9Jz45t4hfwNrsxZ96g5ozhwALfX3`

This guide covers integrating the Vesta token distribution protocol from a TypeScript client using `@coral-xyz/anchor`.

---

## Setup

```ts
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import type { TokenDistributionProtocol } from "./target/types/token_distribution_protocol";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace
  .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
```

---

## PDA Helpers

These two functions are used in every instruction call.

```ts
function streamDataPda(
  programId: PublicKey,
  creator: PublicKey,
  recipient: PublicKey,
  streamId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("stream"),
      creator.toBuffer(),
      recipient.toBuffer(),
      streamId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

function escrowPda(
  programId: PublicKey,
  streamData: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), streamData.toBuffer()],
    programId
  );
}
```

---

## Creating a Linear Stream

```ts
const streamId = new BN(1);
const now = Math.floor(Date.now() / 1000);
const DAY = 86_400;

const [streamData] = streamDataPda(
  program.programId,
  creator.publicKey,
  recipient.publicKey,
  streamId
);
const [escrowTokenAccount] = escrowPda(program.programId, streamData);

await program.methods
  .createStream(
    streamId,
    new BN(1_000_000),   // amount: 1 token (6 decimals)
    new BN(now),          // start_time: now
    new BN(now),          // cliff_time: same as start = no cliff
    new BN(now + 365 * DAY), // end_time: 1 year
    0,                    // stream_type: Linear
    true                  // is_cancelable
  )
  .accountsPartial({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    escrowTokenAccount,
    creatorTokenAccount,
    mint,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Creating a Cliff + Linear Stream

Set `cliff_time` to a future timestamp and `stream_type` to `1`. Nothing vests before `cliff_time`; linear vesting runs from `start_time` to `end_time`.

```ts
await program.methods
  .createStream(
    new BN(2),
    new BN(1_000_000),
    new BN(now),                  // start_time
    new BN(now + 90 * DAY),       // cliff_time: 3-month cliff
    new BN(now + 365 * DAY),      // end_time: 1 year total
    1,                            // stream_type: Cliff+Linear
    true
  )
  .accountsPartial({ /* same as above */ })
  .rpc();
```

## Creating a Milestone Stream

For Milestone streams, call `create_stream` first, then call `add_milestone` once per milestone. The `cliff_time` and `end_time` parameters are stored but not used for vesting math.

```ts
// Step 1: create the stream
const streamId = new BN(3);
const [streamData] = streamDataPda(
  program.programId,
  creator.publicKey,
  recipient.publicKey,
  streamId
);
const [escrowTokenAccount] = escrowPda(program.programId, streamData);

await program.methods
  .createStream(
    streamId,
    new BN(3_000_000), // total locked: 3 tokens
    new BN(now),
    new BN(now),
    new BN(now + 365 * DAY),
    2,     // stream_type: Milestone
    true
  )
  .accountsPartial({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    escrowTokenAccount,
    creatorTokenAccount,
    mint,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Step 2: add milestones
import { createHash } from "crypto";

function descriptionHash(text: string): number[] {
  return Array.from(createHash("sha256").update(text).digest());
}

const verifier = new PublicKey("..."); // investor or oracle pubkey

await program.methods
  .addMilestone(
    new BN(1_000_000),
    descriptionHash("MVP shipped and audited"),
    verifier
  )
  .accountsPartial({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

await program.methods
  .addMilestone(
    new BN(1_000_000),
    descriptionHash("10,000 monthly active users"),
    verifier
  )
  .accountsPartial({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

await program.methods
  .addMilestone(
    new BN(1_000_000),
    descriptionHash("Series A closed"),
    verifier
  )
  .accountsPartial({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

---

## Verifying a Milestone

Called by the designated verifier, not the creator or recipient.

```ts
await program.methods
  .verifyMilestone(0) // milestone_index: 0-based
  .accountsPartial({
    verifier: verifier.publicKey,
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    systemProgram: SystemProgram.programId,
  })
  .signers([verifierKeypair])
  .rpc();
```

---

## Withdrawing Vested Tokens

Called by the recipient. No parameters — the program reads the clock on-chain.

```ts
const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  recipientKeypair,
  mint,
  recipient.publicKey
);

await program.methods
  .withdraw()
  .accountsPartial({
    recipient: recipient.publicKey,
    creator: creator.publicKey,
    streamData,
    escrowTokenAccount,
    recipientTokenAccount: recipientTokenAccount.address,
    mint,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([recipientKeypair])
  .rpc();
```

---

## Cancelling a Stream

Called by the creator. Vested-but-unclaimed tokens go to the recipient; unvested tokens return to the creator.

```ts
await program.methods
  .cancel()
  .accountsPartial({
    creator: creator.publicKey,
    recipient: recipient.publicKey,
    streamData,
    escrowTokenAccount,
    recipientTokenAccount: recipientTokenAccount.address,
    creatorTokenAccount,
    mint,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

---

## Reading Stream State

```ts
const stream = await program.account.streamData.fetch(streamData);

console.log({
  creator: stream.creator.toBase58(),
  recipient: stream.recipient.toBase58(),
  mint: stream.mint.toBase58(),
  amountTotal: stream.amountTotal.toNumber(),
  amountClaimed: stream.amountClaimed.toNumber(),
  startTime: new Date(stream.startTime.toNumber() * 1000),
  cliffTime: new Date(stream.cliffTime.toNumber() * 1000),
  endTime: new Date(stream.endTime.toNumber() * 1000),
  streamType: stream.streamType,
  isCancelable: stream.isCancelable,
  isCancelled: stream.isCancelled,
  milestones: stream.milestones,
});
```

## Fetching All Streams for a Wallet

To find all streams where a wallet is creator or recipient, use `getProgramAccounts` with a memcmp filter on the appropriate field offset.

```ts
// Streams where wallet is creator (field offset: 8 bytes discriminator)
const creatorStreams = await program.account.streamData.all([
  {
    memcmp: {
      offset: 8,
      bytes: walletPublicKey.toBase58(),
    },
  },
]);

// Streams where wallet is recipient (field offset: 8 + 32 = 40 bytes)
const recipientStreams = await program.account.streamData.all([
  {
    memcmp: {
      offset: 40,
      bytes: walletPublicKey.toBase58(),
    },
  },
]);
```

---

## Error Handling

Anchor wraps program errors in the transaction logs. Match by error name:

```ts
try {
  await program.methods.withdraw().accountsPartial({ /* ... */ }).rpc();
} catch (err: unknown) {
  if (err instanceof anchor.AnchorError) {
    switch (err.error.errorCode.code) {
      case "NothingToWithdraw":
        // Nothing vested yet, or all claimed already
        break;
      case "StreamExpired":
        // Stream was cancelled — withdrawal not allowed
        break;
      case "Unauthorized":
        // Signer is not the stream recipient
        break;
    }
  }
}
```

Full error code list: see [instruction-reference.md](./instruction-reference.md#error-code-reference).

---

## Vesting Math (Client-Side)

For displaying claimable amounts in the UI without a transaction, replicate the on-chain formula:

```ts
function calculateVested(stream: StreamData, nowSec: number): bigint {
  if (stream.streamType === 2) {
    // Milestone
    return stream.milestones
      .filter((m) => m.isVerified)
      .reduce((acc, m) => acc + BigInt(m.amount.toString()), 0n);
  }

  const now = BigInt(nowSec);
  const cliff = BigInt(stream.cliffTime.toString());
  const start = BigInt(stream.startTime.toString());
  const end = BigInt(stream.endTime.toString());
  const total = BigInt(stream.amountTotal.toString());

  if (now < cliff) return 0n;
  if (now >= end) return total;

  const duration = end - start;
  if (duration === 0n) return total;

  const elapsed = now - start < 0n ? 0n : now - start;
  const vested = (total * elapsed) / duration;
  return vested < total ? vested : total;
}

function calculateClaimable(stream: StreamData, nowSec: number): bigint {
  const vested = calculateVested(stream, nowSec);
  const claimed = BigInt(stream.amountClaimed.toString());
  return vested > claimed ? vested - claimed : 0n;
}
```
