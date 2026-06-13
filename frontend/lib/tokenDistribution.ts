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
export const MOCK_TOKEN_MINT_AMOUNT = 10_000;

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

export type MockTokenBalance = {
  mockMint: PublicKey;
  tokenAccount: PublicKey;
  amount: string;
  error?: string;
};

const STREAM_DATA_CREATOR_OFFSET = 8;
const STREAM_DATA_RECIPIENT_OFFSET = STREAM_DATA_CREATOR_OFFSET + 32;
const MIN_REQUIRED_DEVNET_SOL = 0.01;
const LAMPORTS_PER_SOL = 1_000_000_000;

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

export function getMockMintPda() {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("mock_mint")],
    PROGRAM_ID
  )[0];
}

export function getMockTokenAccount(owner: PublicKey) {
  return getAssociatedTokenAddressSync(getMockMintPda(), owner);
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

  // Pre-flight: verify the creator's token account exists and has sufficient balance.
  // This produces a friendly error before sending the transaction rather than
  // letting the on-chain InsufficientFunds check fire with a raw error code.
  const creatorTokenAccountInfo = await connection.getAccountInfo(creatorTokenAccount);
  if (!creatorTokenAccountInfo) {
    throw new Error(
      "NO_CREATOR_TOKEN_ACCOUNT: You don't have a token account for this token. " +
      "Hold some of this token in your wallet first, then try again."
    );
  }

  const creatorBalance = await connection.getTokenAccountBalance(creatorTokenAccount);
  const creatorBalanceBN = new anchor.BN(creatorBalance.value.amount);
  if (creatorBalanceBN.lt(amount)) {
    // Use a prefix that does not match the /insufficient/i fallback in friendlyError(),
    // so the actual base-unit amounts reach the user rather than the generic message.
    throw new Error(
      `LOW_TOKEN_BALANCE: Not enough tokens to fund this stream. ` +
      `Your account holds ${creatorBalance.value.amount} base units; ` +
      `this stream requires ${amount.toString()} base units.`
    );
  }

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

export async function mintMockTokensTx(
  connection: Connection,
  wallet: WalletContextState,
  amount = MOCK_TOKEN_MINT_AMOUNT
) {
  if (!wallet.publicKey) {
    throw new Error("Hubungkan wallet terlebih dahulu.");
  }

  const program = getProgram(connection, wallet);
  const mockMint = getMockMintPda();
  const minterTokenAccount = getAssociatedTokenAddressSync(
    mockMint,
    wallet.publicKey
  );
  const solBalance = await connection.getBalance(wallet.publicKey);

  if (solBalance < MIN_REQUIRED_DEVNET_SOL * LAMPORTS_PER_SOL) {
    throw new Error(
      `NO_DEVNET_SOL: This wallet needs at least ${MIN_REQUIRED_DEVNET_SOL} devnet SOL to pay transaction fees and create the token account.`
    );
  }

  const signature = await program.methods
    .mintMockTokens(new anchor.BN(amount))
    .accounts({
      minter: wallet.publicKey,
      mockMint,
      minterTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc();

  return { signature, mockMint };
}

export async function fetchMockTokenBalance(
  connection: Connection,
  owner: PublicKey
): Promise<MockTokenBalance> {
  const mockMint = getMockMintPda();
  const tokenAccount = getMockTokenAccount(owner);

  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);

    return {
      mockMint,
      tokenAccount,
      amount: balance.value.amount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load token balance.";

    if (/could not find account|invalid param|account not found/i.test(message)) {
      return {
        mockMint,
        tokenAccount,
        amount: "0",
      };
    }

    return {
      mockMint,
      tokenAccount,
      amount: "0",
      error: message,
    };
  }
}

export async function fetchWalletStreams(
  connection: Connection,
  wallet: WalletContextState
) {
  const walletPublicKey = wallet.publicKey;

  if (!walletPublicKey) {
    return [];
  }

  return fetchStreamsForAddress(connection, wallet, walletPublicKey);
}

export async function fetchStreamsForAddress(
  connection: Connection,
  wallet: WalletContextState,
  walletPublicKey: PublicKey
) {
  const program = getProgram(connection, wallet);
  const streamData = (
    program.account as unknown as {
      streamData: {
        all: (
          filters?: anchor.web3.GetProgramAccountsFilter[]
        ) => Promise<StreamAccount[]>;
      };
    }
  ).streamData;

  const [createdStreams, recipientStreams] = await Promise.all([
    streamData.all([
      {
        memcmp: {
          offset: STREAM_DATA_CREATOR_OFFSET,
          bytes: walletPublicKey.toBase58(),
        },
      },
    ]),
    streamData.all([
      {
        memcmp: {
          offset: STREAM_DATA_RECIPIENT_OFFSET,
          bytes: walletPublicKey.toBase58(),
        },
      },
    ]),
  ]);

  const rowsByAddress = new Map<string, StreamAccount>();

  for (const row of [...createdStreams, ...recipientStreams]) {
    rowsByAddress.set(row.publicKey.toBase58(), row);
  }

  return [...rowsByAddress.values()]
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
