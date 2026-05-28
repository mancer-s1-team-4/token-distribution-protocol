import { describe, expect, test } from "bun:test";
import { Keypair } from "@solana/web3.js";

import { parseDemoSecretKey } from "./demoWallet";

describe("demo wallet helpers", () => {
  test("parses a JSON keypair secret key", () => {
    const keypair = Keypair.generate();
    const parsed = parseDemoSecretKey(JSON.stringify([...keypair.secretKey]));

    expect(parsed.publicKey.toBase58()).toBe(keypair.publicKey.toBase58());
  });

  test("rejects missing or malformed keypair values", () => {
    expect(() => parseDemoSecretKey(undefined)).toThrow(
      "DEMO_WALLET_SECRET_KEY or DEVNET_FAUCET_SECRET_KEY is not configured."
    );
    expect(() => parseDemoSecretKey("[1,2,3]")).toThrow(
      "Demo wallet secret key must be a JSON array from a Solana keypair secret key."
    );
  });
});
