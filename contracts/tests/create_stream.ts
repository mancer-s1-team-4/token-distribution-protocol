import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
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

describe("create_stream", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .tokenDistributionProtocol as Program<TokenDistributionProtocol>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const creator = provider.wallet as anchor.Wallet;

  let mint: PublicKey;
  let creatorTokenAccount: PublicKey;

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
      10_000_000
    );
  });

  it("locks creator tokens in a PDA-owned escrow and initializes stream data", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const streamId = new BN(1);
    const amount = new BN(1_000_000);
    const now = Math.floor(Date.now() / 1000);
    const startTime = new BN(now + DAY);
    const endTime = new BN(now + 101 * DAY);
    const [streamData] = streamDataPda(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const [escrowTokenAccount] = escrowPda(program.programId, streamData);

    await program.methods
      .createStream(streamId, amount, startTime, startTime, endTime, 0, true)
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

    const stream = await program.account.streamData.fetch(streamData);
    assert.ok(stream.creator.equals(creator.publicKey));
    assert.ok(stream.recipient.equals(recipient.publicKey));
    assert.ok(stream.mint.equals(mint));
    assert.ok(stream.escrowTokenAccount.equals(escrowTokenAccount));
    assert.equal(stream.streamId.toNumber(), streamId.toNumber());
    assert.equal(stream.amountTotal.toNumber(), amount.toNumber());
    assert.equal(stream.amountClaimed.toNumber(), 0);
    assert.equal(stream.startTime.toNumber(), startTime.toNumber());
    assert.equal(stream.endTime.toNumber(), endTime.toNumber());
    assert.equal(stream.streamType, 0);
    assert.equal(stream.isCancelable, true);

    const escrow = await getAccount(provider.connection, escrowTokenAccount);
    const creatorAccount = await getAccount(provider.connection, creatorTokenAccount);
    assert.ok(escrow.owner.equals(streamData), "escrow authority must be stream PDA");
    assert.equal(Number(escrow.amount), amount.toNumber());
    assert.equal(Number(creatorAccount.amount), 9_000_000);
  });

  it("rejects invalid stream parameters with clear errors", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const streamId = new BN(2);
    const now = Math.floor(Date.now() / 1000);
    const startTime = new BN(now + DAY);
    const [streamData] = streamDataPda(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const [escrowTokenAccount] = escrowPda(program.programId, streamData);

    try {
      await program.methods
        .createStream(
          streamId,
          new BN(0),
          startTime,
          startTime,
          new BN(now + 101 * DAY),
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

      assert.fail("Expected InvalidAmount");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "InvalidAmount");
    }
  });

  it("rejects end_time before start_time with InvalidTimeRange", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const streamId = new BN(3);
    const now = Math.floor(Date.now() / 1000);
    const startTime = new BN(now + 10 * DAY);
    const [streamData] = streamDataPda(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const [escrowTokenAccount] = escrowPda(program.programId, streamData);

    try {
      await program.methods
        .createStream(
          streamId,
          new BN(1_000_000),
          startTime,
          startTime,
          new BN(now + 5 * DAY), // end_time < start_time
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

      assert.fail("Expected InvalidTimeRange");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "InvalidTimeRange");
    }
  });

  it("rejects self-vesting when creator and recipient are the same account", async () => {
    const streamId = new BN(4);
    const now = Math.floor(Date.now() / 1000);
    // PDA derived with creator as both parties — seeds still unique via streamId.
    const [streamData] = streamDataPda(
      program.programId,
      creator.publicKey,
      creator.publicKey,
      streamId
    );
    const [escrowTokenAccount] = escrowPda(program.programId, streamData);

    try {
      await program.methods
        .createStream(
          streamId,
          new BN(1_000_000),
          new BN(now),
          new BN(now),
          new BN(now + 100 * DAY),
          0,
          true
        )
        .accountsPartial({
          creator: creator.publicKey,
          recipient: creator.publicKey,
          streamData,
          escrowTokenAccount,
          creatorTokenAccount,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Expected SelfVesting");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "SelfVesting");
    }
  });

  it("rejects cliff time outside [start, end] range with InvalidCliffTime", async () => {
    const recipient = anchor.web3.Keypair.generate();
    const streamId = new BN(5);
    const now = Math.floor(Date.now() / 1000);
    const startTime = new BN(now + DAY);
    const endTime = new BN(now + 100 * DAY);
    const [streamData] = streamDataPda(
      program.programId,
      creator.publicKey,
      recipient.publicKey,
      streamId
    );
    const [escrowTokenAccount] = escrowPda(program.programId, streamData);

    try {
      await program.methods
        .createStream(
          streamId,
          new BN(1_000_000),
          startTime,
          new BN(now + 200 * DAY), // cliff_time > end_time
          endTime,
          1, // Cliff+Linear
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

      assert.fail("Expected InvalidCliffTime");
    } catch (err: any) {
      assert.include(err.message ?? String(err), "InvalidCliffTime");
    }
  });
});
