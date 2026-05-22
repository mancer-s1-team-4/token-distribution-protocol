import Link from "next/link";

const problemCards = [
  {
    title: "Manual distribution does not scale",
    body: "Sending tokens manually every month to investors, contributors, or communities wastes time and creates operational risk.",
  },
  {
    title: "Agreements exist only on paper",
    body: "Most vesting rules live in PDFs and spreadsheets without technical enforcement when conditions are not fulfilled.",
  },
  {
    title: "Communities cannot verify anything",
    body: "Users are expected to trust whitepapers without real-time visibility into allocations and unlock schedules.",
  },
];

const features = [
  {
    title: "Cliff Vesting",
    body: "Lock tokens for a defined period before scheduled releases begin automatically.",
    note: "Built for teams and investors",
  },
  {
    title: "Linear Streaming",
    body: "Stream tokens continuously over time with real-time claimable balances.",
    note: "Built for payroll and grants",
  },
  {
    title: "Milestone-Based Releases",
    body: "Release tokens only after verified milestones are completed.",
    note: "Built for roadmap execution",
  },
];

const proofPoints = [
  "Cliff, streaming, and milestone distribution in one protocol",
  "Automated escrow with transparent release logic",
  "Real-time auditability for teams and communities",
  "Token 2022 ready infrastructure",
  "SDK and integrations for developers",
];

const steps = [
  {
    title: "Lock Assets",
    body: "Deposit tokens into automated escrow controlled by protocol rules.",
  },
  {
    title: "Define Distribution Logic",
    body: "Configure recipients, schedules, milestones, and unlock conditions.",
  },
  {
    title: "Automated Execution",
    body: "Tokens release automatically based on time or verified milestones.",
  },
  {
    title: "Real-Time Transparency",
    body: "Anyone can verify allocations, unlock schedules, and claim history on-chain.",
  },
];

