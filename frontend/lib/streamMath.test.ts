import { describe, expect, test } from "bun:test";
import { BN } from "@coral-xyz/anchor";

import {
  calculateClaimable,
  calculateVested,
  deriveStatus,
  formatTimeRemaining,
} from "./streamMath";
import type { StreamAccount } from "./tokenDistribution";

function stream(
  overrides: Partial<StreamAccount["account"]> = {}
): StreamAccount["account"] {
  return {
    creator: undefined as never,
    recipient: undefined as never,
    mint: undefined as never,
    escrowTokenAccount: undefined as never,
    streamId: new BN(1),
    amountTotal: new BN(1000),
    amountClaimed: new BN(100),
    startTime: new BN(100),
    cliffTime: new BN(100),
    endTime: new BN(200),
    streamType: 0,
    isCancelable: true,
    isCancelled: false,
    milestoneCount: 0,
    milestones: [],
    bump: 1,
    ...overrides,
  };
}

describe("stream math", () => {
  test("mirrors linear vesting before, during, and after the schedule", () => {
    const account = stream();

    expect(calculateVested(account, 99).toString()).toBe("0");
    expect(calculateVested(account, 150).toString()).toBe("500");
    expect(calculateVested(account, 250).toString()).toBe("1000");
  });

  test("sums verified milestones only", () => {
    const account = stream({
      streamType: 2,
      milestones: [
        {
          amount: new BN(250),
          descriptionHash: [],
          isVerified: true,
          verifier: undefined as never,
        },
        {
          amount: new BN(400),
          descriptionHash: [],
          isVerified: false,
          verifier: undefined as never,
        },
      ],
    });

    expect(calculateVested(account, 150).toString()).toBe("250");
  });

  test("floors claimable at zero", () => {
    expect(
      calculateClaimable(stream({ amountClaimed: new BN(700) }), 150).toString()
    ).toBe("0");
  });

  test("derives user-facing status", () => {
    expect(deriveStatus(stream(), 50)).toBe("Pending");
    expect(deriveStatus(stream(), 150)).toBe("Active");
    expect(deriveStatus(stream({ amountClaimed: new BN(1000) }), 150)).toBe(
      "Completed"
    );
    expect(deriveStatus(stream({ isCancelled: true }), 150)).toBe("Cancelled");
  });

  test("formats time remaining labels", () => {
    expect(formatTimeRemaining(1000, 0, 500)).toBe("Starts in 8m");
    expect(formatTimeRemaining(200000, 100000)).toBe("Ends in 1d 3h");
    expect(formatTimeRemaining(100000, 107200)).toBe("Ended 2h ago");
  });
});
