# Brand - Vestra

Automated token vesting, streaming, and milestone-based distribution on Solana.

_Updated on 2026-05-27. Palette evolved from Signal Navy._

## Palette - Aurora Ledger

**Vibe:** precise, liquid, operational, trustworthy
**Category:** Solana finance ops
**Mood:** premium workstation + gradient trust

Aurora Ledger keeps Signal Navy's deep blue foundation, then expands it with cyan for network/data clarity, emerald for successful releases, and amber for milestones/attention. The UI should feel like a serious operations surface, not a generic crypto landing page.

### Seeds

| Role | OKLCH | Purpose |
|---|---|---|
| bg-base | `oklch(0.965 0.018 226)` | cool off-white app background |
| fg-base | `oklch(0.165 0.036 254)` | ink navy text |
| primary | `oklch(0.48 0.215 258)` | action blue inherited from Signal Navy |
| cyan | `oklch(0.72 0.16 197)` | network/data glow |
| emerald | `oklch(0.70 0.15 154)` | active/success/release state |
| amber | `oklch(0.78 0.16 76)` | milestone/attention accent |
| card | `oklch(0.995 0.006 230)` | raised surfaces |

### Semantic tokens

Defined in `app/globals.css`:

```css
--background: oklch(0.965 0.018 226);
--foreground: oklch(0.165 0.036 254);
--primary: oklch(0.48 0.215 258);
--accent: oklch(0.82 0.145 189);
--brand-cyan: oklch(0.72 0.16 197);
--brand-emerald: oklch(0.70 0.15 154);
--brand-amber: oklch(0.78 0.16 76);
```

### Gradients

- `bg-brand-bg`: page-level atmospheric background using subtle cyan/blue radial fields.
- `bg-brand-accent`: primary brand gradient from Signal Navy blue through cyan into emerald.
- `bg-hero-panel`: elevated hero/dashboard panel surface.

Use gradients for brand moments only: landing hero, CTA band, hero panel accents. Do not use gradient text.

## Typography - Space Grotesk + Manrope + Geist Mono

- **Display:** Space Grotesk
  - Use for landing headlines, section headings, brand mark, and high-emphasis card titles.
  - Mood: technical, geometric, confident.
- **Body/UI:** Manrope
  - Use for navigation, paragraphs, buttons, form labels, and operational UI.
  - Mood: clean, readable, less default than Geist/Inter.
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

Direction: Solana ops workstation with premium gradient trust.
Density: Comfortable on landing, compact inside operational panels.
Surface: Transparent atmospheric page background with crisp raised panels.
Type mood: geometric, technical, readable.
Motion: restrained reveal and state feedback only.

### Do

- Use outline icons with a consistent stroke.
- Use cards for repeated items and panels, not every page section.
- Keep body copy concrete: tokens, schedules, escrow, claimable, releases.
- Use cyan/emerald as supporting accents, not competing primary colors.
- Use mono for values users compare or scan.

### Don't

- Do not use gradient text.
- Do not overuse purple/blue gradients without cyan/emerald balance.
- Do not nest cards inside decorative cards.
- Do not use vague Web3 hype copy.
- Do not introduce a third display font.

## Voice

Vestra speaks like a finance ops tool: direct, concrete, and measured.

Preferred words: create, fund, release, claim, schedule, escrow, recipient, agreement, dashboard.

Avoid: revolutionary, supercharge, unleash, trustless, next-gen, magic, effortless.
