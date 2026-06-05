import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { verifyDemoMilestone } from "@/lib/server/demoTransactions";

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      streamData?: unknown;
      milestoneIndex?: unknown;
    };
    if (typeof body.streamData !== "string" || !isValidPublicKey(body.streamData)) {
      return NextResponse.json({ error: "streamData must be a valid Solana address." }, { status: 400 });
    }
    if (
      typeof body.milestoneIndex !== "number" ||
      !Number.isInteger(body.milestoneIndex) ||
      body.milestoneIndex < 0
    ) {
      return NextResponse.json(
        { error: "milestoneIndex must be a non-negative integer." },
        { status: 400 }
      );
    }

    const signature = await verifyDemoMilestone(
      body.streamData,
      body.milestoneIndex
    );

    return NextResponse.json({ signature });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo milestone verification failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
