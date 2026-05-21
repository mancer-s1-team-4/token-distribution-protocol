"use client";

import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  type Connection,
} from "@solana/web3.js";

import idl from "./idl/token_distribution_protocol.json";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TDP_PROGRAM_ID ?? idl.address
);

export type StreamType = 0 | 1 | 2;

export type StreamAccount = {
  publicKey: PublicKey;
  account: {
    creator: PublicKey;
    recipient: PublicKey;
    mint: PublicKey;
    escrowTokenAccount: PublicKey;
    streamId: anchor.BN;
    amountTotal: anchor.BN;
    amountClaimed: anchor.BN;
    startTime: anchor.BN;
    cliffTime: anchor.BN;
    endTime: anchor.BN;
    streamType: number;
    isCancelable: boolean;
    isCancelled: boolean;
    milestoneCount: number;
    milestones: Array<{
      amount: anchor.BN;
      descriptionHash: number[];
      isVerified: boolean;
      verifier: PublicKey;
    }>;
    bump: number;
  };
};

export type CreateStreamInput = {
  streamId: string;
  recipient: string;
  mint: string;
  amount: string;
  startDate: string;
  cliffDate: string;
  endDate: string;
  streamType: StreamType;
  isCancelable: boolean;
};

function u64Le(value: anchor.BN) {
  return Uint8Array.from(value.toArray("le", 8));
}

export function getStreamPda(
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

export function getEscrowPda(streamData: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("escrow"), streamData.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getProgram(connection: Connection, wallet: WalletContextState) {
  const provider = new anchor.AnchorProvider(
    connection,
    wallet as unknown as anchor.Wallet,
    anchor.AnchorProvider.defaultOptions()
  );

  return new anchor.Program(idl as anchor.Idl, provider);
}

function toUnixSeconds(value: string) {
  const millis = new Date(value).getTime();

  if (!Number.isFinite(millis)) {
    throw new Error("Tanggal tidak valid.");
  }

  return new anchor.BN(Math.floor(millis / 1000));
}

export async function createStreamTx(
  connection: Connection,
  wallet: WalletContextState,
  input: CreateStreamInput
) {
  if (!wallet.publicKey) {
    throw new Error("Hubungkan wallet terlebih dahulu.");
  }

  const program = getProgram(connection, wallet);
  const creator = wallet.publicKey;
  const recipient = new PublicKey(input.recipient);
  const mint = new PublicKey(input.mint);
  const streamId = new anchor.BN(input.streamId);
  const amount = new anchor.BN(input.amount);
  const startTime = toUnixSeconds(input.startDate);
  const cliffTime = toUnixSeconds(input.cliffDate || input.startDate);
  const endTime = toUnixSeconds(input.endDate);
  const streamData = getStreamPda(creator, recipient, streamId);
  const escrowTokenAccount = getEscrowPda(streamData);
  const creatorTokenAccount = getAssociatedTokenAddressSync(mint, creator);

  return program.methods
    .createStream(
      streamId,
      amount,
      startTime,
      cliffTime,
      endTime,
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
}

export async function fetchWalletStreams(
  connection: Connection,
  wallet: WalletContextState
) {
  if (!wallet.publicKey) {
    return [];
  }

  const program = getProgram(connection, wallet);
  const rows = (await (
    program.account as unknown as {
      streamData: { all: () => Promise<StreamAccount[]> };
    }
  ).streamData.all()) as StreamAccount[];

  return rows
    .filter((row) => {
      const account = row.account;

      return (
        account.creator.equals(wallet.publicKey!) ||
        account.recipient.equals(wallet.publicKey!)
      );
    })
    .sort((a, b) => b.account.streamId.cmp(a.account.streamId));
}

export async function withdrawTx(
  connection: Connection,
  wallet: WalletContextState,
  stream: StreamAccount
) {
  if (!wallet.publicKey) {
    throw new Error("Hubungkan wallet terlebih dahulu.");
  }

  const program = getProgram(connection, wallet);
  const recipientTokenAccount = getAssociatedTokenAddressSync(
    stream.account.mint,
    stream.account.recipient
  );

  return program.methods
    .withdraw()
    .accounts({
      recipient: wallet.publicKey,
      creator: stream.account.creator,
      streamData: stream.publicKey,
      escrowTokenAccount: stream.account.escrowTokenAccount,
      recipientTokenAccount,
      mint: stream.account.mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();
}

export async function cancelTx(
  connection: Connection,
  wallet: WalletContextState,
  stream: StreamAccount
) {
  if (!wallet.publicKey) {
    throw new Error("Hubungkan wallet terlebih dahulu.");
  }

  const program = getProgram(connection, wallet);
  const recipientTokenAccount = getAssociatedTokenAddressSync(
    stream.account.mint,
    stream.account.recipient
  );
  const creatorTokenAccount = getAssociatedTokenAddressSync(
    stream.account.mint,
    stream.account.creator
  );

  return program.methods
    .cancel()
    .accounts({
      creator: wallet.publicKey,
      recipient: stream.account.recipient,
      streamData: stream.publicKey,
      escrowTokenAccount: stream.account.escrowTokenAccount,
      recipientTokenAccount,
      creatorTokenAccount,
      mint: stream.account.mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();
}

export async function verifyMilestoneTx(
  connection: Connection,
  wallet: WalletContextState,
  stream: StreamAccount,
  milestoneIndex: number
) {
  if (!wallet.publicKey) {
    throw new Error("Hubungkan wallet terlebih dahulu.");
  }

  const program = getProgram(connection, wallet);

  return program.methods
    .verifyMilestone(milestoneIndex)
    .accounts({
      verifier: wallet.publicKey,
      creator: stream.account.creator,
      recipient: stream.account.recipient,
      streamData: stream.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();
}

export function formatTokenAmount(value: anchor.BN) {
  return value.toString();
}

export function formatDate(value: anchor.BN) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value.toNumber() * 1000));
}

export function streamTypeLabel(value: number) {
  if (value === 1) return "Cliff";
  if (value === 2) return "Milestone";
  return "Linear";
}
