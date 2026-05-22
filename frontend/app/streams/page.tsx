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
          setStatus(error instanceof Error ? error.message : "Could not load streams.");
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
      setStatus(error instanceof Error ? error.message : "Could not load streams.");
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
      <header className="mb-8 flex flex-col gap-4 border-b border-[#3ABEF9]/35 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md text-sm font-semibold text-[#3572EF] transition hover:text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
          >
            Back to landing
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-[#050C9C]">Streams</h1>
          <p className="mt-1 text-sm text-[#050C9C]/70">
            Manage streams where your wallet is the creator or recipient.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/streams/create"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#050C9C] px-4 text-center text-sm font-semibold text-white transition hover:bg-[#3572EF] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
          >
            Create stream
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-[#3ABEF9]/45 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#050C9C]/70">
          {wallet.connected
            ? isLoading
              ? "Loading streams..."
              : `${streams.length} stream(s) found`
            : "Connect wallet to load streams."}
        </p>
        <button
          onClick={() => void loadStreams()}
          disabled={!wallet.connected || isLoading}
          className="min-h-10 rounded-md border border-[#3ABEF9] px-4 text-sm font-semibold text-[#050C9C] transition hover:bg-[#A7E6FF]/30 focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#050C9C]/35"
        >
          Refresh
        </button>
      </div>

      {status ? (
        <p className="mb-5 rounded-md border border-[#3ABEF9]/45 bg-[#A7E6FF]/45 px-4 py-3 text-sm text-[#050C9C]">
          {status}
        </p>
      ) : null}

      <section className="grid gap-4">
        {streams.map((stream) => {
          const isCreator = wallet.publicKey?.equals(stream.account.creator);
          const isRecipient = wallet.publicKey?.equals(stream.account.recipient);

          return (
            <article
              key={stream.publicKey.toBase58()}
              className="rounded-lg border border-[#3ABEF9]/45 bg-white p-5 shadow-sm"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#A7E6FF]/60 px-3 py-1 text-xs font-medium text-[#050C9C]">
                      {streamTypeLabel(stream.account.streamType)}
                    </span>
                    {stream.account.isCancelled ? (
                      <span className="rounded-full bg-[#050C9C]/10 px-3 py-1 text-xs font-medium text-[#050C9C]">
                        Cancelled
                      </span>
                    ) : null}
                    {isCreator ? (
                      <span className="rounded-full bg-[#3ABEF9]/20 px-3 py-1 text-xs font-medium text-[#050C9C]">
                        Creator
                      </span>
                    ) : null}
                    {isRecipient ? (
                      <span className="rounded-full bg-[#A7E6FF] px-3 py-1 text-xs font-medium text-[#050C9C]">
                        Recipient
                      </span>
                    ) : null}
                  </div>

                  <h2 className="font-mono text-sm font-semibold text-[#050C9C]">
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
                    className="min-h-10 rounded-md bg-[#050C9C] px-4 text-sm font-semibold text-white transition hover:bg-[#3572EF] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#A7E6FF]"
                  >
                    Withdraw
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
                    className="min-h-10 rounded-md border border-[#3ABEF9] px-4 text-sm font-semibold text-[#050C9C] transition hover:bg-[#A7E6FF]/30 focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#050C9C]/35"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {stream.account.milestones.length > 0 ? (
                <div className="mt-5 border-t border-[#A7E6FF] pt-4">
                  <p className="mb-3 text-sm font-semibold text-[#050C9C]">
                    Milestones
                  </p>
                  <div className="grid gap-2">
                    {stream.account.milestones.map((milestone, index) => (
                      <div
                        key={`${stream.publicKey.toBase58()}-${index}`}
                        className="flex flex-col gap-3 rounded-md bg-[#A7E6FF]/25 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm">
                          <p className="font-medium text-[#050C9C]">
                            #{index + 1} - {formatTokenAmount(milestone.amount)} tokens
                          </p>
                          <p className="text-xs text-[#050C9C]/60">
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
                          className="min-h-10 rounded-md border border-[#3ABEF9] px-3 text-sm font-semibold text-[#050C9C] transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#050C9C]/35"
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
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[#050C9C]/55">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium text-[#050C9C]">{value}</dd>
    </div>
  );
}
