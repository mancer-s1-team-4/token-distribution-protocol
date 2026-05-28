import { describe, expect, test } from "bun:test";

import {
  DEMO_MODE_STORAGE_KEY,
  isDemoModeValue,
  parseDemoModeValue,
} from "./demoMode";

describe("demo mode helpers", () => {
  test("uses a stable storage key for the browser session", () => {
    expect(DEMO_MODE_STORAGE_KEY).toBe("vestra.demoMode");
  });

  test("parses only the enabled value as active demo mode", () => {
    expect(isDemoModeValue("enabled")).toBe(true);
    expect(isDemoModeValue("disabled")).toBe(false);
    expect(isDemoModeValue(null)).toBe(false);
  });

  test("normalizes storage values into a boolean", () => {
    expect(parseDemoModeValue("enabled")).toBe(true);
    expect(parseDemoModeValue("")).toBe(false);
  });
});
