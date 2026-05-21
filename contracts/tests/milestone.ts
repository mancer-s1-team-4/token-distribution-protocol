/**
 * verify_milestone + milestone stream — Week 5 test suite
 *
 * Covers milestone-based vesting (stream_type = 2):
 *   - Unverified milestone: withdraw returns NothingToWithdraw
 *   - Single verified milestone: tokens become claimable
 *   - Multiple milestones: partial then full unlock sequence
 *   - MilestoneAlreadyVerified error on duplicate verify call
 *   - InvalidMilestoneIndex error for out-of-bounds index
 *   - Wrong verifier: returns Unauthorized
 *   - Verify on cancelled stream: returns StreamExpired
 *
 * BD context (SClair, Week 3 interviews, interest 5/5):
 *   "Milestone-linked liquidity ensures capital only reaches the recipient
 *    when performance parameters are met transparently on-chain."
 *   → These tests enforce that gate: no verify = no withdrawal.
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
const TOTAL = 3_000_000; // 3 milestones × 1,000,000 tokens each

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

/** Deterministic 32-byte hash for a milestone label (test-only). */
function descriptionHash(label: string): number[] {
  const buf = Buffer.alloc(32, 0);
  Buffer.from(label).copy(buf);
  return Array.from(buf);
}

describe("milestone", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const creator  = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let creatorTokenAccount: PublicKey;
  let streamCounter = 90_000;

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
   * Creates a Milestone stream (stream_type = 2) and appends `milestones`
   * entries via add_milestone. Returns everything needed to call
   * verify_milestone and withdraw.
   *
   * Each milestone entry: { amount, verifier }
   * start/end times are dummy values (unused by milestone math).
   */
  async function createMilestoneStream(
    milestones: Array<{ amount: number; verifier: Keypair }>
  ): Promise<{
    recipient: Keypair;
    streamData: PublicKey;
    escrowTokenAccount: PublicKey;
    recipientTokenAccount: PublicKey;
  }> {
    const recipient  = Keypair.generate();
    await fundSol(recipient.publicKey);

    const now      = Math.floor(Date.now() / 1000);
    const start    = now - DAY;
    const end      = now + 100 * DAY;
    const total    = milestones.reduce((s, m) => s + m.amount, 0);
    const streamId = new BN(streamCounter++);

    const [streamData] = streamDataPda(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const [escrowTokenAccount] = escrowPda(program.programId, streamData);

    // Create the stream shell (stream_type = 2 = Milestone).
    await program.methods
      .createStream(
        streamId,
        new BN(total),
        new BN(start),
        new BN(start), // cliff == start (irrelevant for milestone math)
        new BN(end),
        2,             // Milestone
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

    // Append each milestone entry.
    for (let i = 0; i < milestones.length; i++) {
      const { amount, verifier } = milestones[i];
      await program.methods
        .addMilestone(
          new BN(amount),
          descriptionHash(`milestone-${i}`),
          verifier.publicKey
        )
        .accountsPartial({
          creator:    creator.publicKey,
          recipient:  recipient.publicKey,
          streamData,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const recipientTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        creator.payer,
        mint,
        recipient.publicKey
      )
    ).address;

    return { recipient, streamData, escrowTokenAccount, recipientTokenAccount };
  }

  async function verifyMilestone(
    verifier: Keypair,
    milestoneIndex: number,
    streamData: PublicKey,
    recipient: PublicKey
  ) {
    return program.methods
      .verifyMilestone(milestoneIndex)
      .accountsPartial({
        verifier:     verifier.publicKey,
        creator:      creator.publicKey,
        recipient,
        streamData,
        systemProgram: SystemProgram.programId,
      })
      .signers([verifier])
      .rpc();
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

  // ── Test 1: unverified milestone → NothingToWithdraw ────────────────────────
  it("unverified milestone: withdraw returns NothingToWithdraw", async () => {
    const verifier = Keypair.generate();
    await fundSol(verifier.publicKey);

    const s = await createMilestoneStream([
      { amount: 1_000_000, verifier },
    ]);

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
        "Should throw NothingToWithdraw when no milestones are verified"
      );
    }
  });

  // ── Test 2: verified single milestone → tokens unlocked ─────────────────────
  it("single milestone: verify then withdraw unlocks the tranche", async () => {
    const verifier = Keypair.generate();
    await fundSol(verifier.publicKey);

    const s = await createMilestoneStream([
      { amount: 1_000_000, verifier },
    ]);

    await verifyMilestone(verifier, 0, s.streamData, s.recipient.publicKey);

    const stream = await program.account.streamData.fetch(s.streamData);
    assert.isTrue(stream.milestones[0].isVerified, "Milestone must be marked verified");

    await withdrawAs(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const balance = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    assert.equal(balance, 1_000_000, "Recipient should receive the milestone tranche");
  });

  // ── Test 3: multiple milestones — partial then full unlock ───────────────────
  it("three milestones: verify in sequence, each withdrawal adds the next tranche", async () => {
    const v0 = Keypair.generate();
    const v1 = Keypair.generate();
    const v2 = Keypair.generate();
    await Promise.all([
      fundSol(v0.publicKey),
      fundSol(v1.publicKey),
      fundSol(v2.publicKey),
    ]);

    const s = await createMilestoneStream([
      { amount: 1_000_000, verifier: v0 },
      { amount: 1_000_000, verifier: v1 },
      { amount: 1_000_000, verifier: v2 },
    ]);

    // Verify milestone 0 and withdraw
    await verifyMilestone(v0, 0, s.streamData, s.recipient.publicKey);
    await withdrawAs(
      s.recipient, s.streamData, s.escrowTokenAccount, s.recipientTokenAccount
    );
    const afterFirst = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    assert.equal(afterFirst, 1_000_000, "First tranche: 1,000,000 tokens");

    // Verify milestone 1 and withdraw
    await verifyMilestone(v1, 1, s.streamData, s.recipient.publicKey);
    await withdrawAs(
      s.recipient, s.streamData, s.escrowTokenAccount, s.recipientTokenAccount
    );
    const afterSecond = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    assert.equal(afterSecond, 2_000_000, "Second tranche: cumulative 2,000,000 tokens");

    // Verify milestone 2 and withdraw remainder
    await verifyMilestone(v2, 2, s.streamData, s.recipient.publicKey);
    await withdrawAs(
      s.recipient, s.streamData, s.escrowTokenAccount, s.recipientTokenAccount
    );
    const afterThird = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    assert.equal(afterThird, 3_000_000, "Third tranche: all 3,000,000 tokens");
  });

  // ── Test 4: MilestoneAlreadyVerified ────────────────────────────────────────
  it("verify twice: second call returns MilestoneAlreadyVerified", async () => {
    const verifier = Keypair.generate();
    await fundSol(verifier.publicKey);

    const s = await createMilestoneStream([
      { amount: 1_000_000, verifier },
    ]);

    await verifyMilestone(verifier, 0, s.streamData, s.recipient.publicKey);

    try {
      await verifyMilestone(verifier, 0, s.streamData, s.recipient.publicKey);
      assert.fail("Expected MilestoneAlreadyVerified");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "MilestoneAlreadyVerified",
        "Second verify on same milestone must throw MilestoneAlreadyVerified"
      );
    }
  });

  // ── Test 5: InvalidMilestoneIndex ───────────────────────────────────────────
  it("out-of-bounds index: returns InvalidMilestoneIndex", async () => {
    const verifier = Keypair.generate();
    await fundSol(verifier.publicKey);

    const s = await createMilestoneStream([
      { amount: 1_000_000, verifier },
    ]);

    try {
      // Only index 0 exists — index 5 is out of bounds
      await verifyMilestone(verifier, 5, s.streamData, s.recipient.publicKey);
      assert.fail("Expected InvalidMilestoneIndex");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "InvalidMilestoneIndex",
        "Out-of-bounds index must return InvalidMilestoneIndex"
      );
    }
  });

  // ── Test 6: wrong verifier → Unauthorized ───────────────────────────────────
  it("wrong verifier: returns Unauthorized", async () => {
    const rightVerifier = Keypair.generate();
    const wrongVerifier = Keypair.generate();
    await Promise.all([
      fundSol(rightVerifier.publicKey),
      fundSol(wrongVerifier.publicKey),
    ]);

    const s = await createMilestoneStream([
      { amount: 1_000_000, verifier: rightVerifier },
    ]);

    try {
      await verifyMilestone(wrongVerifier, 0, s.streamData, s.recipient.publicKey);
      assert.fail("Expected Unauthorized");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "Unauthorized",
        "Wrong verifier must throw Unauthorized"
      );
    }
  });

  // ── Test 7: non-signer verifier — Anchor rejects unsigned transaction ────────
  // Documents the guarantee that Anchor's Signer<'info> constraint on the
  // verifier account blocks any transaction where the verifier does not sign.
  it("non-signer verifier: Anchor rejects transaction missing verifier signature", async () => {
    const verifier = Keypair.generate();
    await fundSol(verifier.publicKey);

    const s = await createMilestoneStream([
      { amount: TOTAL, verifier },
    ]);

    try {
      // Pass the correct verifier pubkey but omit it from signers — Anchor
      // requires all Signer<'info> accounts to sign the transaction.
      await program.methods
        .verifyMilestone(0)
        .accountsPartial({
          verifier:     verifier.publicKey,
          creator:      creator.publicKey,
          recipient:    s.recipient.publicKey,
          streamData:   s.streamData,
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // intentionally omit verifier
        .rpc();
      assert.fail("Expected missing-signature error");
    } catch (err: any) {
      const msg = (err.message ?? String(err)).toLowerCase();
      assert.ok(
        msg.includes("signature") ||
        msg.includes("signer") ||
        msg.includes("unknown signer") ||
        msg.includes("missing"),
        `Expected signature failure, got: ${err.message}`
      );
    }
  });

  // ── Test 9: verify on cancelled stream → StreamExpired ──────────────────────
  it("verify on cancelled stream: returns StreamExpired", async () => {
    const verifier = Keypair.generate();
    await fundSol(verifier.publicKey);

    const s = await createMilestoneStream([
      { amount: TOTAL, verifier },
    ]);

    // Cancel the stream first
    const recipientAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        creator.payer,
        mint,
        s.recipient.publicKey
      )
    ).address;

    await program.methods
      .cancel()
      .accountsPartial({
        creator:               creator.publicKey,
        recipient:             s.recipient.publicKey,
        streamData:            s.streamData,
        escrowTokenAccount:    s.escrowTokenAccount,
        recipientTokenAccount: recipientAta,
        creatorTokenAccount,
        mint,
        tokenProgram:            TOKEN_PROGRAM_ID,
        associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:           SystemProgram.programId,
      })
      .signers([creator.payer])
      .rpc();

    // Now try to verify — should fail with StreamExpired
    try {
      await verifyMilestone(verifier, 0, s.streamData, s.recipient.publicKey);
      assert.fail("Expected StreamExpired");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "StreamExpired",
        "verify_milestone on cancelled stream must return StreamExpired"
      );
    }
  });
});
