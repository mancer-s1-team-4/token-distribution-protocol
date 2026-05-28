import { describe, expect, test } from "bun:test";

import { friendlyError } from "./errors";

describe("friendlyError", () => {
  test("maps common wallet and account failures", () => {
    expect(friendlyError("User rejected the request")).toContain("cancelled");
    expect(friendlyError("NO_CREATOR_TOKEN_ACCOUNT")).toContain(
      "token account"
    );
    expect(friendlyError("NO_DEVNET_SOL")).toContain("devnet SOL");
  });

  test("maps Anchor custom program errors from the contract", () => {
    expect(friendlyError("custom program error: 0x1777")).toContain(
      "authorized"
    );
    expect(friendlyError("custom program error: 0x1778")).toContain(
      "not started"
    );
    expect(friendlyError("custom program error: 0x1779")).toContain(
      "available"
    );
  });

  test("keeps explicit insufficient-token compatibility mapping", () => {
    expect(friendlyError("custom program error: 0x1771")).toContain(
      "enough tokens"
    );
  });
});
