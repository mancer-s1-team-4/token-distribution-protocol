import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";

const metrics = [
  { label: "Escrowed", value: "4.8M", sub: "tokens scheduled" },
  { label: "Recipients", value: "128", sub: "wallets active" },
  { label: "Next release", value: "T-18h", sub: "milestone gate" },
];

const problemCards = [
  {
    title: "Manual payouts create drift",
    body: "One spreadsheet edit, missed approval, or copied address can break a release schedule.",
    icon: WarningIcon,
  },
  {
    title: "Static agreements do not execute",
    body: "PDF vesting terms still need someone to calculate, approve, and send every transfer.",
    icon: DocumentIcon,
  },
  {
    title: "Communities cannot inspect status",
    body: "Recipients need to see what is locked, released, claimable, and completed without asking ops.",
    icon: EyeIcon,
  },
];

const features = [
  {
    title: "Cliff vesting",
    body: "Keep allocations locked until a specific date, then release tokens on the schedule you configured.",
    note: "Investor and team unlocks",
    icon: LockIcon,
  },
  {
    title: "Linear streaming",
    body: "Release tokens continuously over time with a live claimable balance for each recipient.",
    note: "Payroll, grants, contributors",
    icon: StreamIcon,
  },
  {
    title: "Milestone releases",
    body: "Tie token releases to verified execution so distribution follows delivery, not promises.",
    note: "Roadmaps and bounties",
    icon: CheckIcon,
  },
];

const steps = [
  {
    number: "01",
    title: "Create the agreement",
    body: "Choose the recipient, token, schedule type, start date, cliff, and cancellation rules.",
  },
  {
    number: "02",
    title: "Fund escrow",
    body: "Tokens move into a program-owned account where neither side can bypass the configured rules.",
  },
  {
    number: "03",
    title: "Track release state",
    body: "Vestra calculates unlocked, claimed, and claimable amounts from live account data.",
  },
  {
    number: "04",
    title: "Claim or cancel",
    body: "Recipients claim vested tokens. Creators can cancel only when the agreement allows it.",
  },
];

