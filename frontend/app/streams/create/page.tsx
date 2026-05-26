"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { FormTour, type TourStep } from "@/components/FormTour";
import { TokenSearch } from "@/components/TokenSearch";
import {
  MOCK_TOKEN_MINT_AMOUNT,
  createStreamTx,
  fetchMockTokenBalance,
  getMockMintPda,
  mintMockTokensTx,
  type MockTokenBalance,
  type CreateStreamInput,
  type StreamType,
} from "@/lib/tokenDistribution";

const initialForm: CreateStreamInput = {
  streamId: Date.now().toString(),
  recipient: "",
  mint: "",
  amount: "",
  startDate: new Date().toISOString().slice(0, 16),
  cliffDate: "",
  endDate: "",
  streamType: 0,
  isCancelable: true,
};

const MOCK_MINT = getMockMintPda();

function shortenSignature(signature: string): string {
  if (signature.length <= 20) {
    return signature;
  }

  return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
}

function friendlyError(raw: string): string {
  if (/invalid public key/i.test(raw)) {
    return "One of the addresses you entered is not a valid wallet address. Check the Recipient wallet and Token contract address fields.";
  }
  if (/user rejected/i.test(raw) || /rejected/i.test(raw)) {
    return "You cancelled the transaction in your wallet. No tokens were moved.";
  }
  if (/insufficient/i.test(raw)) {
    return "Your wallet does not have enough tokens to fund this agreement.";
  }
  if (/fallback/i.test(raw) || /instruction.*not.*found/i.test(raw)) {
    return "Mint mock token is not available on the deployed program yet. Run pnpm run upgrade:devnet from contracts, then refresh this page.";
  }
  if (/Transaction failed/i.test(raw)) {
    return "The transaction did not go through. Check your inputs and try again.";
  }
  return raw;
}

