import { NextResponse } from "next/server";

import { mintDemoMockTokens } from "@/lib/server/demoTransactions";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await mintDemoMockTokens();

    return NextResponse.json({
      signature: result.signature,
      mockMint: result.mockMint.toBase58(),
      demoWallet: result.demoWallet.toBase58(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo mint failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
