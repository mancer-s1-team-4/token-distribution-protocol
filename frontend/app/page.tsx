import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold text-slate-500">Themis</p>
            <p className="text-xs text-slate-400">Token Distribution Protocol</p>
          </div>
          <Link
            href="/streams"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open app
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-700">
              Simple on-chain payroll
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Schedule token payments without chasing spreadsheets.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Create vesting streams for contributors, contractors, and teams.
              Funds stay in escrow and workers withdraw what has already vested.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/streams/create"
                className="rounded-md bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Create stream
              </Link>
              <Link
                href="/streams"
                className="rounded-md border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-white"
              >
                View streams
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Active stream
                </p>
                <p className="text-xs text-slate-500">Linear vesting</p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                Claimable
              </span>
            </div>

            <dl className="grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Total locked</dt>
                <dd className="font-semibold text-slate-950">120,000 tokens</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Claimed</dt>
                <dd className="font-semibold text-slate-950">35,000 tokens</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Recipient</dt>
                <dd className="font-mono text-xs text-slate-700">8xk...2fj</dd>
              </div>
            </dl>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[42%] rounded-full bg-blue-700" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
              <span>Start</span>
              <span>Today</span>
              <span>End</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