const audiences = [
  {
    title: "Founders & Ops Teams",
    body: "Automate investor allocations, contributor rewards, and treasury distribution.",
  },
  {
    title: "Investors",
    body: "Track vesting schedules transparently without relying on manual reporting.",
  },
  {
    title: "DAOs & Communities",
    body: "Enable transparent and auditable token distribution for ecosystem participants.",
  },
  {
    title: "Developers",
    body: "Integrate programmable distribution logic with one unified SDK.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7fcff] text-[#050C9C]">
      <header className="sticky top-0 z-20 border-b border-[#3ABEF9]/25 bg-[#f7fcff]/92 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="rounded-md text-lg font-bold tracking-tight text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
          >
            Vestra
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-[#050C9C]/70 md:flex">
            <a
              href="#features"
              className="rounded-md transition hover:text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="rounded-md transition hover:text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              How it works
            </a>
            <a
              href="#built-for"
              className="rounded-md transition hover:text-[#050C9C] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              Built for
            </a>
          </div>
          <Link
            href="/streams"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#050C9C] px-4 text-sm font-semibold text-white transition hover:bg-[#3572EF] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
          >
            Open app
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-6 md:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3572EF]">
            Built for founders, investors, DAOs, and ecosystem operators on Solana.
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#050C9C] sm:text-5xl lg:text-6xl">
            Token distribution should run on rules, not promises.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#1220a3]/75">
            Automate vesting, streaming, and milestone-based token releases in one transparent and trustless protocol.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/streams"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#050C9C] px-6 text-sm font-semibold text-white transition hover:bg-[#3572EF] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              Join Early Access
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#3ABEF9]/70 bg-white px-6 text-sm font-semibold text-[#050C9C] transition hover:border-[#3572EF] hover:bg-[#effaff] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
            >
              See How It Works
            </a>
          </div>
        </div>

        <div className="self-end rounded-lg border border-[#3ABEF9]/45 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-[#A7E6FF] pb-4">
            <div>
              <p className="text-sm font-semibold text-[#050C9C]">Distribution plan</p>
              <p className="mt-1 text-xs font-medium text-[#3572EF]">Milestone + linear unlocks</p>
            </div>
            <span className="rounded-md bg-[#e9f8ec] px-3 py-1 text-xs font-semibold text-[#187640]">
              On track
            </span>
          </div>
          <dl className="mt-5 grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#050C9C]/60">Escrowed assets</dt>
              <dd className="font-semibold text-[#050C9C]">4,800,000 tokens</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#050C9C]/60">Recipients</dt>
              <dd className="font-semibold text-[#050C9C]">128 wallets</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#050C9C]/60">Next unlock</dt>
              <dd className="font-semibold text-[#050C9C]">Milestone approval</dd>
            </div>
          </dl>
          <div className="mt-7 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-[#050C9C]/65">
              <span>Locked</span>
              <span>Claimable</span>
              <span>Released</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#A7E6FF]/55">
              <div className="h-full w-[64%] rounded-full bg-[#3572EF]" />
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {["Escrow funded", "Rules active", "Audit trail live"].map((item) => (
              <div key={item} className="rounded-md border border-[#A7E6FF] bg-[#f7fcff] p-3">
                <p className="text-xs font-semibold text-[#050C9C]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section
        eyebrow="THE PROBLEM"
        title="Token distribution breaks when humans stay in control."
        body="Most projects still manage token distribution through spreadsheets, PDFs, manual transfers, and fragmented tools. When plans change, allocations drift, promises become unclear, and trust starts breaking down."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {problemCards.map((card) => (
            <article key={card.title} className="rounded-lg border border-[#3ABEF9]/35 bg-white p-5">
              <h3 className="text-lg font-semibold text-[#050C9C]">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#050C9C]/70">{card.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="THE SOLUTION"
        title="One protocol for every token distribution model."
        body="Vestra transforms token distribution into an automated and auditable workflow, from escrow and vesting to milestone-based releases and real-time claims."
      >
        <Link
          href="/streams"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#050C9C] px-5 text-sm font-semibold text-white transition hover:bg-[#3572EF] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
        >
          Explore The Protocol
        </Link>
      </Section>

      <Section
        id="features"
        eyebrow="CORE FEATURES"
        title="Flexible distribution infrastructure for every scenario."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-[#3ABEF9]/35 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3572EF]">
                {feature.note}
              </p>
              <h3 className="mt-4 text-xl font-semibold text-[#050C9C]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#050C9C]/70">{feature.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="WHY VESTRA"
        title="Existing tools solve one piece. Vestra connects everything."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {proofPoints.map((point) => (
            <div key={point} className="flex gap-3 rounded-lg border border-[#3ABEF9]/35 bg-white p-4">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#3572EF]" aria-hidden="true" />
              <p className="text-sm font-medium leading-6 text-[#050C9C]/78">{point}</p>
            </div>
          ))}
        </div>
        <Link
          href="/streams/create"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#050C9C] px-5 text-sm font-semibold text-white transition hover:bg-[#3572EF] focus-visible:ring-2 focus-visible:ring-[#3572EF] focus-visible:ring-offset-2"
        >
          Start Building With Vestra
        </Link>
      </Section>

      <Section
        id="how-it-works"
        eyebrow="HOW IT WORKS"
        title="Set the rules once. Vestra handles the execution."
      >
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-[#3ABEF9]/35 bg-white p-5">
              <p className="text-sm font-bold text-[#3572EF]">Step {index + 1}</p>
              <h3 className="mt-4 text-lg font-semibold text-[#050C9C]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#050C9C]/70">{step.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="built-for"
        eyebrow="BUILT FOR"
        title="Infrastructure for teams managing digital asset distribution at scale."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {audiences.map((audience) => (
            <article key={audience.title} className="rounded-lg border border-[#3ABEF9]/35 bg-white p-5">
              <h3 className="text-lg font-semibold text-[#050C9C]">{audience.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#050C9C]/70">{audience.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <section className="border-y border-[#3ABEF9]/25 bg-[#050C9C] px-5 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Do not let token distribution become operational risk.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/76">
            One missed unlock. One manual mistake. One broken promise can damage trust permanently.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/streams"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-6 text-sm font-semibold text-[#050C9C] transition hover:bg-[#A7E6FF] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050C9C]"
            >
              Join The Early Access
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/45 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050C9C]"
            >
              Follow Vestra on X
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-[#050C9C]/70 sm:px-6 lg:px-8">
        <p className="font-bold text-[#050C9C]">Vestra</p>
        <p>Trustless token distribution infrastructure for the Solana ecosystem.</p>
      </footer>
    </main>
  );
}

function Section({
  id,
  eyebrow,
  title,
  body,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-[#3ABEF9]/20 px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3572EF]">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-[#050C9C] sm:text-4xl">
            {title}
          </h2>
          {body ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#050C9C]/70">{body}</p>
          ) : null}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
