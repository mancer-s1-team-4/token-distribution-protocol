import { BN } from "@coral-xyz/anchor";

import type { StreamAccount } from "./tokenDistribution";

export type StreamStatus = "Pending" | "Active" | "Completed" | "Cancelled";

export function calculateVested(
  stream: StreamAccount["account"],
  nowSec: number
): BN {
  if (stream.streamType === 2) {
    return stream.milestones
      .filter((milestone) => milestone.isVerified)
      .reduce((total, milestone) => total.add(milestone.amount), new BN(0));
  }

  const cliffTime = stream.cliffTime.toNumber();
  const startTime = stream.startTime.toNumber();
  const endTime = stream.endTime.toNumber();

  if (nowSec < cliffTime) {
    return new BN(0);
  }

  if (nowSec >= endTime) {
    return stream.amountTotal;
  }

  const duration = Math.max(endTime - startTime, 0);
  if (duration === 0) {
    return stream.amountTotal;
  }

  const elapsed = Math.max(nowSec - startTime, 0);
  return stream.amountTotal.mul(new BN(elapsed)).div(new BN(duration));
}

export function calculateClaimable(
  stream: StreamAccount["account"],
  nowSec: number
): BN {
  const claimable = calculateVested(stream, nowSec).sub(stream.amountClaimed);
  return claimable.isNeg() ? new BN(0) : claimable;
}

export function deriveStatus(
  stream: StreamAccount["account"],
  nowSec: number
): StreamStatus {
  if (stream.isCancelled) {
    return "Cancelled";
  }

  const startBoundary = stream.cliffTime.gt(new BN(0))
    ? stream.cliffTime
    : stream.startTime;

  if (nowSec < startBoundary.toNumber()) {
    return "Pending";
  }

  if (stream.amountClaimed.gte(stream.amountTotal)) {
    return "Completed";
  }

  return "Active";
}

export function formatTimeRemaining(
  endTimeSec: number,
  nowSec: number,
  startTimeSec?: number
): string {
  if (startTimeSec !== undefined && nowSec < startTimeSec) {
    return `Starts in ${formatDuration(startTimeSec - nowSec)}`;
  }

  if (nowSec >= endTimeSec) {
    return `Ended ${formatDuration(nowSec - endTimeSec)} ago`;
  }

  return `Ends in ${formatDuration(endTimeSec - nowSec)}`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.floor(seconds / 60));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  return `${remainingMinutes}m`;
}
