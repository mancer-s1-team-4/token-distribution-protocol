import Link from "next/link";
import Image from "next/image";
import { LandingScroll } from "@/components/LandingScroll";
import { VestingChart } from "@/components/VestingChart";

/* ─── data ─────────────────────────────────────────────────────────────────── */

const risks = [
  {
    title: "Manual payouts drift",
    body: "One edit. One missed step. Schedule broken.",
    color: "var(--brand-amber)",
  },
  {
    title: "Agreements don't self-execute",
    body: "PDF terms still need someone to calculate and send.",
    color: "var(--destructive)",
  },
  {
    title: "No on-chain audit trail",
    body: "Recipients can't verify what's locked or claimable.",
    color: "var(--brand-violet)",
  },
];

const featureColors = [
  "text-brand-cyan",
  "text-primary",
  "text-brand-violet",
] as const;

const features = [
  { title: "Cliff",     note: "Investor & team unlocks" },
  { title: "Linear",    note: "Payroll, grants, contributors" },
  { title: "Milestone", note: "Roadmaps & bounties" },
];

const stepAccents = [
  "text-brand-cyan",
  "text-primary",
  "text-brand-violet",
  "text-brand-emerald",
] as const;

const steps = [
  { title: "Create", body: "Recipient, token, schedule, cliff, and rules." },
  { title: "Fund",   body: "Program-owned escrow. Rules enforced on-chain." },
  { title: "Track",  body: "Live unlocked, claimed, and claimable balances." },
  { title: "Claim",  body: "Claim any time. Cancel only when rules allow." },
];

const audiences = [
  {
    title: "Founders",
    body: "All allocations, one console.",
    accentColor: "var(--brand-cyan)",
    Icon: DashboardIcon,
  },
  {
    title: "Investors",
    body: "Real-time schedule visibility.",
    accentColor: "var(--primary)",
    Icon: TrendingIcon,
  },
  {
    title: "DAOs",
    body: "Incentives tied to verified work.",
    accentColor: "var(--brand-violet)",
    Icon: GitBranchIcon,
  },
  {
    title: "Operators",
    body: "Rules replace manual transfers.",
    accentColor: "var(--brand-emerald)",
    Icon: CogIcon,
  },
];

const metrics = [
  { label: "Escrowed",     value: "4.8M",  counter: "4.8", sub: "tokens scheduled" },
  { label: "Recipients",   value: "128",   counter: "128", sub: "wallets active" },
  { label: "Next release", value: "T-18h", counter: null,  sub: "milestone gate" },
];

