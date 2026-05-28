import { NextResponse } from "next/server";

import { createDemoStream } from "@/lib/server/demoTransactions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const result = await createDemoStream(input);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo agreement failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
