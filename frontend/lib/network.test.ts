import { describe, expect, test } from "bun:test";

import {
  getConfiguredCluster,
  getExplorerAddressUrl,
  getExplorerTxUrl,
} from "./network";

describe("network helpers", () => {
  test("defaults to devnet when no RPC URL is configured", () => {
    expect(getConfiguredCluster(undefined)).toEqual({
      label: "Devnet",
      explorerCluster: "devnet",
    });
  });

  test("derives known cluster labels from RPC URLs", () => {
    expect(getConfiguredCluster("https://api.testnet.solana.com")).toEqual({
      label: "Testnet",
      explorerCluster: "testnet",
    });
    expect(getConfiguredCluster("https://api.mainnet-beta.solana.com")).toEqual({
      label: "Mainnet",
      explorerCluster: "mainnet-beta",
    });
  });

  test("labels unknown RPC endpoints without forcing an explorer cluster", () => {
    expect(getConfiguredCluster("http://127.0.0.1:8899")).toEqual({
      label: "Custom RPC",
    });
  });

  test("builds explorer transaction URLs from configured cluster", () => {
    expect(getExplorerTxUrl("abc", undefined)).toBe(
      "https://explorer.solana.com/tx/abc?cluster=devnet"
    );
  });

  test("builds explorer address URLs from configured cluster", () => {
    expect(getExplorerAddressUrl("address123", undefined)).toBe(
      "https://explorer.solana.com/address/address123?cluster=devnet"
    );
  });
});
