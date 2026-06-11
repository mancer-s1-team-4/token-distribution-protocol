# Brand - Vesta

Automated token vesting, streaming, and milestone-based distribution on Solana.

_Updated on 2026-06-11. Vesta palette — dark-first identity from the Vesta gradient wordmark._

## Palette - Vesta Gradient

**Vibe:** precise, liquid, operational, trustworthy
**Category:** Solana finance ops
**Mood:** premium dark workstation + gradient identity

The Vesta palette is built from the brand logo: pure near-black with a cyan-to-violet gradient as the primary brand signal. The gradient runs from cyan (network clarity) through blue-violet (action/trust) to deep violet (authority). Dark is the primary mode; light mode is a cooler, indigo-tinted neutral derived from the same hue family.

### Seeds

| Role | OKLCH | Purpose |
|---|---|---|
| bg-base (dark) | `oklch(0.07 0.018 270)` | near-black indigo app background |
| fg-base (dark) | `oklch(0.93 0.010 235)` | near-white cool text |
| primary | `oklch(0.62 0.22 272)` | center of gradient, action blue-violet |
| brand-cyan | `oklch(0.72 0.18 205)` | gradient start, network/data clarity |
| brand-violet | `oklch(0.52 0.24 292)` | gradient end, authority |
| card (dark) | `oklch(0.10 0.022 270)` | raised surfaces |
| brand-emerald | `oklch(0.70 0.15 154)` | active/success/release state |
| brand-amber | `oklch(0.78 0.16 76)` | pending/attention accent |

### Semantic tokens

Defined in `app/globals.css`:

```css
--background: oklch(0.07 0.018 270);      /* dark default */
--foreground: oklch(0.93 0.010 235);
--primary: oklch(0.62 0.22 272);
--brand-cyan: oklch(0.72 0.18 205);
--brand-violet: oklch(0.52 0.24 292);
--brand-emerald: oklch(0.70 0.15 154);
--brand-amber: oklch(0.78 0.16 76);
```

### Gradients

- `bg-brand-bg`: page-level atmospheric background with subtle cyan/violet radial fields on deep indigo-black.
- `bg-brand-accent`: primary brand gradient from cyan through blue-violet to deep violet. Used for CTA band, progress bars, brand moments.
- `bg-hero-panel`: elevated hero/dashboard panel surface.

Use gradients for brand moments only: landing hero, CTA band, hero panel accents. Do not use gradient text on headings or body copy.

## Typography - Space Grotesk + Manrope + Geist Mono

- **Display:** Space Grotesk
  - Use for landing headlines, section headings, brand mark, and high-emphasis card titles.
  - Mood: technical, geometric, confident.
- **Body/UI:** Manrope
  - Use for navigation, paragraphs, buttons, form labels, and operational UI.
  - Mood: clean, readable, precision-focused.
- **Mono:** Geist Mono
  - Use for addresses, token amounts, counters, and schedule metrics.

Wired through `next/font/google` in `app/layout.tsx`.

### Type rules

| Role | Class direction | Use |
|---|---|---|
| Hero | `font-display text-5xl sm:text-6xl lg:text-7xl font-bold` | Landing page only |
| Section title | `font-display text-3xl sm:text-4xl font-bold` | Major page sections |
| Card title | `font-display text-xl font-bold` | Feature/problem/audience cards |
| UI/body | `font-sans text-sm/text-base` | Interface copy |
| Numbers | `font-mono tabular-nums` | Metrics, token values, addresses |

## UI Direction

Direction: Solana ops workstation with dark premium identity.
Density: Comfortable on landing, compact inside operational panels.
Surface: Deep indigo-black atmospheric background with crisp raised panels.
Type mood: geometric, technical, readable.
Motion: restrained reveal and state feedback. Ease-out on entries, scale(0.97) on press.
Theme: dark-first. `dark` class always applied to html element.

### Do

- Use the brand gradient (cyan-to-violet) for CTAs, progress fills, and brand moments.
- Use outline icons with a consistent stroke.
- Keep body copy concrete: tokens, schedules, escrow, claimable, releases.
- Use emerald for success/active, amber for pending/attention, violet for primary actions.
- Use mono for values users compare or scan.

### Don't

- Do not use gradient text on headings or body copy.
- Do not use warm beige, cream, or sand as backgrounds.
- Do not nest cards inside decorative cards.
- Do not use vague Web3 hype copy.
- Do not introduce a third display font.
- Do not put eyebrows on every section header.

## Voice

Vesta speaks like a finance ops tool: direct, concrete, and measured.

Preferred words: create, fund, release, claim, schedule, escrow, recipient, agreement, dashboard, stream, lock, withdraw, verify, milestone.

Avoid: revolutionary, supercharge, unleash, trustless, next-gen, magic, effortless, seamless, powerful.
