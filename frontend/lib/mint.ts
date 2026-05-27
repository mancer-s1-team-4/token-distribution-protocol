import { BN } from "@coral-xyz/anchor";
import { getMint } from "@solana/spl-token";
import { type Connection, PublicKey } from "@solana/web3.js";

const mintDecimalsCache = new Map<string, number>();

export async function fetchMintDecimals(
  connection: Connection,
  mint: PublicKey
): Promise<number> {
  const key = mint.toBase58();
  const cached = mintDecimalsCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const account = await getMint(connection, mint);
  mintDecimalsCache.set(key, account.decimals);
  return account.decimals;
}

export function toBaseUnits(uiAmount: string, decimals: number): BN {
  const normalized = uiAmount.trim().replaceAll(",", "");

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be a positive number.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places for this token. Maximum is ${decimals}.`);
  }

  const paddedFraction = fraction.padEnd(decimals, "0");
  const value = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return new BN(value || "0");
}

export function formatUiAmount(rawBn: BN, decimals: number): string {
  const raw = rawBn.toString();
  const padded = raw.padStart(decimals + 1, "0");
  const whole = decimals === 0 ? padded : padded.slice(0, -decimals);
  const fraction = decimals === 0 ? "" : padded.slice(-decimals);
  const trimmedFraction = fraction.replace(/0+$/, "");
  const groupedWhole = groupIntegerString(whole);

  if (decimals === 0) {
    return groupedWhole;
  }

  const displayFraction = fraction
    .slice(0, Math.max(2, trimmedFraction.length))
    .replace(/0+$/, "")
    .padEnd(2, "0");

  return `${groupedWhole}.${displayFraction}`;
}

function groupIntegerString(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
