import type { Connection } from "@solana/web3.js";

import { friendlyError } from "./errors";

type ToastHandle = {
  update: (
    state: "loading" | "success" | "error" | "info",
    message: string,
    opts?: { href?: string }
  ) => void;
};

type ToastFn = (
  state: "loading" | "success" | "error" | "info",
  message: string,
  opts?: { href?: string; duration?: number }
) => ToastHandle;

export async function runTx(options: {
  connection: Connection;
  toast: ToastFn;
  action: () => Promise<string>;
}): Promise<string> {
  const toastHandle = options.toast("loading", "Waiting for wallet approval...");

  try {
    const signature = await options.action();
    toastHandle.update("info", "Sending to Solana...");
    await options.connection.confirmTransaction(signature, "confirmed");

    const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    toastHandle.update("success", "Confirmed - view on Explorer", { href });
    return signature;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Transaction failed.";
    toastHandle.update("error", friendlyError(raw));
    throw error;
  }
}
