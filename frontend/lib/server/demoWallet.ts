import { Keypair } from "@solana/web3.js";

export function parseDemoSecretKey(value: string | undefined) {
  if (!value) {
    throw new Error(
      "DEMO_WALLET_SECRET_KEY or DEVNET_FAUCET_SECRET_KEY is not configured."
    );
  }

  const parsed = JSON.parse(value) as unknown;
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 64 ||
    !parsed.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)
  ) {
    throw new Error(
      "Demo wallet secret key must be a JSON array from a Solana keypair secret key."
    );
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

export function getDemoWallet() {
  return parseDemoSecretKey(
    process.env.DEMO_WALLET_SECRET_KEY ?? process.env.DEVNET_FAUCET_SECRET_KEY
  );
}