const audiences = [
  {
    title: "Founders",
    body: "Run contributor, investor, and advisor allocations from one operational console.",
  },
  {
    title: "Investors",
    body: "Inspect schedules and release state without waiting for a monthly allocation report.",
  },
  {
    title: "DAOs",
    body: "Tie incentives to verified work and make every allocation easier to audit.",
  },
  {
    title: "Operators",
    body: "Replace repetitive transfers with rules that are visible, repeatable, and safer to run.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-brand-bg text-foreground">
      <ScrollReveal />
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/82 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-accent text-primary-foreground">
              <GridIcon />
            </span>
            Vestra
          </Link>
          <div className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#features" className="nav-link rounded-md px-3 py-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Features</a>
            <a href="#how-it-works" className="nav-link rounded-md px-3 py-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Workflow</a>
            <a href="#built-for" className="nav-link rounded-md px-3 py-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Teams</a>
          </div>
          <Link
            href="/streams"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open app
          </Link>
        </nav>
      </header>

      <section className="relative px-5 pb-20 pt-14 sm:px-6 md:pt-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="animate-fade-up inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card/72 px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
              <PulseIcon />
              Solana distribution operations
            </div>
            <h1 className="animate-fade-up mt-7 max-w-4xl font-display text-5xl font-bold leading-[0.96] tracking-tight text-foreground sm:text-6xl lg:text-7xl" style={{ animationDelay: "0.05s" }}>
              Token releases with rules operators can trust.
            </h1>
            <p className="animate-fade-up mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg" style={{ animationDelay: "0.1s" }}>
              Vestra turns vesting schedules, streaming payouts, and milestone releases into transparent agreements with live balances and predictable execution.
            </p>
            <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.15s" }}>
              <Link
                href="/streams"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Launch dashboard
                <ArrowIcon />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card/72 px-6 text-sm font-bold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                View workflow
              </a>
            </div>
          </div>

          <div className="reveal relative">
            <div className="rounded-lg border border-border bg-hero-panel p-4 shadow-sm">
              <div className="rounded-md border border-border/80 bg-background/78 p-4 backdrop-blur">
                <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Distribution plan</p>
                    <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">Ecosystem grant stream</h2>
                  </div>
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-emerald/18 px-3 text-xs font-bold text-foreground">
                    <CheckIcon />
                    Active
                  </span>
                </div>

                <div className="grid gap-3 py-5 sm:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="border-l border-border pl-3">
                      <p className="text-xs font-semibold text-muted-foreground">{metric.label}</p>
                      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-border pt-5">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>Locked</span>
                    <span>Claimable</span>
                    <span>Released</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[64%] rounded-full bg-brand-accent" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    ["Recipient", "7xKX...gAsU"],
                    ["Schedule", "Cliff + linear"],
                    ["Next action", "Milestone approval"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-md border border-border bg-card/72 px-3 py-3">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-right font-mono text-sm font-bold tabular-nums text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatedSection
        eyebrow="The risk"
        title="Token distribution breaks when execution lives outside the agreement."
        body="Vestra removes the gap between what your team promised and what actually happens on-chain."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {problemCards.map((card, i) => (
            <FeatureCard key={card.title} {...card} delay={i} />
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection
        id="features"
        eyebrow="Core controls"
        title="One interface for the release patterns teams already use."
        cta={{ label: "Explore dashboard", href: "/streams" }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={i} note={feature.note} />
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection
        id="how-it-works"
        eyebrow="Workflow"
        title="Configure once. Track every state change from the dashboard."
      >
        <div className="relative">
          <div className="absolute left-[1.375rem] top-6 hidden h-[calc(100%-3rem)] w-px bg-border md:block" aria-hidden="true" />
          <div className="grid gap-0">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="reveal relative grid gap-4 py-5 md:grid-cols-[3rem_1fr] md:items-start"
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card font-mono text-sm font-bold text-primary">
                  {step.number}
                </div>
                <div className={i < steps.length - 1 ? "border-b border-border pb-5 md:border-none" : ""}>
                  <h3 className="font-display text-lg font-bold tracking-tight text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection
        id="built-for"
        eyebrow="Built for"
        title="Designed for teams that treat token operations like finance ops."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {audiences.map((audience, i) => (
            <article
              key={audience.title}
              className="reveal rounded-lg border border-border bg-card/82 p-5 backdrop-blur transition-colors hover:border-primary/45"
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <h3 className="font-display text-xl font-bold tracking-tight text-card-foreground">{audience.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{audience.body}</p>
            </article>
          ))}
        </div>
      </AnimatedSection>

      <section className="px-5 py-16 sm:px-6 lg:px-8">
        <div className="reveal mx-auto max-w-7xl overflow-hidden rounded-lg border border-border bg-brand-accent p-8 text-primary-foreground sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/78">Start operating from live rules</p>
              <h2 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Replace manual releases before the next payout cycle.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/82">
                Create a stream, fund escrow, and give recipients a dashboard that shows exactly what can be claimed.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/streams"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary-foreground px-6 text-sm font-bold text-primary transition-colors hover:bg-primary-foreground/90 focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Open app
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary-foreground/45 px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/12 focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Review features
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p className="font-display text-lg font-bold text-foreground">Vestra</p>
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
    <section id={id} className="border-t border-border/80 px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="reveal">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          {body ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{body}</p>
          ) : null}
          {cta ? (
            <Link
              href={cta.href}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/88 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
        <div className="reveal" style={{ transitionDelay: "0.08s" }}>{children}</div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  body,
  note,
  icon: Icon,
  delay,
}: {
  title: string;
  body: string;
  note?: string;
  icon: IconComponent;
  delay: number;
}) {
  return (
    <article
      className="reveal rounded-lg border border-border bg-card/82 p-5 backdrop-blur transition-colors hover:border-primary/45"
      style={{ transitionDelay: `${delay * 0.06}s` }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-primary">
        <Icon />
      </div>
      {note ? (
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {note}
        </p>
      ) : null}
      <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-card-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}

type IconComponent = () => React.ReactElement;

function SvgIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function GridIcon() {
  return (
    <SvgIcon>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </SvgIcon>
  );
}

function PulseIcon() {
  return (
    <SvgIcon>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </SvgIcon>
  );
}

function ArrowIcon() {
  return (
    <SvgIcon>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </SvgIcon>
  );
}

function WarningIcon() {
  return (
    <SvgIcon>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" />
    </SvgIcon>
  );
}

function DocumentIcon() {
  return (
    <SvgIcon>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h4" />
    </SvgIcon>
  );
}

function EyeIcon() {
  return (
    <SvgIcon>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  );
}

function LockIcon() {
  return (
    <SvgIcon>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
    </SvgIcon>
  );
}

function StreamIcon() {
  return (
    <SvgIcon>
      <path d="M4 7h5a4 4 0 0 1 4 4v2a4 4 0 0 0 4 4h3" />
      <path d="m17 14 3 3-3 3" />
      <path d="M4 17h4" />
    </SvgIcon>
  );
}

function CheckIcon() {
  return (
    <SvgIcon>
      <path d="m5 12 4 4L19 6" />
    </SvgIcon>
  );
}
