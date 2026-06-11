import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { createDemoStream } from "@/lib/server/demoTransactions";

export const runtime = "nodejs";

function isValidPublicKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!isValidPublicKey(body.recipient)) {
      return NextResponse.json({ error: "recipient must be a valid Solana address." }, { status: 400 });
    }
    if (!isValidPublicKey(body.mint)) {
      return NextResponse.json({ error: "mint must be a valid Solana address." }, { status: 400 });
    }
    if (typeof body.streamType !== "number" || ![0, 1, 2].includes(body.streamType)) {
      return NextResponse.json({ error: "streamType must be 0, 1, or 2." }, { status: 400 });
    }
    if (typeof body.isCancelable !== "boolean") {
      return NextResponse.json({ error: "isCancelable must be a boolean." }, { status: 400 });
    }

    const input = body as Parameters<typeof createDemoStream>[0];
    const result = await createDemoStream(input);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo agreement failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
