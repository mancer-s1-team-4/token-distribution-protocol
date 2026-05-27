import { describe, expect, test } from "bun:test";
import { BN } from "@coral-xyz/anchor";

import { formatUiAmount, toBaseUnits } from "./mint";

describe("mint amount helpers", () => {
  test("converts decimal UI amounts into base units", () => {
    expect(toBaseUnits("1.23", 6).toString()).toBe("1230000");
    expect(toBaseUnits("1,234.5", 2).toString()).toBe("123450");
  });

  test("rejects values with more fractional digits than mint decimals", () => {
    expect(() => toBaseUnits("0.001", 2)).toThrow("Too many decimal places");
  });

  test("formats raw base units as UI amounts", () => {
    expect(formatUiAmount(new BN("1000000000"), 9)).toBe("1.00");
    expect(formatUiAmount(new BN("1234500"), 6)).toBe("1.2345");
    expect(formatUiAmount(new BN("1234567890"), 2)).toBe("12,345,678.90");
  });
});
