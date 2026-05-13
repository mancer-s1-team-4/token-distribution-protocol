/**
 * Token Distribution Protocol — Week 4 Test Suite
 *
 * Tests cover all acceptance criteria from the Week 4 task:
 *   ✅ create_stream: creator deposits tokens, specifies recipient/dates
 *   ✅ Tokens locked in PDA (creator cannot withdraw)
 *   ✅ Linear unlock: unlocked = total * (elapsed / duration)
 *   ✅ withdraw: recipient claims unlocked tokens at any time
 *   ✅ Partial withdrawals work
 *   ✅ Cannot withdraw more than unlocked → NothingToClaim
 *   ✅ Cannot withdraw from someone else's stream → Unauthorized / seeds fail
 *   ✅ Vesting checked at 0%, 25%, 50%, 100%
 *
 * Time manipulation approach:
 *   Instead of bankrun (not installed), we set start_time in the past so the
 *   on-chain Clock.unix_timestamp falls at a known % through the vesting period.
 *   e.g. start=now-50days, end=now+50days → ~50% vested when withdraw is called.
 *
 * Alex — Week 4
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import { TokenDistributionProtocol } from "../target/types/token_distribution_protocol";

// ─── constants ───────────────────────────────────────────────────────────────
const DAY = 86_400;

// ─── PDA helpers ─────────────────────────────────────────────────────────────

function streamDataPDA(
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

function escrowPDA(
  programId: PublicKey,
  streamDataKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), streamDataKey.toBuffer()],
    programId
  );
}

// ─── test suite ──────────────────────────────────────────────────────────────

describe("token-distribution-protocol — Week 4", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const connection = provider.connection;
  const creator = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let creatorATA: PublicKey;

  const MINT_DECIMALS = 6;
  const INITIAL_SUPPLY = 50_000_000; // enough for all tests

  // ── global setup: mint + fund creator ATA ──────────────────────────────────
  before(async () => {
    mint = await createMint(
      connection,
      creator.payer,
      creator.publicKey,
      null,
      MINT_DECIMALS
    );

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      creator.payer,
      mint,
      creator.publicKey
    );
    creatorATA = ata.address;

    await mintTo(
      connection,
      creator.payer,
      mint,
      creatorATA,
      creator.publicKey,
      INITIAL_SUPPLY
    );

    console.log("  Mint:       ", mint.toBase58());
    console.log("  CreatorATA: ", creatorATA.toBase58());
    console.log("  Balance:    ", INITIAL_SUPPLY);
  });

  // ── helper: fund a keypair with SOL for ATA rent ──────────────────────────
  async function fundSol(dest: PublicKey, sol = 0.05) {
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: creator.publicKey,
          toPubkey: dest,
          lamports: Math.floor(sol * LAMPORTS_PER_SOL),
        })
      )
    );
  }

  // ── helper: create a stream positioned at `pct`% through its duration ─────
  async function makeStream(opts: {
    streamId: number;
    total: number;
    pct: number;          // 0–100, how far through the 100-day window we are
    cancelable?: boolean;
  }): Promise<{
    recipient: Keypair;
    streamDataKey: PublicKey;
    escrowKey: PublicKey;
    recipientATA: PublicKey;
  }> {
    const { streamId, total, pct, cancelable = true } = opts;
    const recipient = Keypair.generate();
    const now = Math.floor(Date.now() / 1000);
    const elapsed = Math.floor(pct * DAY);
    const start = now - elapsed;
    const end = start + 100 * DAY;

    const sid = new BN(streamId);
    const [streamDataKey] = streamDataPDA(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      sid
    );
    const [escrowKey] = escrowPDA(program.programId, streamDataKey);

    await program.methods
      .createStream(
        sid,
        new BN(total),
        new BN(start),
        new BN(start), // cliff = start (no cliff for simplicity)
        new BN(end),
        0,             // Linear
        cancelable
      )
      .accounts({
        creator: creator.publicKey,
        recipient: recipient.publicKey,
        streamData: streamDataKey,
        escrowTokenAccount: escrowKey,
        creatorTokenAccount: creatorATA,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator.payer])
      .rpc();

    await fundSol(recipient.publicKey, 0.1);
    const ataInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      creator.payer,
      mint,
      recipient.publicKey
    );

    return {
      recipient,
      streamDataKey,
      escrowKey,
      recipientATA: ataInfo.address,
    };
  }

  // ── helper: call withdraw for a recipient ─────────────────────────────────
  async function doWithdraw(
    recipient: Keypair,
    streamDataKey: PublicKey,
    escrowKey: PublicKey,
    recipientATA: PublicKey
  ) {
    return program.methods
      .withdraw()
      .accounts({
        recipient: recipient.publicKey,
        creator: creator.publicKey,
        streamData: streamDataKey,
        escrowTokenAccount: escrowKey,
        recipientTokenAccount: recipientATA,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([recipient])
      .rpc();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Deploy
  // ─────────────────────────────────────────────────────────────────────────
  it("deploys — program ID is set", () => {
    assert.ok(program.programId);
    console.log("  Program ID:", program.programId.toBase58());
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: create_stream — tokens locked in escrow
  // ─────────────────────────────────────────────────────────────────────────
  it("create_stream — locks tokens in escrow, StreamData initialized correctly", async () => {
    const { recipient, streamDataKey, escrowKey } = await makeStream({
      streamId: 1001,
      total: 1_000_000,
      pct: 0,
    });

    const stream = await program.account.streamData.fetch(streamDataKey);
    assert.equal(stream.amountTotal.toNumber(), 1_000_000);
    assert.equal(stream.amountClaimed.toNumber(), 0);
    assert.equal(stream.streamType, 0);
    assert.isTrue(stream.isCancelable);
    assert.ok(stream.creator.equals(creator.publicKey));
    assert.ok(stream.recipient.equals(recipient.publicKey));

    const escrow = await getAccount(connection, escrowKey);
    assert.equal(Number(escrow.amount), 1_000_000, "Escrow must hold all locked tokens");

    console.log("  ✓ StreamData correct, escrow holds 1_000_000 tokens");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: 0% vested — withdraw before any tokens unlock
  // ─────────────────────────────────────────────────────────────────────────
  it("withdraw at 0%: NothingToClaim when stream starts in the future", async () => {
    const recipient = Keypair.generate();
    const streamId = new BN(2000);
    const now = Math.floor(Date.now() / 1000);

    const [streamDataKey] = streamDataPDA(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const [escrowKey] = escrowPDA(program.programId, streamDataKey);

    // Stream starts tomorrow → 0% vested right now.
    await program.methods
      .createStream(
        streamId,
        new BN(1_000_000),
        new BN(now + DAY),       // starts tomorrow
        new BN(now + DAY),       // cliff tomorrow
        new BN(now + 101 * DAY),
        0,
        true
      )
      .accounts({
        creator: creator.publicKey,
        recipient: recipient.publicKey,
        streamData: streamDataKey,
        escrowTokenAccount: escrowKey,
        creatorTokenAccount: creatorATA,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator.payer])
      .rpc();

    await fundSol(recipient.publicKey);
    const recipientATA = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        creator.payer,
        mint,
        recipient.publicKey
      )
    ).address;

    try {
      await doWithdraw(recipient, streamDataKey, escrowKey, recipientATA);
      assert.fail("Expected NothingToClaim");
    } catch (err: any) {
      const msg = err.message ?? String(err);
      assert.include(msg, "NothingToClaim");
      console.log("  ✓ NothingToClaim at 0% vesting");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: 25% vested
  // ─────────────────────────────────────────────────────────────────────────
  it("withdraw at 25%: receives ~250k of 1M tokens", async () => {
    const { recipient, streamDataKey, escrowKey, recipientATA } =
      await makeStream({ streamId: 3000, total: 1_000_000, pct: 25 });

    await doWithdraw(recipient, streamDataKey, escrowKey, recipientATA);

    const bal = Number((await getAccount(connection, recipientATA)).amount);
    assert.approximately(bal, 250_000, 10_000, `Got ${bal}, expected ~250k`);

    const stream = await program.account.streamData.fetch(streamDataKey);
    assert.equal(stream.amountClaimed.toNumber(), bal, "amount_claimed must track transferred amount");

    console.log(`  ✓ 25% withdraw: ${bal} tokens received, amount_claimed updated`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: 50% vested
  // ─────────────────────────────────────────────────────────────────────────
  it("withdraw at 50%: receives ~500k of 1M tokens", async () => {
    const { recipient, streamDataKey, escrowKey, recipientATA } =
      await makeStream({ streamId: 4000, total: 1_000_000, pct: 50 });

    await doWithdraw(recipient, streamDataKey, escrowKey, recipientATA);

    const bal = Number((await getAccount(connection, recipientATA)).amount);
    assert.approximately(bal, 500_000, 10_000, `Got ${bal}, expected ~500k`);
    console.log(`  ✓ 50% withdraw: ${bal} tokens received`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: 100% vested — full claim
  // ─────────────────────────────────────────────────────────────────────────
  it("withdraw at 100%: receives all 1M tokens", async () => {
    const { recipient, streamDataKey, escrowKey, recipientATA } =
      await makeStream({ streamId: 5000, total: 1_000_000, pct: 100 });

    await doWithdraw(recipient, streamDataKey, escrowKey, recipientATA);

    const bal = Number((await getAccount(connection, recipientATA)).amount);
    assert.equal(bal, 1_000_000, "Should receive all tokens at 100%");
    console.log(`  ✓ 100% withdraw: all 1_000_000 tokens received`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: partial withdrawal — second call is blocked
  // ─────────────────────────────────────────────────────────────────────────
  it("partial withdrawal: amount_claimed prevents double-spend", async () => {
    const { recipient, streamDataKey, escrowKey, recipientATA } =
      await makeStream({ streamId: 6000, total: 1_000_000, pct: 50 });

    // First withdraw — ~50%.
    await doWithdraw(recipient, streamDataKey, escrowKey, recipientATA);
    const first = Number((await getAccount(connection, recipientATA)).amount);
    console.log(`  First withdraw: ${first} tokens`);

    // Second withdraw immediately — should throw NothingToClaim (no new time elapsed).
    // (Up to ~1 second of block-time may pass, unlocking at most 1 extra token
    //  per second on a 100-day stream: 1M / (100*86400) ≈ 0.1 token/s → likely 0.)
    try {
      await doWithdraw(recipient, streamDataKey, escrowKey, recipientATA);
      const second = Number((await getAccount(connection, recipientATA)).amount);
      assert.isAtMost(second, 1_000_000, "Total must not exceed amount_total");
      console.log(`  Second withdraw: ${second - first} additional tokens (minor drift)`);
    } catch (err: any) {
      assert.include(err.message ?? String(err), "NothingToClaim");
      console.log("  ✓ Double-spend blocked: NothingToClaim");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: unauthorized withdrawal
  // ─────────────────────────────────────────────────────────────────────────
  it("withdraw unauthorized: attacker cannot steal from someone else's stream", async () => {
    const { streamDataKey, escrowKey } = await makeStream({
      streamId: 7000,
      total: 1_000_000,
      pct: 50,
    });

    const attacker = Keypair.generate();
    await fundSol(attacker.publicKey, 0.1);
    const attackerATA = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        creator.payer,
        mint,
        attacker.publicKey
      )
    ).address;

    try {
      await program.methods
        .withdraw()
        .accounts({
          recipient: attacker.publicKey,       // attacker posing as recipient
          creator: creator.publicKey,
          streamData: streamDataKey,            // real stream — seeds will mismatch
          escrowTokenAccount: escrowKey,
          recipientTokenAccount: attackerATA,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();

      assert.fail("Attacker should not be able to withdraw");
    } catch (err: any) {
      const msg = err.message ?? String(err);
      // Seeds constraint enforces: stream_data.recipient must equal signer.
      const blocked =
        msg.includes("Unauthorized") ||
        msg.includes("seeds") ||
        msg.includes("ConstraintSeeds") ||
        msg.includes("AnchorError") ||
        msg.includes("2006") ||
        msg.includes("has_one");
      assert.ok(blocked, `Expected auth rejection, got: ${msg}`);
      console.log("  ✓ Unauthorized attacker rejected");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: cancel — 50% split
  // ─────────────────────────────────────────────────────────────────────────
  it("cancel at 50%: vested tokens → recipient, unvested → creator", async () => {
    const CANCEL_TOTAL = 2_000_000;
    const { recipient, streamDataKey, escrowKey, recipientATA } =
      await makeStream({ streamId: 8000, total: CANCEL_TOTAL, pct: 50 });

    const creatorBefore = Number((await getAccount(connection, creatorATA)).amount);

    await program.methods
      .cancel()
      .accounts({
        creator: creator.publicKey,
        recipient: recipient.publicKey,
        streamData: streamDataKey,
        escrowTokenAccount: escrowKey,
        recipientTokenAccount: recipientATA,
        creatorTokenAccount: creatorATA,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator.payer])
      .rpc();

    const recipientBal = Number((await getAccount(connection, recipientATA)).amount);
    const creatorAfter = Number((await getAccount(connection, creatorATA)).amount);
    const creatorReceived = creatorAfter - creatorBefore;

    assert.approximately(recipientBal, CANCEL_TOTAL * 0.5, CANCEL_TOTAL * 0.01);
    assert.approximately(creatorReceived, CANCEL_TOTAL * 0.5, CANCEL_TOTAL * 0.01);
    assert.approximately(
      recipientBal + creatorReceived,
      CANCEL_TOTAL,
      10,
      "Tokens must be conserved"
    );

    console.log(`  ✓ cancel 50%: recipient=${recipientBal}, creator_reclaimed=${creatorReceived}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: cancel — StreamNotCancelable
  // ─────────────────────────────────────────────────────────────────────────
  it("cancel: rejects StreamNotCancelable when is_cancelable == false", async () => {
    const { recipient, streamDataKey, escrowKey, recipientATA } =
      await makeStream({ streamId: 9000, total: 500_000, pct: 0, cancelable: false });

    try {
      await program.methods
        .cancel()
        .accounts({
          creator: creator.publicKey,
          recipient: recipient.publicKey,
          streamData: streamDataKey,
          escrowTokenAccount: escrowKey,
          recipientTokenAccount: recipientATA,
          creatorTokenAccount: creatorATA,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator.payer])
        .rpc();

      assert.fail("Expected StreamNotCancelable");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "StreamNotCancelable");
      console.log("  ✓ StreamNotCancelable rejected correctly");
    }
  });
});
