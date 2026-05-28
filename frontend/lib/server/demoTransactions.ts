import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  type Keypair,
} from "@solana/web3.js";

import idl from "@/lib/idl/token_distribution_protocol.json";
import { getDemoWallet } from "./demoWallet";

const MOCK_TOKEN_MINT_AMOUNT = 10_000;
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TDP_PROGRAM_ID ?? idl.address
);

type CreateStreamInput = {
  streamId: string;
  recipient: string;
  mint: string;
  amount: string;
  startDate: string;
  cliffDate: string;
  endDate: string;
  streamType: 0 | 1 | 2;
  isCancelable: boolean;
};

function u64Le(value: anchor.BN) {
  return Uint8Array.from(value.toArray("le", 8));
}

function getStreamPda(
  creator: PublicKey,
  recipient: PublicKey,
  streamId: anchor.BN
) {
  return PublicKey.findProgramAddressSync(
    [
      new TextEncoder().encode("stream"),
      creator.toBuffer(),
      recipient.toBuffer(),
      u64Le(streamId),
    ],
    PROGRAM_ID
  )[0];
}

function getEscrowPda(streamData: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("escrow"), streamData.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getDemoMockMintPda() {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("mock_mint")],
    PROGRAM_ID
  )[0];
}

function toUnixSeconds(value: string) {
  const millis = new Date(value).getTime();

  if (!Number.isFinite(millis)) {
    throw new Error("Invalid schedule date.");
  }

  return new anchor.BN(Math.floor(millis / 1000));
}

function getRpcUrl() {
  return process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
}

function getConnection() {
  return new Connection(getRpcUrl(), "confirmed");
}

function getAnchorWallet(keypair: Keypair): anchor.Wallet {
  return {
    publicKey: keypair.publicKey,
    payer: keypair,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      tx: T
    ) => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
      } else {
        tx.partialSign(keypair);
      }

      return tx;
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ) =>
      Promise.all(
        txs.map(async (tx) => {
          if (tx instanceof VersionedTransaction) {
            tx.sign([keypair]);
          } else {
            tx.partialSign(keypair);
          }

          return tx;
        })
      ),
  };
}

function getDemoProgram() {
  const connection = getConnection();
  const demoWallet = getDemoWallet();
  const provider = new anchor.AnchorProvider(
    connection,
    getAnchorWallet(demoWallet),
    anchor.AnchorProvider.defaultOptions()
  );

  return {
    connection,
    demoWallet,
    program: new anchor.Program(idl as anchor.Idl, provider),
  };
}

export function getDemoPublicKey() {
  return getDemoWallet().publicKey;
}

export async function mintDemoMockTokens() {
  const { demoWallet, program } = getDemoProgram();
  const mockMint = getDemoMockMintPda();
  const minterTokenAccount = getAssociatedTokenAddressSync(
    mockMint,
    demoWallet.publicKey
  );

  const signature = await program.methods
    .mintMockTokens(new anchor.BN(MOCK_TOKEN_MINT_AMOUNT))
    .accounts({
      minter: demoWallet.publicKey,
      mockMint,
      minterTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();

  return { signature, mockMint, demoWallet: demoWallet.publicKey };
}

export async function createDemoStream(input: CreateStreamInput) {
  const { demoWallet, program } = getDemoProgram();
  const creator = demoWallet.publicKey;
  const recipient = new PublicKey(input.recipient);
  const mint = new PublicKey(input.mint);
  const streamId = new anchor.BN(input.streamId);
  const streamData = getStreamPda(creator, recipient, streamId);
  const escrowTokenAccount = getEscrowPda(streamData);
  const creatorTokenAccount = getAssociatedTokenAddressSync(mint, creator);

  if (mint.equals(getDemoMockMintPda())) {
    await mintDemoMockTokens();
  }

  const signature = await program.methods
    .createStream(
      streamId,
      new anchor.BN(input.amount),
      toUnixSeconds(input.startDate),
      toUnixSeconds(input.cliffDate || input.startDate),
      toUnixSeconds(input.endDate),
      input.streamType,
      input.isCancelable
    )
    .accounts({
      creator,
      recipient,
      streamData,
      escrowTokenAccount,
      creatorTokenAccount,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();

  return {
    signature,
    agreementId: input.streamId,
    streamData: streamData.toBase58(),
    demoWallet: creator.toBase58(),
  };
}

async function fetchStream(streamDataAddress: string) {
  const { program } = getDemoProgram();
  const streamData = new PublicKey(streamDataAddress);
  const account = await (
    program.account as unknown as {
      streamData: { fetch: (address: PublicKey) => Promise<unknown> };
    }
  ).streamData.fetch(streamData);

  return { program, streamData, account } as {
    program: anchor.Program;
    streamData: PublicKey;
    account: {
      creator: PublicKey;
      recipient: PublicKey;
      mint: PublicKey;
      escrowTokenAccount: PublicKey;
    };
  };
}

export async function withdrawDemoStream(streamDataAddress: string) {
  const demoWallet = getDemoWallet();
  const { program, streamData, account } = await fetchStream(streamDataAddress);
  const recipientTokenAccount = getAssociatedTokenAddressSync(
    account.mint,
    account.recipient
  );

  return program.methods
    .withdraw()
    .accounts({
      recipient: demoWallet.publicKey,
      creator: account.creator,
      streamData,
      escrowTokenAccount: account.escrowTokenAccount,
      recipientTokenAccount,
      mint: account.mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();
}

export async function cancelDemoStream(streamDataAddress: string) {
  const demoWallet = getDemoWallet();
  const { program, streamData, account } = await fetchStream(streamDataAddress);
  const recipientTokenAccount = getAssociatedTokenAddressSync(
    account.mint,
    account.recipient
  );
  const creatorTokenAccount = getAssociatedTokenAddressSync(
    account.mint,
    account.creator
  );

  return program.methods
    .cancel()
    .accounts({
      creator: demoWallet.publicKey,
      recipient: account.recipient,
      streamData,
      escrowTokenAccount: account.escrowTokenAccount,
      recipientTokenAccount,
      creatorTokenAccount,
      mint: account.mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();
}

export async function verifyDemoMilestone(
  streamDataAddress: string,
  milestoneIndex: number
) {
  const demoWallet = getDemoWallet();
  const { program, streamData, account } = await fetchStream(streamDataAddress);

  return program.methods
    .verifyMilestone(milestoneIndex)
    .accounts({
      verifier: demoWallet.publicKey,
      creator: account.creator,
      recipient: account.recipient,
      streamData,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();
}
