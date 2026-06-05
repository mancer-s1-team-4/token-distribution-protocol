import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_FAUCET_AMOUNT_SOL = 0.05;
const DEFAULT_MAX_RECIPIENT_BALANCE_SOL = 0.1;

function parseSolAmount(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return parsed;
}

function parseSecretKey(value: string | undefined) {
  if (!value) {
    throw new Error("DEVNET_FAUCET_SECRET_KEY is not configured.");
  }

  const parsed = JSON.parse(value) as unknown;
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 64 ||
    !parsed.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)
  ) {
    throw new Error(
      "DEVNET_FAUCET_SECRET_KEY must be a JSON array from a Solana keypair secret key."
    );
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recipient?: unknown };
    if (typeof body.recipient !== "string") {
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    }

    const recipient = new PublicKey(body.recipient);
    const faucet = parseSecretKey(process.env.DEVNET_FAUCET_SECRET_KEY);
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const amountSol = parseSolAmount(
      process.env.DEVNET_FAUCET_AMOUNT_SOL,
      DEFAULT_FAUCET_AMOUNT_SOL
    );
    const maxRecipientBalanceSol = parseSolAmount(
      process.env.DEVNET_FAUCET_MAX_BALANCE_SOL,
      DEFAULT_MAX_RECIPIENT_BALANCE_SOL
    );
    const faucetLamports = await connection.getBalance(faucet.publicKey);
    const recipientLamports = await connection.getBalance(recipient);
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const maxRecipientLamports = Math.floor(
      maxRecipientBalanceSol * LAMPORTS_PER_SOL
    );
    const rentBufferLamports = Math.floor(0.002 * LAMPORTS_PER_SOL);

    if (recipientLamports >= maxRecipientLamports) {
      return NextResponse.json({
        skipped: true,
        recipient: recipient.toBase58(),
        recipientBalanceSol: recipientLamports / LAMPORTS_PER_SOL,
        message: "Wallet already has enough devnet SOL.",
      });
    }

    if (faucetLamports < amountLamports + rentBufferLamports) {
      return NextResponse.json(
        { error: "Faucet wallet does not have enough devnet SOL." },
        { status: 503 }
      );
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: faucet.publicKey,
        toPubkey: recipient,
        lamports: amountLamports,
      })
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      faucet,
    ]);

    return NextResponse.json({
      signature,
      recipient: recipient.toBase58(),
      amountSol,
      recipientBalanceSol: (recipientLamports + amountLamports) / LAMPORTS_PER_SOL,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Faucet failed.";

    if (/secret|not configured|DEVNET_FAUCET/i.test(raw)) {
      console.error("Faucet configuration error:", raw);
      return NextResponse.json({ error: "Faucet is not available." }, { status: 503 });
    }

    const status = /public key|recipient|JSON/i.test(raw) ? 400 : 500;
    return NextResponse.json({ error: raw }, { status });
  }
}
