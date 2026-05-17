/**
 * cancel instruction — Week 5 test suite
 *
 * Covers:
 *   - cancel before cliff (0% vested → all tokens return to creator)
 *   - cancel mid-stream (50% split between creator and recipient)
 *   - cancel after full vest → FullyVested error
 *   - cancel already-cancelled stream → AlreadyCancelled error
 *   - cancel non-cancelable stream → StreamNotCancelable error
 *   - withdraw after cancel → StreamExpired error
 *   - only creator can cancel → Unauthorized error
 *
 * Time control: start_time set in the past so elapsed/duration ≈ target %.
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

describe("cancel", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const creator  = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let creatorTokenAccount: PublicKey;
  let streamCounter = 50_000;

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
   * Creates a stream positioned at `pct`% through its 100-day duration.
   * pct=0 → hasn't started yet (start tomorrow)
   * pct=100 → fully vested (end was yesterday)
   */
  async function createStream(opts: {
    pct: number;
    cancelable?: boolean;
    withClaim?: boolean;
  }) {
    const { pct, cancelable = true } = opts;
    const recipient = Keypair.generate();
    await fundSol(recipient.publicKey);

    const now      = Math.floor(Date.now() / 1000);
    let   start: number;
    let   end: number;

    if (pct === 0) {
      // Stream starts tomorrow — nothing vested
      start = now + DAY;
      end   = now + 101 * DAY;
    } else {
      const elapsed = Math.floor((pct / 100) * 100 * DAY);
      start = now - elapsed;
      end   = start + 100 * DAY;
    }

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
        new BN(start), // cliff = start (no cliff for cancel tests)
        new BN(end),
        0,             // Linear
        cancelable
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

    return { recipient, streamData, escrowTokenAccount, recipientTokenAccount };
  }

  async function cancelStream(
    recipient: Keypair | PublicKey,
    streamData: PublicKey,
    escrowTokenAccount: PublicKey,
    recipientTokenAccount: PublicKey,
    signers?: Keypair[]
  ) {
    const recipientKey =
      recipient instanceof Keypair ? recipient.publicKey : recipient;

    return program.methods
      .cancel()
      .accountsPartial({
        creator:              creator.publicKey,
        recipient:            recipientKey,
        streamData,
        escrowTokenAccount,
        recipientTokenAccount,
        creatorTokenAccount,
        mint,
        tokenProgram:            TOKEN_PROGRAM_ID,
        associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:           SystemProgram.programId,
      })
      .signers(signers ?? [creator.payer])
      .rpc();
  }

  // ── Test 1: cancel before cliff (0% vested) ─────────────────────────────────
  it("cancel before vesting starts: all tokens return to creator", async () => {
    const s = await createStream({ pct: 0 });
    const beforeBalance = Number(
      (await getAccount(provider.connection, creatorTokenAccount)).amount
    );

    await cancelStream(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const afterBalance = Number(
      (await getAccount(provider.connection, creatorTokenAccount)).amount
    );
    const recipientBalance = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    const stream = await program.account.streamData.fetch(s.streamData);

    // All TOTAL tokens returned to creator (escrow rent also returned but ignore it)
    assert.approximately(afterBalance - beforeBalance, TOTAL, 1_000);
    assert.equal(recipientBalance, 0, "Recipient should receive nothing before vesting");
    assert.isTrue(stream.isCancelled, "is_cancelled must be set to true");
  });

  // ── Test 2: cancel mid-stream (50% vested) ──────────────────────────────────
  it("cancel at 50%: vested tokens go to recipient, unvested to creator", async () => {
    const s = await createStream({ pct: 50 });
    const creatorBefore = Number(
      (await getAccount(provider.connection, creatorTokenAccount)).amount
    );

    await cancelStream(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    const creatorAfter    = Number(
      (await getAccount(provider.connection, creatorTokenAccount)).amount
    );
    const recipientAfter  = Number(
      (await getAccount(provider.connection, s.recipientTokenAccount)).amount
    );
    const stream = await program.account.streamData.fetch(s.streamData);

    // ~50% of TOTAL to each party
    assert.approximately(recipientAfter, TOTAL * 0.5, TOTAL * 0.01);
    assert.approximately(creatorAfter - creatorBefore, TOTAL * 0.5, TOTAL * 0.01);
    // Tokens must be conserved
    assert.approximately(
      recipientAfter + (creatorAfter - creatorBefore),
      TOTAL,
      10
    );
    assert.isTrue(stream.isCancelled);
  });

  // ── Test 3: cancel after full vest → FullyVested error ──────────────────────
  it("cancel after full vest: returns FullyVested error", async () => {
    const s = await createStream({ pct: 100 });

    try {
      await cancelStream(
        s.recipient,
        s.streamData,
        s.escrowTokenAccount,
        s.recipientTokenAccount
      );
      assert.fail("Expected FullyVested error");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "FullyVested",
        "Should throw FullyVested when stream is 100% vested"
      );
    }
  });

  // ── Test 4: cancel already-cancelled stream → AlreadyCancelled ──────────────
  it("cancel twice: second call returns AlreadyCancelled", async () => {
    const s = await createStream({ pct: 50 });

    // First cancel succeeds
    await cancelStream(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    // Second cancel must fail with AlreadyCancelled
    try {
      await cancelStream(
        s.recipient,
        s.streamData,
        s.escrowTokenAccount,
        s.recipientTokenAccount
      );
      assert.fail("Expected AlreadyCancelled error");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "AlreadyCancelled",
        "Second cancel must return AlreadyCancelled"
      );
    }
  });

  // ── Test 5: non-cancelable stream → StreamNotCancelable ─────────────────────
  it("non-cancelable stream: returns StreamNotCancelable", async () => {
    const s = await createStream({ pct: 50, cancelable: false });

    try {
      await cancelStream(
        s.recipient,
        s.streamData,
        s.escrowTokenAccount,
        s.recipientTokenAccount
      );
      assert.fail("Expected StreamNotCancelable error");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "StreamNotCancelable",
        "Non-cancelable stream must block cancel"
      );
    }
  });

  // ── Test 6: withdraw after cancel → StreamExpired ───────────────────────────
  it("withdraw after cancel: returns StreamExpired", async () => {
    const s = await createStream({ pct: 50 });

    await cancelStream(
      s.recipient,
      s.streamData,
      s.escrowTokenAccount,
      s.recipientTokenAccount
    );

    // Recipient tries to withdraw from the cancelled stream
    try {
      await program.methods
        .withdraw()
        .accountsPartial({
          recipient:            s.recipient.publicKey,
          creator:              creator.publicKey,
          streamData:           s.streamData,
          escrowTokenAccount:   s.escrowTokenAccount,
          recipientTokenAccount: s.recipientTokenAccount,
          mint,
          tokenProgram:            TOKEN_PROGRAM_ID,
          associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram:           SystemProgram.programId,
        })
        .signers([s.recipient])
        .rpc();
      assert.fail("Expected StreamExpired error");
    } catch (err: any) {
      assert.include(
        err.message ?? String(err),
        "StreamExpired",
        "Withdraw on cancelled stream must return StreamExpired"
      );
    }
  });

  // ── Test 7: only creator can cancel ─────────────────────────────────────────
  it("non-creator cancel attempt: returns Unauthorized", async () => {
    const s = await createStream({ pct: 50 });
    const attacker = Keypair.generate();
    await fundSol(attacker.publicKey);

    try {
      await program.methods
        .cancel()
        .accountsPartial({
          creator:              attacker.publicKey,  // attacker posing as creator
          recipient:            s.recipient.publicKey,
          streamData:           s.streamData,
          escrowTokenAccount:   s.escrowTokenAccount,
          recipientTokenAccount: s.recipientTokenAccount,
          creatorTokenAccount,
          mint,
          tokenProgram:            TOKEN_PROGRAM_ID,
          associatedTokenProgram:  ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram:           SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Expected Unauthorized error");
    } catch (err: any) {
      const msg = err.message ?? String(err);
      assert.ok(
        msg.includes("Unauthorized") ||
        msg.includes("ConstraintSeeds") ||
        msg.includes("seeds") ||
        msg.includes("2006"),
        `Expected authorization failure, got: ${msg}`
      );
    }
  });
});
