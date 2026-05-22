"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import {
  cancelTx,
  fetchWalletStreams,
  formatDate,
  formatTokenAmount,
  streamTypeLabel,
  verifyMilestoneTx,
  withdrawTx,
  type StreamAccount,
} from "@/lib/tokenDistribution";

export default function StreamsPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [streams, setStreams] = useState<StreamAccount[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function fetchStreams() {
      await Promise.resolve();
      if (!isCurrent) {
        return;
      }

      if (!wallet.connected) {
        setStreams([]);
        return;
      }

      setIsLoading(true);
      try {
        const walletStreams = await fetchWalletStreams(connection, wallet);
        if (isCurrent) {
          setStreams(walletStreams);
          setStatus("");
        }
      } catch (error) {
        if (isCurrent) {
          setStatus(error instanceof Error ? error.message : "Could not load agreements.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void fetchStreams();

    return () => {
      isCurrent = false;
    };
  }, [connection, wallet]);

  const loadStreams = useCallback(async () => {
    if (!wallet.connected) {
      setStreams([]);
      return;
    }

    setIsLoading(true);
    try {
      setStreams(await fetchWalletStreams(connection, wallet));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load agreements.");
    } finally {
      setIsLoading(false);
    }
  }, [connection, wallet]);

  async function runAction(action: () => Promise<string>) {
    setStatus("Waiting for wallet approval...");
    try {
      const signature = await action();
      setStatus(`Transaction confirmed: ${signature}`);
      await loadStreams();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Transaction failed.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-semibold text-primary transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-foreground">Agreements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all your active token distribution agreements.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/streams/create"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            New agreement
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      {!wallet.connected ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
              aria-hidden="true"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Connect your wallet to continue</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Connect your Solana wallet to view and manage your token distribution agreements.
          </p>
          <div className="mt-6">
            <WalletMultiButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            New to crypto wallets?{" "}
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Get Phantom
            </a>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading agreements..."
                : `${streams.length} agreement${streams.length !== 1 ? "s" : ""} found`}
            </p>
            <button
              onClick={() => void loadStreams()}
              disabled={isLoading}
              className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
            >
              Refresh
            </button>
          </div>

          {status ? (
            <p className="mb-5 rounded-md border border-border bg-secondary/70 px-4 py-3 text-sm text-foreground">
              {status}
            </p>
          ) : null}

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-lg border border-border bg-card"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : streams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">No agreements yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                You have no active distribution agreements. Create one to start automating token payouts.
              </p>
              <Link
                href="/streams/create"
                className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Create your first agreement
              </Link>
            </div>
          ) : (
            <section className="grid gap-4">
              {streams.map((stream) => {
                const isCreator = wallet.publicKey?.equals(stream.account.creator);
                const isRecipient = wallet.publicKey?.equals(stream.account.recipient);

                return (
                  <article
                    key={stream.publicKey.toBase58()}
                    className="rounded-lg border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                            {streamTypeLabel(stream.account.streamType)}
                          </span>
                          {stream.account.isCancelled ? (
                            <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground">
                              Cancelled
                            </span>
                          ) : null}
                          {isCreator ? (
                            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-foreground">
                              Sender
                            </span>
                          ) : null}
                          {isRecipient ? (
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                              Recipient
                            </span>
                          ) : null}
                        </div>

                        <h2 className="font-mono text-sm font-semibold text-foreground">
                          {stream.publicKey.toBase58()}
                        </h2>

                        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <Info label="Total" value={formatTokenAmount(stream.account.amountTotal)} />
                          <Info label="Claimed" value={formatTokenAmount(stream.account.amountClaimed)} />
                          <Info label="Start" value={formatDate(stream.account.startTime)} />
                          <Info label="End" value={formatDate(stream.account.endTime)} />
                        </dl>
                      </div>

                      <div className="flex min-w-48 flex-col gap-2">
                        <button
                          onClick={() =>
                            void runAction(() => withdrawTx(connection, wallet, stream))
                          }
                          disabled={!isRecipient || stream.account.isCancelled}
                          className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35"
                        >
                          Claim tokens
                        </button>
                        <button
                          onClick={() =>
                            void runAction(() => cancelTx(connection, wallet, stream))
                          }
                          disabled={
                            !isCreator ||
                            stream.account.isCancelled ||
                            !stream.account.isCancelable
                          }
                          className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {stream.account.milestones.length > 0 ? (
                      <div className="mt-5 border-t border-border pt-4">
                        <p className="mb-3 text-sm font-semibold text-foreground">
                          Milestones
                        </p>
                        <div className="grid gap-2">
                          {stream.account.milestones.map((milestone, index) => (
                            <div
                              key={`${stream.publicKey.toBase58()}-${index}`}
                              className="flex flex-col gap-3 rounded-md bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="text-sm">
                                <p className="font-medium text-foreground">
                                  #{index + 1} - {formatTokenAmount(milestone.amount)} tokens
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {milestone.isVerified ? "Verified" : "Waiting for verifier"}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  void runAction(() =>
                                    verifyMilestoneTx(connection, wallet, stream, index)
                                  )
                                }
                                disabled={
                                  milestone.isVerified ||
                                  !wallet.publicKey?.equals(milestone.verifier)
                                }
                                className="min-h-10 rounded-md border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
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
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}
