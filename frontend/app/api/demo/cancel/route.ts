import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { cancelDemoStream } from "@/lib/server/demoTransactions";

export const runtime = "nodejs";

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { streamData?: unknown };
    if (typeof body.streamData !== "string" || !isValidPublicKey(body.streamData)) {
      return NextResponse.json({ error: "streamData must be a valid Solana address." }, { status: 400 });
    }

    const signature = await cancelDemoStream(body.streamData);

    return NextResponse.json({ signature });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo cancellation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
