"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { Address } from "@/components/Address";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ConnectButton } from "@/components/ConnectButton";
import { StatusPill } from "@/components/StatusPill";
import { useToast } from "@/components/ToastProvider";
import { useVestraWallet } from "@/hooks/useVestraWallet";
import {
  DEMO_MODE_ENABLED_VALUE,
  DEMO_MODE_STORAGE_KEY,
  parseDemoModeValue,
} from "@/lib/demoMode";
import { fetchMintDecimals, formatUiAmount } from "@/lib/mint";
import { getConfiguredCluster } from "@/lib/network";
import {
  calculateClaimable,
  calculateVested,
  deriveStatus,
  formatTimeRemaining,
} from "@/lib/streamMath";
import {
  cancelTx,
  fetchStreamsForAddress,
  fetchWalletStreams,
  formatDate,
  streamTypeLabel,
  verifyMilestoneTx,
  withdrawTx,
  type StreamAccount,
} from "@/lib/tokenDistribution";
import { runTx } from "@/lib/txRunner";

export default function StreamsPage() {
  const wallet = useVestraWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [streams, setStreams] = useState<StreamAccount[]>([]);
  const [mintDecimals, setMintDecimals] = useState<Record<string, number | null>>({});
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPublicKey, setDemoPublicKey] = useState<PublicKey | null>(null);
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [cancelTarget, setCancelTarget] = useState<StreamAccount | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsDemoMode(parseDemoModeValue(window.localStorage.getItem(DEMO_MODE_STORAGE_KEY)));
      setHasMounted(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const loadStreams = useCallback(async () => {
    if (!wallet.connected && !isDemoMode) {
      setStreams([]);
      setMintDecimals({});
      return;
    }

    setIsLoading(true);
    try {
      const walletStreams =
        isDemoMode && demoPublicKey
          ? await fetchStreamsForAddress(
              connection,
              { ...wallet, publicKey: demoPublicKey } as typeof wallet,
              demoPublicKey
            )
          : await fetchWalletStreams(connection, wallet);
      setStreams(walletStreams);
      setStatus("");

      const streamsByMint = new Map(
        walletStreams.map((stream) => [
          stream.account.mint.toBase58(),
          stream.account.mint,
        ])
      );
      const decimalsEntries = await Promise.all(
        [...streamsByMint.entries()].map(async ([mintAddress, mint]) => {
          try {
            return [mintAddress, await fetchMintDecimals(connection, mint)] as const;
          } catch {
            return [mintAddress, null] as const;
          }
        })
      );
      setMintDecimals(Object.fromEntries(decimalsEntries));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load agreements.");
    } finally {
      setIsLoading(false);
    }
  }, [connection, demoPublicKey, isDemoMode, wallet]);

  useEffect(() => {
    let isCurrent = true;

    async function fetchStreams() {
      await Promise.resolve();
      if (isCurrent) {
        await loadStreams();
      }
    }

    void fetchStreams();

    return () => {
      isCurrent = false;
    };
  }, [loadStreams]);

  async function runStreamTx(action: () => Promise<string>) {
    try {
      await runTx({ connection, toast, action });
      await loadStreams();
    } catch {
      // runTx owns the toast message.
    }
  }

  async function loadDemoWallet() {
    const response = await fetch("/api/demo");
    const result = (await response.json()) as {
      publicKey?: string;
      error?: string;
    };

    if (!response.ok || result.error || !result.publicKey) {
      throw new Error(result.error ?? "Demo wallet is unavailable.");
    }

    setDemoPublicKey(new PublicKey(result.publicKey));
    return result.publicKey;
  }

  async function startDemoMode() {
    setIsStartingDemo(true);
    setStatus("");
    try {
      await loadDemoWallet();
      window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, DEMO_MODE_ENABLED_VALUE);
      setIsDemoMode(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start demo mode.");
    } finally {
      setIsStartingDemo(false);
    }
  }

  function exitDemoMode() {
    window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
    setIsDemoMode(false);
    setDemoPublicKey(null);
    setStreams([]);
    setMintDecimals({});
  }

  async function runDemoAction(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { signature?: string; error?: string };

    if (!response.ok || result.error || !result.signature) {
      throw new Error(result.error ?? "Demo transaction failed.");
    }

    return result.signature;
  }

  const cancelAmount = cancelTarget
    ? cancelTarget.account.amountTotal.sub(calculateVested(cancelTarget.account, nowSec))
    : null;
  const cancelDecimals = cancelTarget
    ? mintDecimals[cancelTarget.account.mint.toBase58()]
    : undefined;
  const cluster = getConfiguredCluster();
  const activePublicKey = isDemoMode ? demoPublicKey : wallet.publicKey;

  useEffect(() => {
    if (!isDemoMode || demoPublicKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadDemoWallet();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [demoPublicKey, isDemoMode]);

  return (
    <main className="min-h-screen bg-brand-bg px-6 py-8">
      <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-bold text-primary transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Agreements</h1>
            <span className="rounded-full border border-border bg-card/72 px-2 py-0.5 text-xs font-bold text-foreground backdrop-blur">
              {cluster.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all your active token distribution agreements.
          </p>
        </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/streams/create"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              New agreement
            </Link>
            <ConnectButton />
          </div>
        </header>

      {isDemoMode ? (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-foreground">Demo mode</p>
            <p className="mt-1 text-muted-foreground">
              Transactions are signed by Vestra&apos;s configured devnet demo wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={exitDemoMode}
            className="min-h-10 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Exit demo
          </button>
        </div>
      ) : null}

      {!hasMounted ? null : !wallet.connected && !isDemoMode ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/82 px-6 py-16 text-center backdrop-blur">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Try Vestra</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create and manage a devnet agreement without connecting a wallet, or connect your own wallet to test the real user flow.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void startDemoMode()}
              disabled={isStartingDemo}
              className="min-h-10 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35"
            >
              {isStartingDemo ? "Starting..." : "Try demo without wallet"}
            </button>
            <ConnectButton />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card/82 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading agreements..."
                : `${streams.length} agreement${streams.length !== 1 ? "s" : ""} found`}
            </p>
            <button
              onClick={() => void loadStreams()}
              disabled={isLoading}
              className="min-h-10 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
            >
              Refresh
            </button>
          </div>

          {status ? (
            <p className="mb-5 rounded-md border border-border bg-card/82 px-4 py-3 text-sm font-medium text-foreground backdrop-blur">
              {status}
            </p>
          ) : null}

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-card/70" aria-hidden="true" />
              ))}
            </div>
          ) : streams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/82 px-6 py-16 text-center backdrop-blur">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">No agreements yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                You have no active distribution agreements. Create one to start automating token payouts.
              </p>
              <Link
                href="/streams/create"
                className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create your first agreement
              </Link>
            </div>
          ) : (
            <section className="grid gap-4">
              {streams.map((stream) => {
                const decimals = mintDecimals[stream.account.mint.toBase58()];
                const hasDecimals = typeof decimals === "number";
                const vested = calculateVested(stream.account, nowSec);
                const claimable = calculateClaimable(stream.account, nowSec);
                const statusValue = deriveStatus(stream.account, nowSec);
                const isFullyVested = vested.gte(stream.account.amountTotal);
                const claimedPercent = stream.account.amountTotal.isZero()
                  ? 0
                  : Math.min(
                      100,
                      Number(
                        stream.account.amountClaimed
                          .muln(10_000)
                          .div(stream.account.amountTotal)
                          .toString()
                      ) / 100
                    );
                const isCreator = activePublicKey?.equals(stream.account.creator);
                const isRecipient = activePublicKey?.equals(stream.account.recipient);

                return (
                  <article key={stream.publicKey.toBase58()} className="rounded-lg border border-border bg-card/86 p-5 backdrop-blur">
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs font-bold text-foreground">
                            {streamTypeLabel(stream.account.streamType)}
                          </span>
                          <StatusPill status={statusValue} />
                          {isCreator ? (
                            <span className="rounded-full border border-primary/20 bg-primary/12 px-3 py-1 text-xs font-bold text-foreground">
                              Sender
                            </span>
                          ) : null}
                          {isRecipient ? (
                            <span className="rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs font-bold text-foreground">
                              Recipient
                            </span>
                          ) : null}
                        </div>

                        <div className="grid gap-1 text-sm">
                          <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                            <span className="text-muted-foreground">Agreement</span>
                            <Address address={stream.publicKey.toBase58()} chars={6} />
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                            <span className="text-muted-foreground">Mint</span>
                            <Address address={stream.account.mint.toBase58()} />
                          </div>
                        </div>

                        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <Info label="Total" value={formatAmountOrUnknown(stream.account.amountTotal, decimals)} />
                          <Info label="Unlocked" value={formatAmountOrUnknown(vested, decimals)} />
                          <Info label="Claimed" value={formatAmountOrUnknown(stream.account.amountClaimed, decimals)} />
                          <Info label="Claimable now" value={formatAmountOrUnknown(claimable, decimals)} />
                          <Info label="Start" value={formatDate(stream.account.startTime)} />
                          <Info label="End" value={formatDate(stream.account.endTime)} />
                          <Info
                            label="Time remaining"
                            value={formatTimeRemaining(
                              stream.account.endTime.toNumber(),
                              nowSec,
                              statusValue === "Pending"
                                ? Math.max(
                                    stream.account.startTime.toNumber(),
                                    stream.account.cliffTime.toNumber()
                                  )
                                : undefined
                            )}
                          />
                        </dl>

                        <div className="mt-5">
                          <div className="h-3 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-3 rounded-full bg-brand-accent transition-[width] duration-600"
                              style={{ width: `${claimedPercent}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {claimedPercent.toFixed(1)}% claimed
                          </p>
                          {!hasDecimals ? (
                            <p className="mt-1 text-xs text-destructive">
                              Token decimals unavailable. Amounts are hidden until the mint can be loaded.
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex min-w-48 flex-col gap-2">
                        <button
                          onClick={() =>
                            void runStreamTx(() =>
                              isDemoMode
                                ? runDemoAction("/api/demo/withdraw", {
                                    streamData: stream.publicKey.toBase58(),
                                  })
                                : withdrawTx(connection, wallet, stream)
                            )
                          }
                          disabled={!isRecipient || stream.account.isCancelled || claimable.isZero()}
                          className="min-h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35"
                        >
                          Claim tokens
                        </button>
                        <button
                          onClick={() => setCancelTarget(stream)}
                          disabled={
                            !isCreator ||
                            stream.account.isCancelled ||
                            !stream.account.isCancelable ||
                            isFullyVested
                          }
                          title={
                            isFullyVested
                              ? "Cancellation is unavailable because this stream is fully vested."
                              : undefined
                          }
                          className="min-h-10 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {stream.account.milestones.length > 0 ? (
                      <div className="mt-5 border-t border-border pt-4">
                        <p className="mb-3 font-display text-sm font-bold tracking-tight text-foreground">Milestones</p>
                        <div className="grid gap-2">
                          {stream.account.milestones.map((milestone, index) => (
                            <div key={`${stream.publicKey.toBase58()}-${index}`} className="flex flex-col gap-3 rounded-md border border-border bg-secondary/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-sm">
                                <p className="font-medium text-foreground">
                                  #{index + 1} - {formatAmountOrUnknown(milestone.amount, decimals)} tokens
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {milestone.isVerified ? "Verified" : "Waiting for verifier"}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  void runStreamTx(() =>
                                    isDemoMode
                                      ? runDemoAction("/api/demo/verify-milestone", {
                                          streamData: stream.publicKey.toBase58(),
                                          milestoneIndex: index,
                                        })
                                      : verifyMilestoneTx(connection, wallet, stream, index)
                                  )
                                }
                                disabled={milestone.isVerified || !activePublicKey?.equals(milestone.verifier)}
                                className="min-h-10 rounded-md border border-border bg-card/70 px-3 text-sm font-bold text-foreground transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
                              >
                                Verify
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel agreement?"
        body={
          cancelTarget && cancelAmount
            ? formatCancelBody(cancelAmount, cancelDecimals)
            : ""
        }
        confirmLabel="Cancel agreement"
        confirmTone="danger"
        onConfirm={() => {
          const target = cancelTarget;
          setCancelTarget(null);
          if (target) {
            void runStreamTx(() =>
              isDemoMode
                ? runDemoAction("/api/demo/cancel", {
                    streamData: target.publicKey.toBase58(),
                  })
                : cancelTx(connection, wallet, target)
            );
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />
      </div>
    </main>
  );
}

function formatAmountOrUnknown(
  value: Parameters<typeof formatUiAmount>[0],
  decimals: number | null | undefined
) {
  return typeof decimals === "number" ? formatUiAmount(value, decimals) : "-";
}

function formatCancelBody(
  unreleasedAmount: Parameters<typeof formatUiAmount>[0],
  decimals: number | null | undefined
) {
  const unreleasedText =
    typeof decimals === "number"
      ? `roughly ${formatUiAmount(unreleasedAmount, decimals)} unreleased tokens`
      : "the unreleased tokens";

  return `This returns ${unreleasedText} to the sender, transfers any vested-but-unclaimed tokens to the recipient, and stops future vesting.`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