export default function CreateStreamPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState<CreateStreamInput>(initialForm);
  const [status, setStatus] = useState("");
  const [statusTxSignature, setStatusTxSignature] = useState("");
  const [hasCopiedSignature, setHasCopiedSignature] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMintingMock, setIsMintingMock] = useState(false);
  const [isLoadingMockBalance, setIsLoadingMockBalance] = useState(false);
  const [mockBalance, setMockBalance] = useState<MockTokenBalance | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  const scheduleLabels: Record<number, string> = {
    0: "Even payouts over time",
    1: "Locked period, then even payouts",
    2: "Release when goals are completed",
  };

  const tourSteps: TourStep[] = [
    {
      fieldId: "field-recipient",
      label: "Recipient wallet",
      explanation: "The wallet address that will receive the tokens you are streaming.",
      example: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    },
    {
      fieldId: "field-token",
      label: "Token",
      explanation: "Search for the token you want to stream, or paste a custom contract address.",
      example: "USDC — USD Coin",
    },
    {
      fieldId: "field-amount",
      label: "Amount",
      explanation: "Total number of tokens to lock into this agreement. Recipients claim from this pool.",
      example: "1000",
    },
    {
      fieldId: "field-start",
      label: "Start date",
      explanation: "When the payout schedule begins. Recipients cannot claim before this date.",
      example: "2025-06-01T09:00",
    },
    {
      fieldId: "field-cliff",
      label: "Lock until (optional)",
      explanation: "Tokens are locked and cannot be claimed before this date. Leave blank for no lock period.",
      example: "2025-09-01T09:00",
    },
    {
      fieldId: "field-end",
      label: "End date",
      explanation: "When the last payout occurs. All remaining tokens are fully vested by this date.",
      example: "2026-06-01T09:00",
    },
    {
      fieldId: "field-schedule",
      label: "Payout schedule",
      explanation: "How tokens are released — evenly over time, after a lock period, or on milestone completion.",
      example: "Even payouts over time",
    },
    {
      fieldId: "field-cancelable",
      label: "Allow cancellation",
      explanation: "If enabled, you can cancel this agreement later and reclaim unreleased tokens.",
      example: "Checked — recommended for most agreements",
    },
  ];

  function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setStatusTxSignature("");
    setHasCopiedSignature(false);
    setIsError(false);
    setIsReviewing(true);
  }

  const loadMockBalance = useCallback(async () => {
    if (!wallet.publicKey) {
      setMockBalance({
        mockMint: MOCK_MINT,
        tokenAccount: MOCK_MINT,
        amount: "0",
      });
      return;
    }

    setIsLoadingMockBalance(true);
    try {
      setMockBalance(await fetchMockTokenBalance(connection, wallet.publicKey));
    } finally {
      setIsLoadingMockBalance(false);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadMockBalance(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMockBalance]);

  async function confirmAndSubmit() {
    setIsSubmitting(true);
    setIsError(false);
    setStatusTxSignature("");
    setHasCopiedSignature(false);
    setStatus("Preparing transaction...");

    try {
      const signature = await createStreamTx(connection, wallet, form);
      setStatus("Agreement created.");
      setStatusTxSignature(signature);
      setIsError(false);
      setForm({ ...initialForm, streamId: Date.now().toString() });
      setIsReviewing(false);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Transaction failed.";
      setStatus(friendlyError(raw));
      setStatusTxSignature("");
      setIsError(true);
      setIsReviewing(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMintMockTokens() {
    setIsMintingMock(true);
    setIsError(false);
    setStatusTxSignature("");
    setHasCopiedSignature(false);
    setStatus("Minting mock tokens...");

    try {
      const { signature, mockMint } = await mintMockTokensTx(connection, wallet);
      setForm((value) => ({
        ...value,
        mint: mockMint.toBase58(),
        amount: value.amount || "1000",
      }));
      setStatus(`Minted ${MOCK_TOKEN_MINT_AMOUNT} mock tokens. Mock mint filled in below.`);
      setStatusTxSignature(signature);
      setIsError(false);
      await loadMockBalance();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Transaction failed.";
      setStatus(friendlyError(raw));
      setStatusTxSignature("");
      setIsError(true);
    } finally {
      setIsMintingMock(false);
    }
  }

  async function copyStatusTxSignature() {
    if (!statusTxSignature) {
      return;
    }

    await navigator.clipboard.writeText(statusTxSignature);
    setHasCopiedSignature(true);
    window.setTimeout(() => setHasCopiedSignature(false), 1800);
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-4">
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
            <Link
              href="/streams"
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
              Back to Agreements
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-foreground">
            New distribution agreement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up automated token payments. Choose who receives them, how much, and when.
            {" "}
            <button
              type="button"
              onClick={() => setTourActive(true)}
              className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              How to use this form?
            </button>
          </p>
        </div>
        <WalletMultiButton />
      </header>

      {tourActive ? (
        <FormTour steps={tourSteps} onDone={() => setTourActive(false)} />
      ) : null}

      {status ? (
        <div
          role="alert"
          className={`mb-5 flex min-w-0 gap-3 rounded-md border px-4 py-3 text-sm ${
            isError
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border bg-secondary/70 text-foreground"
          }`}
        >
          {isError ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          ) : null}
          <div className="min-w-0 flex-1">
            <p>{status}</p>
            {statusTxSignature ? (
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 truncate rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                  <span className="font-sans font-medium text-foreground">Tx: </span>
                  {shortenSignature(statusTxSignature)}
                </p>
                <button
                  type="button"
                  onClick={() => void copyStatusTxSignature()}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {hasCopiedSignature ? "Copied" : "Copy tx"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isReviewing ? (
        <div className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Review before sending</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the details below. Once confirmed, this agreement will be recorded on the blockchain and cannot be undone without cancellation.
            </p>
          </div>

          <dl className="grid gap-4 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
            <ReviewRow label="Recipient wallet" value={form.recipient} mono />
            <ReviewRow label="Token contract" value={form.mint} mono />
            <ReviewRow label="Amount" value={`${form.amount} tokens`} />
            <ReviewRow label="Schedule" value={scheduleLabels[form.streamType] ?? ""} />
            <ReviewRow label="Start" value={form.startDate} />
            {form.cliffDate ? <ReviewRow label="Lock until" value={form.cliffDate} /> : null}
            <ReviewRow label="End" value={form.endDate} />
            <ReviewRow label="Cancellable" value={form.isCancelable ? "Yes" : "No"} />
          </dl>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsReviewing(false)}
              disabled={isSubmitting}
              className="min-h-10 rounded-md border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
            >
              Back to edit
            </button>
            <button
              type="button"
              onClick={() => void confirmAndSubmit()}
              disabled={!wallet.connected || isSubmitting}
              className="min-h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35"
            >
              {isSubmitting ? "Sending..." : "Confirm and send"}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleReview}
          className="grid gap-5 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Mock token for testing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mint demo tokens to your wallet and use them for this vesting agreement.
              </p>
              <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt>Mock balance</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {!wallet.connected
                      ? "Connect wallet"
                      : isLoadingMockBalance
                        ? "Loading..."
                        : `${mockBalance?.amount ?? "0"} tokens`}
                  </dd>
                </div>
                <div>
                  <dt>Mock mint</dt>
                  <dd className="mt-0.5 break-all font-mono text-[11px] text-foreground">
                    {mockBalance?.mockMint.toBase58() ?? MOCK_MINT.toBase58()}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>Token account</dt>
                  <dd className="mt-0.5 break-all font-mono text-[11px] text-foreground">
                    {wallet.connected
                      ? mockBalance?.tokenAccount.toBase58() ?? "Loading..."
                      : "Connect wallet"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-2 sm:min-w-40">
              <button
                type="button"
                onClick={() => void loadMockBalance()}
                disabled={!wallet.connected || isLoadingMockBalance}
                className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
              >
                {isLoadingMockBalance ? "Checking..." : "Check balance"}
              </button>
              <button
                type="button"
                onClick={() => void handleMintMockTokens()}
                disabled={!wallet.connected || isMintingMock}
                className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
              >
                {isMintingMock ? "Minting..." : "Mint mock tokens"}
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Recipient wallet" hint="The wallet address that will receive the tokens." fieldId="field-recipient">
              <input
                id="field-recipient"
                required
                value={form.recipient}
                onChange={(event) =>
                  setForm((value) => ({ ...value, recipient: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Recipient's wallet address"
                autoComplete="off"
              />
            </Field>

            <Field label="Token" hint="Search by name or ticker, or paste a custom contract address." fieldId="field-token">
              <div id="field-token">
                <TokenSearch
                  key={form.streamId}
                  value={form.mint}
                  onChange={(mint) =>
                    setForm((value) => ({ ...value, mint }))
                  }
                />
              </div>
              {/* hidden required input to enforce form validation */}
              <input
                tabIndex={-1}
                required
                value={form.mint}
                onChange={() => undefined}
                style={{ opacity: 0, height: 0, position: "absolute" }}
                aria-hidden="true"
              />
            </Field>

            <Field label="Amount" hint="Total number of tokens to lock into this agreement." fieldId="field-amount">
              <input
                id="field-amount"
                required
                inputMode="numeric"
                value={form.amount}
                onChange={(event) =>
                  setForm((value) => ({ ...value, amount: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Number of tokens (e.g. 1000)"
              />
            </Field>

            <Field label="Agreement ID" hint="A unique number to identify this agreement. Auto-generated.">
              <input
                required
                inputMode="numeric"
                value={form.streamId}
                onChange={(event) =>
                  setForm((value) => ({ ...value, streamId: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>

            <Field label="Start date" hint="When the payout schedule begins." fieldId="field-start">
              <input
                id="field-start"
                required
                type="datetime-local"
                value={form.startDate}
                onChange={(event) =>
                  setForm((value) => ({ ...value, startDate: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>

            <Field label="Lock until (optional)" hint="Tokens are locked and cannot be claimed before this date. Leave blank for no lock period." fieldId="field-cliff">
              <input
                id="field-cliff"
                type="datetime-local"
                value={form.cliffDate}
                onChange={(event) =>
                  setForm((value) => ({ ...value, cliffDate: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>

            <Field label="End date" hint="When the last payout occurs." fieldId="field-end">
              <input
                id="field-end"
                required
                type="datetime-local"
                value={form.endDate}
                onChange={(event) =>
                  setForm((value) => ({ ...value, endDate: event.target.value }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>

            <Field label="Payout schedule" hint="How tokens are released over time." fieldId="field-schedule">
              <select
                id="field-schedule"
                value={form.streamType}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    streamType: Number(event.target.value) as StreamType,
                  }))
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={0}>Even payouts over time</option>
                <option value={1}>Locked period, then even payouts</option>
                <option value={2}>Release when goals are completed</option>
              </select>
            </Field>
          </div>

          <label id="field-cancelable" className="flex cursor-pointer items-start gap-3 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={form.isCancelable}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  isCancelable: event.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <span>
              Allow cancellation of unreleased tokens
              <span className="mt-0.5 block text-xs text-muted-foreground">
                If enabled, you can cancel this agreement and reclaim any tokens that have not yet been claimed.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {!wallet.connected ? "Connect your wallet to continue." : ""}
            </p>
            <button
              type="submit"
              disabled={!wallet.connected}
              className="min-h-10 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Review agreement
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  hint,
  fieldId,
  children,
}: {
  label: string;
  hint?: string;
  fieldId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground/80">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-all text-sm font-medium text-foreground${mono ? " font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
