"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { ConnectButton } from "@/components/ConnectButton";
import { useToast } from "@/components/ToastProvider";
import { useVestraWallet } from "@/hooks/useVestraWallet";

import { FormTour, type TourStep } from "@/components/FormTour";
import { TokenSearch } from "@/components/TokenSearch";
import {
  DEMO_MODE_STORAGE_KEY,
  parseDemoModeValue,
} from "@/lib/demoMode";
import { friendlyError } from "@/lib/errors";
import { fetchMintDecimals, toBaseUnits } from "@/lib/mint";
import {
  getConfiguredCluster,
  getExplorerAddressUrl,
  getExplorerTxUrl,
} from "@/lib/network";
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
import { runTx } from "@/lib/txRunner";

const initialForm: CreateStreamInput = {
  streamId: "",
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

function generateStreamId(): string {
  return Date.now().toString();
}

function shortenSignature(signature: string): string {
  if (signature.length <= 20) {
    return signature;
  }

  return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
}

type FormErrors = Partial<
  Record<"recipient" | "mint" | "amount" | "startDate" | "cliffDate" | "endDate", string>
>;

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function validateForm(form: CreateStreamInput): FormErrors {
  const errors: FormErrors = {};
  const amount = Number(form.amount.replaceAll(",", ""));
  const start = new Date(form.startDate).getTime();
  const cliff = form.cliffDate ? new Date(form.cliffDate).getTime() : null;
  const end = new Date(form.endDate).getTime();

  if (!isValidPublicKey(form.recipient)) {
    errors.recipient = "Enter a valid Solana wallet address.";
  }
  if (!isValidPublicKey(form.mint)) {
    errors.mint = "Enter a valid token mint address.";
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be greater than 0.";
  }
  if (!Number.isFinite(start)) {
    errors.startDate = "Choose a valid start date.";
  }
  if (!Number.isFinite(end)) {
    errors.endDate = "Choose a valid end date.";
  } else if (Number.isFinite(start) && end <= start) {
    errors.endDate = "End date must be after the start date.";
  }
  if (cliff !== null) {
    if (!Number.isFinite(cliff)) {
      errors.cliffDate = "Choose a valid lock date.";
    } else if (Number.isFinite(start) && cliff < start) {
      errors.cliffDate = "Lock date must be on or after the start date.";
    } else if (Number.isFinite(end) && cliff > end) {
      errors.cliffDate = "Lock date must be on or before the end date.";
    }
  }

  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export default function CreateStreamPage() {
  const wallet = useVestraWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [form, setForm] = useState<CreateStreamInput>(initialForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");
  const [statusTxSignature, setStatusTxSignature] = useState("");
  const [hasCopiedSignature, setHasCopiedSignature] = useState(false);
  const [lastCreatedAgreementId, setLastCreatedAgreementId] = useState("");
  const [hasCopiedAgreementId, setHasCopiedAgreementId] = useState(false);
  const [hasCopiedMockMint, setHasCopiedMockMint] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaimingSol, setIsClaimingSol] = useState(false);
  const [isLoadingSolBalance, setIsLoadingSolBalance] = useState(false);
  const [isMintingMock, setIsMintingMock] = useState(false);
  const [isLoadingMockBalance, setIsLoadingMockBalance] = useState(false);
  const [mockBalance, setMockBalance] = useState<MockTokenBalance | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPublicKey, setDemoPublicKey] = useState("");
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
    const errors = validateForm(form);
    setFormErrors(errors);
    if (hasErrors(errors)) {
      return;
    }

    setForm((value) => ({ ...value, streamId: generateStreamId() }));
    setStatus("");
    setStatusTxSignature("");
    setHasCopiedSignature(false);
    setLastCreatedAgreementId("");
    setHasCopiedAgreementId(false);
    setIsError(false);
    setIsReviewing(true);
  }

  async function loadDemoWallet() {
    const response = await fetch("/api/demo");
    const result = (await response.json()) as {
      publicKey?: string;
      mockMint?: string;
      error?: string;
    };

    if (!response.ok || result.error || !result.publicKey || !result.mockMint) {
      throw new Error(result.error ?? "Demo wallet is unavailable.");
    }

    setDemoPublicKey(result.publicKey);
    setForm((value) => ({
      ...value,
      recipient: value.recipient || result.publicKey || "",
      mint: value.mint || result.mockMint || "",
      amount: value.amount || "1000",
    }));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const active = parseDemoModeValue(
        window.localStorage.getItem(DEMO_MODE_STORAGE_KEY)
      );
      setIsDemoMode(active);
      if (active) {
        void loadDemoWallet();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadMockBalance = useCallback(async () => {
    const owner = isDemoMode && demoPublicKey
      ? new PublicKey(demoPublicKey)
      : wallet.publicKey;

    if (!owner) {
      setMockBalance({
        mockMint: MOCK_MINT,
        tokenAccount: MOCK_MINT,
        amount: "0",
        error: undefined,
      });
      return;
    }

    setIsLoadingMockBalance(true);
    try {
      setMockBalance(await fetchMockTokenBalance(connection, owner));
    } finally {
      setIsLoadingMockBalance(false);
    }
  }, [connection, demoPublicKey, isDemoMode, wallet.publicKey]);

  const loadSolBalance = useCallback(async () => {
    if (!wallet.publicKey) {
      setSolBalance(null);
      return;
    }

    setIsLoadingSolBalance(true);
    try {
      const lamports = await connection.getBalance(wallet.publicKey);
      setSolBalance(lamports / LAMPORTS_PER_SOL);
    } finally {
      setIsLoadingSolBalance(false);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMockBalance();
      void loadSolBalance();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMockBalance, loadSolBalance]);

  async function confirmAndSubmit() {
    setIsSubmitting(true);
    setIsError(false);
    setStatusTxSignature("");
    setHasCopiedSignature(false);
    setLastCreatedAgreementId("");
    setHasCopiedAgreementId(false);
    setStatus("");

    try {
      const agreementId = form.streamId;
      const mint = new PublicKey(form.mint);
      let decimals: number;
      try {
        decimals = await fetchMintDecimals(connection, mint);
      } catch {
        if (isDemoMode && mint.equals(MOCK_MINT)) {
          decimals = 0;
        } else {
        throw new Error(
          `Token not found on ${getConfiguredCluster().label.toLowerCase()} - check the address.`
        );
        }
      }

      const baseUnitAmount = toBaseUnits(form.amount, decimals);
      const payload = {
        ...form,
        amount: baseUnitAmount.toString(),
      };
      const signature = isDemoMode
        ? await runTx({
            connection,
            toast,
            action: async () => {
              const response = await fetch("/api/demo/create-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const result = (await response.json()) as {
                signature?: string;
                error?: string;
              };

              if (!response.ok || result.error || !result.signature) {
                throw new Error(result.error ?? "Demo agreement failed.");
              }

              return result.signature;
            },
          })
        : await runTx({
            connection,
            toast,
            action: () => createStreamTx(connection, wallet, payload),
          });
      setStatus("Agreement created.");
      setStatusTxSignature(signature);
      setLastCreatedAgreementId(agreementId);
      setIsError(false);
      setForm(initialForm);
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
    setLastCreatedAgreementId("");
    setHasCopiedAgreementId(false);
    setStatus("Minting mock tokens...");

    try {
      let mockMint = MOCK_MINT;
      const signature = await runTx({
        connection,
        toast,
        action: async () => {
          if (isDemoMode) {
            const response = await fetch("/api/demo/mint-mock", {
              method: "POST",
            });
            const result = (await response.json()) as {
              signature?: string;
              mockMint?: string;
              error?: string;
            };

            if (!response.ok || result.error || !result.signature || !result.mockMint) {
              throw new Error(result.error ?? "Demo mint failed.");
            }

            mockMint = new PublicKey(result.mockMint);
            return result.signature;
          }

          const result = await mintMockTokensTx(connection, wallet);
          mockMint = result.mockMint;
          return result.signature;
        },
      });
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

  function exitDemoMode() {
    window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
    setIsDemoMode(false);
    setDemoPublicKey("");
  }

  async function handleClaimDevnetSol() {
    if (!wallet.publicKey) {
      return;
    }

    setIsClaimingSol(true);
    setIsError(false);
    setStatusTxSignature("");
    setHasCopiedSignature(false);
    setLastCreatedAgreementId("");
    setHasCopiedAgreementId(false);
    setStatus("Requesting devnet SOL...");

    try {
      const response = await fetch("/api/devnet-faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: wallet.publicKey.toBase58() }),
      });
      const result = (await response.json()) as {
        signature?: string;
        skipped?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Faucet request failed.");
      }

      if (result.skipped) {
        setStatus(result.message ?? "Wallet already has enough devnet SOL.");
        setStatusTxSignature("");
      } else {
        setStatus("Devnet SOL added.");
        setStatusTxSignature(result.signature ?? "");
        if (result.signature) {
          toast("success", "Devnet SOL added - view on Explorer", {
            href: getExplorerTxUrl(result.signature),
          });
        }
      }

      setIsError(false);
      await loadSolBalance();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Faucet request failed.";
      setStatus(friendlyError(raw));
      setStatusTxSignature("");
      setIsError(true);
    } finally {
      setIsClaimingSol(false);
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

  async function copyAgreementId() {
    if (!lastCreatedAgreementId) {
      return;
    }

    await navigator.clipboard.writeText(lastCreatedAgreementId);
    setHasCopiedAgreementId(true);
    window.setTimeout(() => setHasCopiedAgreementId(false), 1800);
  }

  async function copyMockMintAddress() {
    const mintAddress = (mockBalance?.mockMint ?? MOCK_MINT).toBase58();
    await navigator.clipboard.writeText(mintAddress);
    setHasCopiedMockMint(true);
    window.setTimeout(() => setHasCopiedMockMint(false), 1800);
  }

  return (
    <main className="min-h-screen bg-brand-bg px-6 py-8">
      <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
                className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-bold text-primary transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              className="inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-bold text-primary transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            New distribution agreement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up automated token payments. Choose who receives them, how much, and when.
          </p>
          <button
            type="button"
            onClick={() => setTourActive(true)}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-primary/30 bg-card/72 px-3 text-xs font-bold text-primary backdrop-blur transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            How to use this form?
          </button>
        </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {isDemoMode ? (
              <button
                type="button"
                onClick={exitDemoMode}
                className="min-h-10 rounded-md border border-primary/30 bg-primary/10 px-4 text-sm font-bold text-foreground transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Exit demo
              </button>
            ) : (
              <ConnectButton />
            )}
          </div>
      </header>

      {isDemoMode ? (
        <div className="mb-5 rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm backdrop-blur">
          <p className="font-bold text-foreground">Demo mode</p>
          <p className="mt-1 text-muted-foreground">
            This form uses Vestra&apos;s configured devnet wallet. Recipient and mock token are filled automatically so you can test without connecting a wallet.
          </p>
          {demoPublicKey ? (
            <p className="mt-2 break-all font-mono text-xs text-foreground">
              Demo wallet: {demoPublicKey}
            </p>
          ) : null}
        </div>
      ) : null}

      {tourActive ? (
        <FormTour steps={tourSteps} onDone={() => setTourActive(false)} />
      ) : null}

      {status ? (
        <div
          role="alert"
          className={`mb-5 flex min-w-0 gap-3 rounded-md border px-4 py-3 text-sm backdrop-blur ${
            isError
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border bg-card/82 text-foreground"
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
            {lastCreatedAgreementId ? (
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 truncate rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-xs text-muted-foreground">
                  <span className="font-sans font-medium text-foreground">Agreement ID: </span>
                  {lastCreatedAgreementId}
                </p>
                <button
                  type="button"
                  onClick={() => void copyAgreementId()}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border border-border bg-card/70 px-3 text-xs font-bold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {hasCopiedAgreementId ? "Copied" : "Copy ID"}
                </button>
              </div>
            ) : null}
            {statusTxSignature ? (
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 truncate rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-xs text-muted-foreground">
                  <span className="font-sans font-medium text-foreground">Tx: </span>
                  {shortenSignature(statusTxSignature)}
                </p>
                <button
                  type="button"
                  onClick={() => void copyStatusTxSignature()}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border border-border bg-card/70 px-3 text-xs font-bold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {hasCopiedSignature ? "Copied" : "Copy tx"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isReviewing ? (
        <div className="grid gap-5 rounded-lg border border-border bg-card/86 p-5 backdrop-blur">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Review before sending</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the details below. Once confirmed, this agreement will be recorded on the blockchain and cannot be undone without cancellation.
            </p>
          </div>

          <dl className="grid gap-4 rounded-md border border-border bg-secondary/45 p-4 text-sm sm:grid-cols-2">
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
              className="min-h-10 rounded-md border border-border bg-card/70 px-5 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
            >
              Back to edit
            </button>
            <button
              type="button"
              onClick={() => void confirmAndSubmit()}
              disabled={(!wallet.connected && !isDemoMode) || isSubmitting}
              className="min-h-10 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35"
            >
              {isSubmitting ? "Sending..." : "Confirm and send"}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleReview}
          className="grid gap-5 rounded-lg border border-border bg-card/86 p-5 backdrop-blur"
        >
          <details className="group rounded-md border border-border bg-secondary/45">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-muted-foreground select-none hover:text-foreground">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Devnet testing tools
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-sm font-bold tracking-tight text-foreground">Mock token</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mint demo tokens to your wallet for testing on devnet.
                </p>
                <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt>Wallet</dt>
                    <dd className="mt-0.5 truncate font-mono text-[11px] font-semibold text-foreground">
                      {isDemoMode
                        ? demoPublicKey || "Loading demo wallet"
                        : wallet.publicKey?.toBase58() ?? "Connect wallet"}
                    </dd>
                  </div>
                  <div>
                    <dt>SOL balance</dt>
                    <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                      {isDemoMode
                        ? "Managed by demo wallet"
                        : !wallet.connected
                          ? "Connect wallet"
                          : isLoadingSolBalance
                            ? "Loading..."
                            : solBalance === null
                              ? "Unavailable"
                              : solBalance.toFixed(4) + " SOL"}
                    </dd>
                  </div>
                  <div>
                    <dt>Balance</dt>
                    <dd className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                      {!wallet.connected && !isDemoMode
                        ? "Connect wallet"
                        : isLoadingMockBalance
                          ? "Loading..."
                          : mockBalance?.error
                            ? "Unavailable"
                          : `${mockBalance?.amount ?? "0"} tokens`}
                    </dd>
                    {mockBalance?.error ? (
                      <dd className="mt-1 max-w-xs text-[11px] leading-4 text-destructive">
                        {mockBalance.error}
                      </dd>
                    ) : null}
                  </div>
                  <div>
                    <dt>Mock mint</dt>
                    <dd className="mt-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-card/70 px-2 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
                        {mockBalance?.mockMint.toBase58() ?? MOCK_MINT.toBase58()}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyMockMintAddress()}
                        className="min-h-8 shrink-0 rounded-md border border-border bg-secondary/70 px-2 text-xs font-bold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {hasCopiedMockMint ? "Copied" : "Copy"}
                      </button>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt>Token account</dt>
                    <dd className="mt-1">
                      {!wallet.connected && !isDemoMode ? (
                        <span className="text-xs text-muted-foreground">Connect wallet</span>
                      ) : mockBalance?.tokenAccount ? (
                        <a
                          href={getExplorerAddressUrl(mockBalance.tokenAccount.toBase58())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-8 items-center justify-center rounded-md border border-border bg-card/70 px-3 text-xs font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          View on Explorer
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Loading...</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-40">
                <button
                  type="button"
                  onClick={() => void handleClaimDevnetSol()}
                  disabled={isDemoMode || !wallet.connected || isClaimingSol}
                  className="min-h-10 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
                >
                  {isClaimingSol ? "Claiming..." : "Mint SOL"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void loadSolBalance();
                    void loadMockBalance();
                  }}
                  disabled={
                    (!wallet.connected && !isDemoMode) ||
                    isLoadingMockBalance ||
                    isLoadingSolBalance
                  }
                  className="min-h-10 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
                >
                  {isLoadingMockBalance || isLoadingSolBalance
                    ? "Checking..."
                    : "Check balance"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleMintMockTokens()}
                  disabled={(!wallet.connected && !isDemoMode) || isMintingMock}
                  className="min-h-10 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-foreground/35"
                >
                  {isMintingMock ? "Minting..." : "Mint mock tokens"}
                </button>
              </div>
            </div>
          </details>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Recipient wallet"
              hint="The wallet address that will receive the tokens."
              fieldId="field-recipient"
              error={formErrors.recipient}
            >
              <input
                id="field-recipient"
                required
                value={form.recipient}
                onChange={(event) => {
                  setForm((value) => ({ ...value, recipient: event.target.value }));
                  setFormErrors((value) => ({ ...value, recipient: undefined }));
                }}
                className={`w-full rounded-md border bg-secondary/45 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  formErrors.recipient ? "border-destructive" : "border-border"
                }`}
                placeholder="Recipient's wallet address"
                autoComplete="off"
              />
            </Field>

            <Field
              label="Token"
              hint="Search by name or ticker, or paste a custom contract address."
              fieldId="field-token"
            >
              <div id="field-token">
                <TokenSearch
                  key={form.streamId}
                  value={form.mint}
                  onChange={(mint) => {
                    setForm((value) => ({ ...value, mint }));
                    setFormErrors((value) => ({ ...value, mint: undefined }));
                  }}
                  error={formErrors.mint}
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

            <Field
              label="Amount"
              hint="Total number of tokens to lock into this agreement."
              fieldId="field-amount"
              error={formErrors.amount}
            >
              <input
                id="field-amount"
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => {
                  setForm((value) => ({ ...value, amount: event.target.value }));
                  setFormErrors((value) => ({ ...value, amount: undefined }));
                }}
                className={`w-full rounded-md border bg-secondary/45 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  formErrors.amount ? "border-destructive" : "border-border"
                }`}
                placeholder="Number of tokens (e.g. 1000)"
              />
            </Field>

            <Field
              label="Start date"
              hint="When the payout schedule begins."
              fieldId="field-start"
              error={formErrors.startDate}
            >
              <input
                id="field-start"
                required
                type="datetime-local"
                value={form.startDate}
                onChange={(event) => {
                  setForm((value) => ({ ...value, startDate: event.target.value }));
                  setFormErrors((value) => ({ ...value, startDate: undefined }));
                }}
                className={`w-full rounded-md border bg-secondary/45 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  formErrors.startDate ? "border-destructive" : "border-border"
                }`}
              />
            </Field>

            <Field
              label="Lock until (optional)"
              hint="Tokens are locked and cannot be claimed before this date. Leave blank for no lock period."
              fieldId="field-cliff"
              error={formErrors.cliffDate}
            >
              <input
                id="field-cliff"
                type="datetime-local"
                value={form.cliffDate}
                onChange={(event) => {
                  setForm((value) => ({ ...value, cliffDate: event.target.value }));
                  setFormErrors((value) => ({ ...value, cliffDate: undefined }));
                }}
                className={`w-full rounded-md border bg-secondary/45 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  formErrors.cliffDate ? "border-destructive" : "border-border"
                }`}
              />
            </Field>

            <Field
              label="End date"
              hint="When the last payout occurs."
              fieldId="field-end"
              error={formErrors.endDate}
            >
              <input
                id="field-end"
                required
                type="datetime-local"
                value={form.endDate}
                onChange={(event) => {
                  setForm((value) => ({ ...value, endDate: event.target.value }));
                  setFormErrors((value) => ({ ...value, endDate: undefined }));
                }}
                className={`w-full rounded-md border bg-secondary/45 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  formErrors.endDate ? "border-destructive" : "border-border"
                }`}
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
                className="w-full rounded-md border border-border bg-secondary/45 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              {!wallet.connected && !isDemoMode ? "Connect your wallet to continue." : ""}
            </p>
            <button
              type="submit"
              disabled={!wallet.connected && !isDemoMode}
              className="min-h-10 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-foreground/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Review agreement
            </button>
          </div>
        </form>
      )}
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  fieldId,
  error,
  children,
}: {
  label: string;
  hint?: string;
  fieldId?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-bold text-foreground/80">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-all text-sm font-bold text-foreground${mono ? " font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
