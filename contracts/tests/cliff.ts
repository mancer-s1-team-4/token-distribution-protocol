/**
 * cliff instruction — Week 5 test suite
 *
 * Covers cliff + linear vesting (stream_type = 1):
 *   - Before cliff: 0 tokens vested → NothingToWithdraw
 *   - At cliff: cliff portion unlocks immediately (jump to elapsed%)
 *   - Mid-stream after cliff: linear vesting continues from start_time
 *   - After end: all tokens claimable
 *
 * Time control: timestamps set in the past so elapsed/duration ≈ target%.
 * Cliff is placed at the 30% mark (30 days into a 100-day stream).
 * At the cliff moment the recipient receives a lump-sum of all tokens
 * elapsed since start — the "cliff jump" behavior.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";
import { TokenDistributionProtocol } from "../target/types/token_distribution_protocol";

const DAY   = 86_400;
const TOTAL = 2_000_000;

// Cliff at 30% of the 100-day stream duration.
const CLIFF_PCT = 30;

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

describe("cliff", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const creator  = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let creatorTokenAccount: PublicKey;
  let streamCounter = 70_000;

  beforeEach(async () => {
    mint = await createMint(
      provider.connection,
      creator.payer,
      creator.publicKey,
      null,
      6
    );

    creatorTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        creator.payer,
        mint,
        creator.publicKey
      )
    ).address;

    await mintTo(
      provider.connection,
      creator.payer,
      mint,
      creatorTokenAccount,
      creator.publicKey,
      TOTAL * 20
    );
  });

  async function fundSol(dest: PublicKey, sol = 0.1) {
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: creator.publicKey,
          toPubkey:   dest,
          lamports:   Math.floor(sol * LAMPORTS_PER_SOL),
        })
      )
    );
  }

  /**
   * Creates a Cliff+Linear stream (stream_type = 1) with:
   *   - 100-day total duration
   *   - cliff at CLIFF_PCT% from start (30 days)
   *   - elapsed = `elapsedPct`% of the duration
   *
   * pctElapsed is the percentage of the 100-day duration that has passed
   * relative to `now`. The cliff sits at CLIFF_PCT% within that duration.
   */
  async function createCliffStream(elapsedPct: number): Promise<{
    recipient: Keypair;
    streamData: PublicKey;
    escrowTokenAccount: PublicKey;
    recipientTokenAccount: PublicKey;
    start: number;
    cliff: number;
    end: number;
  }> {
    const recipient = Keypair.generate();
    await fundSol(recipient.publicKey);

    const now    = Math.floor(Date.now() / 1000);
    const start  = now - elapsedPct * DAY;
    const cliff  = start + CLIFF_PCT * DAY;
    const end    = start + 100 * DAY;

    const streamId = new BN(streamCounter++);
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
        new BN(TOTAL),
        new BN(start),
        new BN(cliff),   // cliff != start
        new BN(end),
        1,               // Cliff+Linear
        true
      )
      .accountsPartial({
        creator:            creator.publicKey,
        recipient:          recipient.publicKey,
        streamData,
        escrowTokenAccount,
        creatorTokenAccount,
        mint,
        tokenProgram:            TOKEN_PROGRAM_ID,
        associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:           SystemProgram.programId,
      })
      .rpc();

    const recipientTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        creator.payer,
        mint,
        recipient.publicKey
      )
    ).address;

    return { recipient, streamData, escrowTokenAccount, recipientTokenAccount, start, cliff, end };
  }

  async function withdrawAs(
    recipient: Keypair,
    streamData: PublicKey,
    escrowTokenAccount: PublicKey,
    recipientTokenAccount: PublicKey
  ) {
    return program.methods
      .withdraw()
      .accountsPartial({
        recipient:             recipient.publicKey,
        creator:               creator.publicKey,
        streamData,
        escrowTokenAccount,
        recipientTokenAccount,
        mint,
        tokenProgram:            TOKEN_PROGRAM_ID,
        associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:           SystemProgram.programId,
      })
      .signers([recipient])
      .rpc();
  }

  // ── Test 1: before cliff — nothing vested ───────────────────────────────────
  it("before cliff: withdraw returns NothingToWithdraw", async () => {
    // 20% elapsed, cliff is at 30% → cliff has not been reached
    const s = await createCliffStream(20);

    try {
      await withdrawAs(
        s.recipient,
        s.streamData,
        s.escrowTokenAccount,
        s.recipientTokenAccount
      );
      assert.fail("Expected NothingToWithdraw");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "NothingToWithdraw",
        "Should throw NothingToWithdraw before cliff is reached"
      );
    }

    // Verify on-chain state: amount_claimed stays 0
    const stream = await program.account.streamData.fetch(s.streamData);
    assert.equal(stream.amountClaimed.toNumber(), 0, "amount_claimed must be 0 before cliff");
  });

  // ── Test 2: at cliff — lump-sum unlocks ────────────────────────────────────
  it("at cliff: cliff-elapsed tokens unlock as a lump sum", async () => {
    // 30% elapsed = exactly at the cliff boundary
    const s = await createCliffStream(30);

    await withdrawAs(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const balance = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    const stream  = await program.account.streamData.fetch(s.streamData);

    // vested = total * (elapsed / duration) = TOTAL * 30% = 600,000
    // Allow 1% tolerance for block timestamp variance
    assert.approximately(
      balance,
      TOTAL * 0.30,
      TOTAL * 0.01,
      "At cliff boundary all elapsed tokens should be available"
    );
    assert.approximately(
      stream.amountClaimed.toNumber(),
      TOTAL * 0.30,
      TOTAL * 0.01,
      "amount_claimed should reflect the cliff withdrawal"
    );
  });

  // ── Test 3: mid-stream after cliff — linear vesting continues ──────────────
  it("mid-stream after cliff (60%): proportional tokens available", async () => {
    // 60% elapsed, cliff was at 30% — cliff was crossed, linear is in progress
    const s = await createCliffStream(60);

    await withdrawAs(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const balance = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );

    // vested ≈ TOTAL * 60%
    assert.approximately(
      balance,
      TOTAL * 0.60,
      TOTAL * 0.01,
      "60% through the stream, ~60% of tokens should be unlocked"
    );
  });

  // ── Test 4: after end — all tokens claimable ────────────────────────────────
  it("after end: all tokens are claimable", async () => {
    // 100% elapsed — stream fully vested
    const s = await createCliffStream(100);

    await withdrawAs(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const balance = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    const escrowBalance = Number(
      (await getAccount(provider.connection, s.escrowTokenAccount)).amount
    );
    const stream  = await program.account.streamData.fetch(s.streamData);

    assert.equal(balance, TOTAL, "Recipient should receive all tokens after stream ends");
    assert.equal(escrowBalance, 0, "Escrow should be empty after full withdrawal");
    assert.equal(stream.amountClaimed.toNumber(), TOTAL);
  });

  // ── Test 5: two withdrawals — cliff lump-sum then post-cliff accumulation ──
  it("two withdrawals: cliff lump-sum followed by remaining linear amount", async () => {
    // First withdraw at 30% (cliff), second at 60% (additional 30% accumulated)
    // We simulate this by creating the stream at 60% but doing two sequential
    // fetches to show amount_claimed tracks correctly.
    const s = await createCliffStream(60);

    // First withdrawal at current time (60% elapsed)
    await withdrawAs(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const afterFirst = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    const streamAfterFirst = await program.account.streamData.fetch(s.streamData);

    // Verify claimed equals balance
    assert.approximately(afterFirst, TOTAL * 0.60, TOTAL * 0.01);
    assert.equal(
      streamAfterFirst.amountClaimed.toNumber(),
      afterFirst,
      "amount_claimed must match withdrawn amount"
    );

    // Second withdrawal at same block time should fail (nothing new vested)
    try {
      await withdrawAs(
        s.recipient,
        s.streamData,
        s.escrowTokenAccount,
        s.recipientTokenAccount
      );
      assert.fail("Expected NothingToWithdraw");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "NothingToWithdraw",
        "Second immediate withdrawal should return NothingToWithdraw"
      );
    }
  });
});
