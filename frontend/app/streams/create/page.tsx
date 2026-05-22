"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { createStreamTx, type CreateStreamInput, type StreamType } from "@/lib/tokenDistribution";

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

export default function CreateStreamPage() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [form, setForm] = useState<CreateStreamInput>(initialForm);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("Preparing transaction...");

    try {
      const signature = await createStreamTx(connection, wallet, form);
      setStatus(`Stream created. Tx: ${signature}`);
      setForm({ ...initialForm, streamId: Date.now().toString() });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Transaction failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-[#3ABEF9]/35 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center rounded-md text-sm font-semibold text-[#3572EF] transition hover:text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              Back to landing
            </Link>
            <Link
              href="/streams"
              className="inline-flex min-h-10 items-center rounded-md text-sm font-semibold text-[#3572EF] transition hover:text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              Back to streams
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-[#050C9C]">
            Create stream
          </h1>
          <p className="mt-1 text-sm text-[#050C9C]/70">
            Lock SPL tokens and define when the recipient can withdraw.
          </p>
        </div>
        <WalletMultiButton />
      </header>

      <form
        onSubmit={submit}
        className="grid gap-5 rounded-lg border border-[#3ABEF9]/45 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Recipient wallet">
            <input
              required
              value={form.recipient}
              onChange={(event) =>
                setForm((value) => ({ ...value, recipient: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
              placeholder="Recipient public key"
            />
          </Field>

          <Field label="Token mint">
            <input
              required
              value={form.mint}
              onChange={(event) =>
                setForm((value) => ({ ...value, mint: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
              placeholder="SPL mint address"
            />
          </Field>

          <Field label="Amount">
            <input
              required
              inputMode="numeric"
              value={form.amount}
              onChange={(event) =>
                setForm((value) => ({ ...value, amount: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
              placeholder="Raw token units"
            />
          </Field>

          <Field label="Stream ID">
            <input
              required
              inputMode="numeric"
              value={form.streamId}
              onChange={(event) =>
                setForm((value) => ({ ...value, streamId: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
            />
          </Field>

          <Field label="Start">
            <input
              required
              type="datetime-local"
              value={form.startDate}
              onChange={(event) =>
                setForm((value) => ({ ...value, startDate: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
            />
          </Field>

          <Field label="Cliff">
            <input
              type="datetime-local"
              value={form.cliffDate}
              onChange={(event) =>
                setForm((value) => ({ ...value, cliffDate: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
            />
          </Field>

          <Field label="End">
            <input
              required
              type="datetime-local"
              value={form.endDate}
              onChange={(event) =>
                setForm((value) => ({ ...value, endDate: event.target.value }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
            />
          </Field>

          <Field label="Schedule">
            <select
              value={form.streamType}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  streamType: Number(event.target.value) as StreamType,
                }))
              }
              className="w-full rounded-md border border-[#3ABEF9]/60 px-3 py-2 text-sm text-[#050C9C]"
            >
              <option value={0}>Linear</option>
              <option value={1}>Cliff + linear</option>
              <option value={2}>Milestone</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm text-[#050C9C]/80">
          <input
            type="checkbox"
            checked={form.isCancelable}
            onChange={(event) =>
              setForm((value) => ({
                ...value,
                isCancelable: event.target.checked,
              }))
            }
            className="h-4 w-4"
          />
          Creator can cancel unvested tokens
        </label>

        <div className="flex flex-col gap-3 border-t border-[#A7E6FF] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-5 text-sm text-[#050C9C]/70">{status}</p>
          <button
            type="submit"
            disabled={!wallet.connected || isSubmitting}
            className="rounded-md bg-[#050C9C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3572EF] disabled:cursor-not-allowed disabled:bg-[#A7E6FF]"
          >
            {isSubmitting ? "Submitting..." : "Create stream"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#050C9C]/80">
      {label}
      {children}
    </label>
  );
}
