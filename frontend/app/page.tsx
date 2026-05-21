import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#A7E6FF]/20">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between border-b border-[#3ABEF9]/35 pb-5">
          <div>
            <p className="text-sm font-semibold text-[#050C9C]">Vestra</p>
            <p className="text-xs text-[#3572EF]">Token vesting for working teams</p>
          </div>
          <Link
            href="/streams"
            className="rounded-md bg-[#050C9C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3572EF]"
          >
            Open app
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#3572EF]">
              Simple on-chain payroll
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-[#050C9C] sm:text-6xl">
              Schedule token payments without chasing spreadsheets.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#050C9C]/75">
              Create vesting streams for contributors, contractors, and teams.
              Funds stay in escrow and workers withdraw what has already vested.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/streams/create"
                className="rounded-md bg-[#050C9C] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#3572EF]"
              >
                Create stream
              </Link>
              <Link
                href="/streams"
                className="rounded-md border border-[#3ABEF9] bg-white/60 px-5 py-3 text-center text-sm font-semibold text-[#050C9C] transition hover:bg-white"
              >
                View streams
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[#3ABEF9]/45 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-[#A7E6FF] pb-4">
              <div>
                <p className="text-sm font-semibold text-[#050C9C]">
                  Active stream
                </p>
                <p className="text-xs text-[#3572EF]">Linear vesting</p>
              </div>
              <span className="rounded-full bg-[#A7E6FF] px-3 py-1 text-xs font-medium text-[#050C9C]">
                Claimable
              </span>
            </div>

            <dl className="grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[#050C9C]/60">Total locked</dt>
                <dd className="font-semibold text-[#050C9C]">120,000 tokens</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#050C9C]/60">Claimed</dt>
                <dd className="font-semibold text-[#050C9C]">35,000 tokens</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#050C9C]/60">Recipient</dt>
                <dd className="font-mono text-xs text-[#050C9C]/80">8xk...2fj</dd>
              </div>
            </dl>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#A7E6FF]">
              <div className="h-full w-[42%] rounded-full bg-[#3572EF]" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs text-[#050C9C]/60">
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
