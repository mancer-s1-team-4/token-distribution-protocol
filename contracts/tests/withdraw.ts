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

const DAY = 86_400;
const TOTAL = 1_000_000;

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

describe("withdraw", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const creator = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let creatorTokenAccount: PublicKey;
  let streamCounter = 10_000;

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
      50_000_000
    );
  });

  async function fundSol(destination: PublicKey) {
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: creator.publicKey,
          toPubkey: destination,
          lamports: LAMPORTS_PER_SOL / 10,
        })
      )
    );
  }

  async function createStreamAtPercent(pct: number): Promise<{
    recipient: Keypair;
    streamData: PublicKey;
    escrowTokenAccount: PublicKey;
    recipientTokenAccount: PublicKey;
  }> {
    const recipient = Keypair.generate();
    await fundSol(recipient.publicKey);

    const now = Math.floor(Date.now() / 1000);
    const streamId = new BN(streamCounter++);
    const elapsed = Math.floor((pct / 100) * 100 * DAY);
    const startTime = pct === 0 ? now + DAY : now - elapsed;
    const endTime = startTime + 100 * DAY;
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
        new BN(startTime),
        new BN(startTime),
        new BN(endTime),
        0,
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

    const recipientTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        creator.payer,
        mint,
        recipient.publicKey
      )
    ).address;

    return {
      recipient,
      streamData,
      escrowTokenAccount,
      recipientTokenAccount,
    };
  }

  async function withdraw(
    recipient: Keypair,
    streamData: PublicKey,
    escrowTokenAccount: PublicKey,
    recipientTokenAccount: PublicKey
  ) {
    return program.methods
      .withdraw()
      .accountsPartial({
        recipient: recipient.publicKey,
        creator: creator.publicKey,
        streamData,
        escrowTokenAccount,
        recipientTokenAccount,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([recipient])
      .rpc();
  }

  it("rejects withdrawal at 0% because no tokens are unlocked", async () => {
    const stream = await createStreamAtPercent(0);

    try {
      await withdraw(
        stream.recipient,
        stream.streamData,
        stream.escrowTokenAccount,
        stream.recipientTokenAccount
      );
      assert.fail("Expected NothingToWithdraw");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "NothingToWithdraw");
    }
  });

  it("unlocks 25%, 50%, and 100% linearly", async () => {
    for (const [pct, expected] of [
      [25, 250_000],
      [50, 500_000],
      [100, 1_000_000],
    ]) {
      const stream = await createStreamAtPercent(pct);
      await withdraw(
        stream.recipient,
        stream.streamData,
        stream.escrowTokenAccount,
        stream.recipientTokenAccount
      );

      const recipientAccount = await getAccount(
        provider.connection,
        stream.recipientTokenAccount
      );
      assert.approximately(
        Number(recipientAccount.amount),
        expected,
        10_000,
        `${pct}% vested should unlock about ${expected} tokens`
      );
    }
  });

  it("supports partial withdrawals and blocks withdrawing more than unlocked", async () => {
    const stream = await createStreamAtPercent(50);

    await withdraw(
      stream.recipient,
      stream.streamData,
      stream.escrowTokenAccount,
      stream.recipientTokenAccount
    );

    const firstBalance = Number(
      (await getAccount(provider.connection, stream.recipientTokenAccount)).amount
    );
    const streamAfterFirst = await program.account.streamData.fetch(stream.streamData);
    assert.approximately(firstBalance, 500_000, 10_000);
    assert.equal(streamAfterFirst.amountClaimed.toNumber(), firstBalance);

    try {
      await withdraw(
        stream.recipient,
        stream.streamData,
        stream.escrowTokenAccount,
        stream.recipientTokenAccount
      );
    } catch (err: any) {
      assert.include(err.message ?? String(err), "NothingToWithdraw");
      return;
    }

    const secondBalance = Number(
      (await getAccount(provider.connection, stream.recipientTokenAccount)).amount
    );
    assert.isAtMost(secondBalance - firstBalance, 10);
  });

  it("allows a full withdrawal after the stream is fully vested", async () => {
    const stream = await createStreamAtPercent(100);

    await withdraw(
      stream.recipient,
      stream.streamData,
      stream.escrowTokenAccount,
      stream.recipientTokenAccount
    );

    const recipientAccount = await getAccount(
      provider.connection,
      stream.recipientTokenAccount
    );
    const escrowAccount = await getAccount(
      provider.connection,
      stream.escrowTokenAccount
    );
    const streamAfter = await program.account.streamData.fetch(stream.streamData);

    assert.equal(Number(recipientAccount.amount), TOTAL);
    assert.equal(Number(escrowAccount.amount), 0);
    assert.equal(streamAfter.amountClaimed.toNumber(), TOTAL);
  });

  it("rejects unauthorized withdrawal from someone else's stream", async () => {
    const stream = await createStreamAtPercent(50);
    const attacker = Keypair.generate();
    await fundSol(attacker.publicKey);
    const attackerTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        creator.payer,
        mint,
        attacker.publicKey
      )
    ).address;

    try {
      await program.methods
        .withdraw()
        .accountsPartial({
          recipient: attacker.publicKey,
          creator: creator.publicKey,
          streamData: stream.streamData,
          escrowTokenAccount: stream.escrowTokenAccount,
          recipientTokenAccount: attackerTokenAccount,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();

      assert.fail("Expected unauthorized withdrawal to fail");
    } catch (err: any) {
      const message = err.message ?? String(err);
      assert.ok(
        message.includes("Unauthorized") ||
          message.includes("ConstraintSeeds") ||
          message.includes("seeds") ||
          message.includes("2006"),
        `Expected authorization failure, got: ${message}`
      );
    }
  });
});
