import { NextResponse } from "next/server";

import { cancelDemoStream } from "@/lib/server/demoTransactions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { streamData?: unknown };
    if (typeof body.streamData !== "string") {
      return NextResponse.json({ error: "streamData is required." }, { status: 400 });
    }

    const signature = await cancelDemoStream(body.streamData);

    return NextResponse.json({ signature });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo cancellation failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