/* ─── page ──────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-bg text-foreground">
      <LandingScroll />

      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          data-parallax="orb-1"
          className="absolute -left-32 -top-32 h-[640px] w-[640px] rounded-full"
          style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--brand-cyan) 16%, transparent) 0%, transparent 70%)" }}
        />
        <div
          data-parallax="orb-2"
          className="absolute -right-40 top-0 h-[720px] w-[720px] rounded-full"
          style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--brand-violet) 12%, transparent) 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Nav — always visible, z above pinned sections ─────────────────── */}
      <header
        data-nav
        className="sticky top-0 z-[100] border-b border-border/60 bg-background/80 backdrop-blur-xl"
      >
        {/* Scroll progress line */}
        <div
          data-nav-progress
          className="absolute bottom-0 left-0 h-[2px] w-full bg-brand-accent"
          aria-hidden="true"
        />
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <Link
            href="/"
            data-nav-logo
            className="inline-flex min-h-10 items-center gap-2.5 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image
              src="/favicon/android-chrome-192x192.png"
              width={32}
              height={32}
              alt=""
              aria-hidden="true"
              className="rounded-md"
              priority
            />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Vesta
            </span>
          </Link>

          <div className="hidden items-center gap-1 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#features"     data-nav-link className="rounded-md px-3 py-2 transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" data-nav-link className="rounded-md px-3 py-2 transition-colors hover:text-foreground">Workflow</a>
            <a href="#built-for"    data-nav-link className="rounded-md px-3 py-2 transition-colors hover:text-foreground">Teams</a>
          </div>

          <Link
            href="/streams"
            data-nav-cta
            data-magnet
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 active:scale-[0.97]"
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        data-section="hero"
        className="relative min-h-screen lg:h-screen lg:overflow-hidden flex flex-col justify-start pt-16 lg:justify-center lg:pt-0 pb-16 lg:pb-0 px-6 lg:px-10"
      >
        <div className="mx-auto max-w-[1400px] w-full grid gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <h1
              className="animate-fade-up font-display text-5xl font-bold leading-[0.94] tracking-tight text-foreground sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Token releases with rules operators can trust.
            </h1>
            <p className="animate-fade-up mt-6 text-lg text-muted-foreground" style={{ animationDelay: "0.07s" }}>
              On-chain escrow. Live balances. No manual releases.
            </p>
            <div className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.13s" }}>
              <Link href="/streams" data-magnet className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:brightness-110 active:scale-[0.97]">
                Launch dashboard <ArrowIcon />
              </Link>
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-card/60 px-6 text-sm font-bold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:bg-card active:scale-[0.97]">
                How it works
              </a>
            </div>
          </div>

          <div>
            <div data-parallax="hero-panel" className="rounded-xl border border-border/80 bg-hero-panel p-4" style={{ willChange: "transform" }}>
              <div className="rounded-lg border border-border/70 bg-background/70 p-5 backdrop-blur">
                <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Distribution plan</p>
                    <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-foreground">Ecosystem grant stream</h2>
                  </div>
                  <span className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full bg-brand-emerald/16 px-3 text-xs font-bold text-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-emerald" />
                    Active
                  </span>
                </div>
                <div className="grid gap-4 py-5 sm:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="border-l border-border pl-3">
                      <p className="text-xs font-semibold text-muted-foreground">{metric.label}</p>
                      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground" data-counter={metric.counter ?? undefined}>
                        {metric.counter === null ? metric.value : "0"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{metric.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Locked</span><span>Claimable</span><span>Released</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-[64%] rounded-full bg-brand-accent" />
                  </div>
                </div>
                <div className="mt-5 grid gap-2">
                  {[["Recipient", "7xKX...gAsU"], ["Schedule", "Cliff + linear"], ["Next action", "Milestone approval"]].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 rounded-md border border-border/80 bg-card/60 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Risk ─────────────────────────────────────────────────────────── */}
      <section
        data-section="risk"
        className="border-t border-border/60 px-6 py-28 lg:px-10"
        aria-label="The risk of manual token distribution"
      >
        <div className="mx-auto max-w-[1400px]">
          <h2
            data-reveal="clip"
            className="font-display text-6xl font-bold leading-[0.88] tracking-tight text-foreground sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            The risk.
          </h2>
          <div className="mt-16 divide-y divide-border/40">
            {risks.map((risk, i) => (
              <div
                key={risk.title}
                data-parallax="risk-row"
                className="flex items-start gap-8 py-10 sm:gap-14 lg:gap-24"
              >
                <span
                  className="font-display text-[4rem] font-black tabular-nums leading-none shrink-0 mt-1.5 lg:text-[5rem]"
                  style={{ color: `color-mix(in oklch, ${risk.color} 55%, transparent)` }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl xl:text-5xl">
                    {risk.title}
                  </h3>
                  <p className="mt-2 max-w-prose text-base leading-7 text-muted-foreground">
                    {risk.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features — pinned morphing chart ─────────────────────────────────── */}
      <section
        id="features"
        data-section="features"
        className="h-screen border-t border-border/60"
        aria-label="Vesting schedule types"
      >
        <div className="mx-auto grid h-full w-full max-w-[1400px] lg:grid-cols-[2.5rem_5fr_7fr]">
          {/* Vertical axis label — editorial, not an eyebrow */}
          <div className="hidden lg:flex items-center justify-center border-r border-border/40">
            <span
              className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Schedule type
            </span>
          </div>

          <div className="relative flex flex-col justify-center px-6 sm:px-10 lg:px-10">
            <div className="relative h-52 sm:h-64 lg:h-80">
              {features.map((f, i) => (
                <div key={f.title} data-feature={i} data-feature-state={i === 0 ? "active" : "pending"}>
                  <h2 className={`font-display text-7xl font-bold leading-[0.88] tracking-tight sm:text-8xl lg:text-9xl xl:text-[8.5rem] ${featureColors[i]}`}>
                    {f.title}
                  </h2>
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {f.note}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-2.5" aria-hidden="true">
              {features.map((_, i) => (
                <div key={i} data-feature-dot={i} className="h-1 w-5 rounded-full bg-border" />
              ))}
            </div>
          </div>

          <div className="h-full flex items-center px-4 py-8 lg:px-10 lg:py-12">
            <div className="h-full w-full">
              <VestingChart />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works — pinned step spotlight ──────────────────────────────── */}
      <section
        id="how-it-works"
        data-section="steps"
        className="h-screen border-t border-border/60 flex items-center"
        aria-label="How it works"
      >
        <div className="mx-auto max-w-[1400px] w-full px-6 lg:px-10 grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          {/* Left: small label + big decorative number + dots */}
          <div>
            <p className="text-sm text-muted-foreground">Configure once.</p>
            <div
              data-step-num
              className="mt-2 font-display text-[8rem] font-bold leading-none tabular-nums lg:text-[10rem] xl:text-[12rem]"
              style={{ color: "color-mix(in oklch, var(--brand-cyan) 35%, transparent)" }}
            >
              01
            </div>
            <div className="mt-4 flex gap-2" aria-hidden="true">
              {steps.map((_, i) => (
                <div key={i} data-step-dot={i} className="h-1 w-6 rounded-full bg-border" />
              ))}
            </div>
          </div>

          {/* Right: huge step titles spotlight */}
          <div className="relative h-[55vh] min-h-[280px]">
            {steps.map((step, i) => (
              <div key={step.title} data-step={i} data-state={i === 0 ? "active" : "pending"}>
                <p className={`font-mono text-xs font-bold uppercase tracking-[0.2em] ${stepAccents[i]}`}>
                  0{i + 1} / 0{steps.length}
                </p>
                <h3 className="mt-4 font-display text-6xl font-bold leading-[0.88] tracking-tight text-foreground sm:text-7xl lg:text-8xl xl:text-[8rem]">
                  {step.title}
                </h3>
                <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for ─────────────────────────────────────────────────────────── */}
      <section
        id="built-for"
        className="border-t border-border/60 px-6 py-24 lg:px-10"
        aria-label="Who it is built for"
      >
        <div className="mx-auto max-w-[1400px]">
          <h2
            data-reveal="clip"
            className="font-display text-6xl font-bold leading-[0.88] tracking-tight text-foreground sm:text-7xl lg:text-8xl xl:text-9xl"
          >
            Built for<br />finance{" "}
            <span className="text-primary">ops.</span>
          </h2>
          <div className="mt-14 divide-y divide-border/50">
            {audiences.map((audience) => {
              const Icon = audience.Icon;
              return (
                <div
                  key={audience.title}
                  data-parallax="audience-card"
                  className="group relative -mx-4 flex items-center gap-6 rounded-lg px-4 py-8 transition-colors duration-300 hover:bg-foreground/[0.04] sm:gap-10"
                  style={{ willChange: "transform, opacity" }}
                >
                  <Icon
                    style={{ color: audience.accentColor }}
                    className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-3xl font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary lg:text-4xl xl:text-5xl">
                      {audience.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {audience.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:px-10">
        <div
          data-parallax="cta-band"
          className="mx-auto max-w-[1400px] overflow-hidden rounded-2xl border border-primary/30 bg-brand-accent p-10 sm:p-14 lg:p-20"
          style={{ willChange: "transform, opacity" }}
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <h2 className="font-display text-6xl font-bold leading-[0.88] tracking-tight text-primary-foreground sm:text-7xl lg:text-8xl xl:text-9xl">
              Replace<br />manual<br />releases.
            </h2>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:pb-2">
              <Link href="/streams" data-magnet className="inline-flex min-h-14 items-center justify-center rounded-xl bg-primary-foreground px-8 text-base font-bold text-primary transition-colors hover:bg-primary-foreground/90 active:scale-[0.97]">
                Open app
              </Link>
              <a href="#features" data-magnet className="inline-flex min-h-14 items-center justify-center rounded-xl border border-primary-foreground/40 px-8 text-base font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/10 active:scale-[0.97]">
                Review features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1400px] flex-col gap-2 px-6 py-8 text-sm text-muted-foreground lg:px-10">
        <p className="font-display text-lg font-bold text-foreground">Vesta</p>
        <p>Automated token distribution for teams on Solana.</p>
      </footer>
    </main>
  );
}

/* ─── icons ─────────────────────────────────────────────────────────────────── */

function Icon({ children, size = 40, className, style }: { children: React.ReactNode; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function DashboardIcon({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <Icon size={32} style={style} className={className}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icon>
  );
}

function TrendingIcon({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <Icon size={32} style={style} className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Icon>
  );
}

function GitBranchIcon({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <Icon size={32} style={style} className={className}>
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </Icon>
  );
}

function CogIcon({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <Icon size={32} style={style} className={className}>
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </Icon>
  );
}

function ArrowIcon() {
  return (
    <Icon size={18}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}
