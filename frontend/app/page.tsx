import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

const problemCards = [
  {
    title: "Manual distribution doesn't scale",
    body: "Sending tokens manually to investors, contributors, or communities wastes time and creates operational risk.",
  },
  {
    title: "Agreements exist only on paper",
    body: "Most vesting rules live in PDFs and spreadsheets without technical enforcement when conditions aren't met.",
  },
  {
    title: "Communities can't verify anything",
    body: "Users are expected to trust whitepapers without real-time visibility into allocations and release schedules.",
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

const steps = [
  {
    number: "01",
    title: "Lock assets",
    body: "Deposit tokens into automated escrow controlled by predefined rules.",
  },
  {
    number: "02",
    title: "Define distribution logic",
    body: "Configure recipients, schedules, milestones, and release conditions.",
  },
  {
    number: "03",
    title: "Automated execution",
    body: "Tokens release automatically based on time or verified milestones.",
  },
  {
    number: "04",
    title: "Real-time transparency",
    body: "Anyone can verify allocations, release schedules, and claim history on the blockchain.",
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
    <main className="min-h-screen bg-background text-foreground">
      <ScrollReveal />
      <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="rounded-md text-lg font-bold tracking-tight text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Vestra
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="nav-link rounded-md px-2 py-1 transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="nav-link rounded-md px-2 py-1 transition-colors hover:text-foreground">How it works</a>
            <a href="#built-for" className="nav-link rounded-md px-2 py-1 transition-colors hover:text-foreground">Built for</a>
          </div>
          <Link
            href="/streams"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-6 md:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div className="max-w-3xl animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Built for founders, investors, DAOs, and ecosystem operators on Solana.
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl" style={{ animationDelay: "0.05s" }}>
            Token distribution should run on rules, not promises.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground animate-fade-up" style={{ animationDelay: "0.12s" }}>
            Automate vesting, streaming, and milestone-based token releases in one transparent platform.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Link
              href="/streams"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Join Early Access
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              See How It Works
            </a>
          </div>
        </div>

        <div className="self-end rounded-lg border border-border bg-card p-5 shadow-sm animate-float">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-sm font-semibold text-card-foreground">Distribution plan</p>
              <p className="mt-1 text-xs font-medium text-primary">Milestone + linear releases</p>
            </div>
            <span className="rounded-md bg-[#e9f8ec] px-3 py-1 text-xs font-semibold text-[#187640]">
              On track
            </span>
          </div>
          <dl className="mt-5 grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Escrowed assets</dt>
              <dd className="font-mono font-semibold tabular-nums text-card-foreground">4,800,000 tokens</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Recipients</dt>
              <dd className="font-mono font-semibold tabular-nums text-card-foreground">128 wallets</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Next release</dt>
              <dd className="font-semibold text-card-foreground">Milestone approval</dd>
            </div>
          </dl>
          <div className="mt-7 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Locked</span>
              <span>Claimable</span>
              <span>Released</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[64%] rounded-full bg-primary transition-[width] duration-700" />
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {["Escrow funded", "Rules active", "Audit trail live"].map((item) => (
              <div key={item} className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-semibold text-card-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem */}
      <AnimatedSection
        eyebrow="THE PROBLEM"
        title="Token distribution breaks when humans stay in control."
        body="Most projects still manage token distribution through spreadsheets, PDFs, and manual transfers. When plans change, promises become unclear, and trust breaks down."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {problemCards.map((card, i) => (
            <article
              key={card.title}
              className="reveal rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <h3 className="text-lg font-semibold text-card-foreground">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p>
            </article>
          ))}
        </div>
      </AnimatedSection>

      {/* Features */}
      <AnimatedSection
        id="features"
        eyebrow="CORE FEATURES"
        title="Flexible distribution tools for every scenario."
        cta={{ label: "Explore the Platform", href: "/streams" }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className="reveal rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {feature.note}
              </p>
              <h3 className="mt-4 text-xl font-semibold text-card-foreground">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </AnimatedSection>

      {/* How it works — timeline layout */}
      <AnimatedSection
        id="how-it-works"
        eyebrow="HOW IT WORKS"
        title="Set the rules once. Vestra handles the execution."
      >
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-[1.375rem] top-6 hidden h-[calc(100%-3rem)] w-px bg-border md:block" aria-hidden="true" />
          <div className="grid gap-0">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="reveal relative grid gap-4 py-5 md:grid-cols-[3rem_1fr] md:items-start"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {/* Step number bubble */}
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-sm font-bold text-primary shadow-sm">
                  {step.number}
                </div>
                <div className={`pb-2 ${i < steps.length - 1 ? "border-b border-border md:border-none" : ""}`}>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Built for */}
      <AnimatedSection
        id="built-for"
        eyebrow="BUILT FOR"
        title="Tools for teams managing digital asset distribution at scale."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {audiences.map((audience, i) => (
            <article
              key={audience.title}
              className="reveal rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <h3 className="text-lg font-semibold text-card-foreground">{audience.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{audience.body}</p>
            </article>
          ))}
        </div>
      </AnimatedSection>

      {/* CTA banner */}
      <section className="border-y border-border bg-primary px-5 py-16 text-primary-foreground sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-7xl">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            Don&apos;t let token distribution become operational risk.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/76">
            One missed release. One manual mistake. One broken promise can damage trust permanently.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/streams"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary-foreground px-6 text-sm font-semibold text-primary transition-colors hover:bg-secondary active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Join Early Access
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary-foreground/45 px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p className="font-bold text-foreground">Vestra</p>
        <p>Automated token distribution for teams on Solana.</p>
      </footer>
    </main>
  );
}

function AnimatedSection({
  id,
  eyebrow,
  title,
  body,
  cta,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body?: string;
  cta?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-border px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="reveal">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          {body ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{body}</p>
          ) : null}
          {cta ? (
            <Link
              href={cta.href}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
        <div className="reveal" style={{ transitionDelay: "0.1s" }}>{children}</div>
      </div>
    </section>
  );
}
