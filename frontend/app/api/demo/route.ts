import { NextResponse } from "next/server";

import { getDemoMockMintPda, getDemoPublicKey } from "@/lib/server/demoTransactions";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      publicKey: getDemoPublicKey().toBase58(),
      mockMint: getDemoMockMintPda().toBase58(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo wallet is unavailable.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
