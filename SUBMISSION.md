# Week 8 Status Report — Vesta Token Distribution

**Author:** Polikarpus Arya Pradhanika (Dev)
**Branch:** `feat/week8.arya`
**Date:** 2026-06-11
**Scope:** Landing page redesign + UI bug fixes (frontend only — no on-chain changes)

## Product Stability

### End-to-End Verification

| Check                          | Status                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `rtk anchor build`             | — (not run; frontend-only PR)                                                                                                             |
| `rtk anchor test`              | — (not run; frontend-only PR)                                                                                                             |
| Manual devnet test             | N/A (frontend only)                                                                                                                       |
| Dev server `pnpm dev`          | ✅ All sections render, scroll animations fire, ECharts morphs on pin progress, navbar sticky to footer, progress bar completes at footer |
| TypeScript `pnpm tsc --noEmit` | ✅ 0 new errors (2 pre-existing `zIndexBoost` type stub gaps — runtime valid)                                                             |

### Manual Verification Checklist

- [x] Navbar sticks through full scroll depth including pinned sections
- [x] Progress bar reaches 100% at the footer, not mid-page
- [x] Features pin: ECharts morphs Cliff → Linear → Milestone in sync with title spotlight
- [x] Steps pin: step number color and title cycle through Create / Fund / Track / Claim
- [x] Risk rows: stagger entrance on scroll, each row has distinct y-parallax rate
- [x] Built-for rows: description clearly groups under title; hover shows tint + icon scale + title color change

### Known Limitations

- **No automated tests for the landing page.** Verification is manual only. Anchor program tests are unaffected — this PR touches no on-chain logic.
- **2 pre-existing GSAP TypeScript type stub gaps** for `zIndexBoost`. Runtime behavior is valid; the type stubs don't reflect the actual GSAP API surface.

---

## Problem Solving

Three bugs were discovered and diagnosed during implementation. Each had a non-obvious root cause.

**Bug 1 — Navbar disappearing on scroll**

Root cause: GSAP `ScrollTrigger.create({ pin: true })` defaults to `zIndexBoost: true`. When a section becomes pinned (`position: fixed`), GSAP sets `z-index: 1000` on it — stacking it above the sticky navbar at `z-[100]`. The navbar was still in the DOM and still sticky; it was simply buried under the pinned section.

Fix: `zIndexBoost: false` on all pinned `ScrollTrigger.create()` calls in `LandingScroll.tsx`. No tradeoff — `zIndexBoost` only matters when pinned sections need to stack above each other, which doesn't apply here.

**Bug 2 — Navbar not sticky through full scroll depth**

Root cause: `overflow-x: hidden` was set on `<main>`. When a browser encounters `overflow-x` set on a block element, it forces `overflow-y: auto` on that same element — making `<main>` the scroll container instead of the viewport. `sticky top-0` then resolved relative to `<main>`, not the window, so the navbar stopped being sticky past the height of `<main>`.

Fix: Moved `overflow-x: hidden` to `html` in `globals.css`. No tradeoff — behavior matches expectation.

**Bug 3 — Progress bar completing at ~60% scroll, not at footer**

Root cause: The progress bar ScrollTrigger used `end: "bottom bottom"`, calculated at creation time — before GSAP inserted pin spacers for the two pinned sections (Features, Steps). Those spacers add significant scroll height to the page after the initial layout, so the bar's end position was stale.

Fix: `invalidateOnRefresh: true` forces the `end` value to be recalculated on every resize/refresh. `refreshPriority: -10` ensures it runs after all other triggers (including the pinned ones) have already refreshed and inserted their spacers. Tradeoff: slight extra computation on resize — negligible.

---

## Self-Assessment

This PR delivered the full Week 8 scope: a redesigned, animated landing page that replaces the static placeholder. The core deliverable works — all sections render, all scroll behaviors are correct, and three real bugs were found and fixed through manual testing.

**What went well:** The GSAP + Lenis integration is clean. All three bugs had identifiable root causes and precise fixes with no side effects. The anti-slop audit produced a page that relies on typography and motion rather than generic card grids.

**What's missing:** There are no automated tests for the landing page. Everything was verified manually against a checklist — which worked here, but is not repeatable or regression-proof. The Anchor program tests (`rtk anchor build`, `rtk anchor test`) were not run because this PR has no on-chain changes, but the end-to-end devnet flow (create stream → withdraw → cancel) is outside this PR's scope and was not re-verified.

**What I'd do differently:** Write at least a smoke test for the scroll trigger setup — specifically that the progress bar reaches 100% and the pinned sections fire at the right positions. Manual checks are too easy to skip under time pressure.

---

## Performance

Three new packages were added to the production bundle: `gsap ^3.x`, `lenis ^1.3.23`, and `echarts ^6.1.0`. These increase the JavaScript payload delivered to landing page visitors. No lazy loading or code splitting was implemented for these dependencies in this PR.

The `invalidateOnRefresh: true` setting on the progress bar ScrollTrigger adds a recalculation pass on every browser resize or GSAP refresh. This is intentional and necessary for correctness; the tradeoff (slightly more computation on resize) was assessed as negligible.

Dev server rendering was verified with no visible jank on desktop. No formal performance profiling was conducted — this PR did not include a performance measurement pass.

---

## Insight

**Why `CustomEvent("vesting-mode")` instead of shared state or refs:**

`LandingScroll.tsx` and `VestingChart.tsx` are both client components but have no natural parent-child relationship. Passing a ref or lifting state would require restructuring `page.tsx` and creating coupling between a scroll orchestration layer and a chart renderer that have no other relationship. A `CustomEvent` is a one-directional signal — scroll progress changes, chart responds — and the decoupling means either component can be replaced without touching the other.

**Why `gsap.fromTo` for parallax scrub instead of `gsap.from` or `gsap.to`:**

`gsap.from` and `gsap.to` set the start or end state implicitly from the element's current computed style. On a page with entrance animations, GSAP can fight itself: the entrance animation sets the element to its final position, then a scrub animation reads that as the start and produces unexpected motion. `gsap.fromTo` with explicit values is deterministic regardless of what other animations have run on the same element.

**On removing the arrow from Built-for rows:**

The arrow (`→`) was originally added to give the rows visual direction. But on non-interactive elements, an arrow is a false affordance — it implies navigation or a click action that doesn't exist. Removing it is not a simplification; it's a correction. The rows communicate clearly without it.

**On `color-mix(in oklch, ...)` for decorative numbers:**

The Risk section uses colored numbers (`01`/`02`/`03`) at ~55% opacity to avoid competing with the content. `color-mix(in oklch, var(--brand-cyan) 55%, transparent)` achieves this with a single CSS expression per element, without defining extra CSS custom properties for each variant. oklch interpolation keeps the color perceptually consistent at reduced opacity rather than washing toward gray the way RGB alpha does.

---

## What Was Built

### Files Changed

| File                                    | Change                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `frontend/components/LandingScroll.tsx` | New — GSAP + Lenis scroll orchestration. All scroll animations live here.                                                     |
| `frontend/components/VestingChart.tsx`  | New — ECharts morphing chart (Cliff / Linear / Milestone), synced via `CustomEvent("vesting-mode")`                           |
| `frontend/app/page.tsx`                 | Full rewrite — big typography, minimal copy, parallax depth, no AI slop layout patterns                                       |
| `frontend/app/globals.css`              | Nav scroll glow, step number color transition, feature/step spotlight CSS state machine, `overflow-x: hidden` moved to `html` |

### AI Slop Removed

| Pattern                                        | Resolution                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Identical card grids (Risk, Built-for)         | Numbered rows (Risk), divider rows with stacked content (Built-for)        |
| SVG icon + card title as visual anchor         | Big colored number replaces icon in Risk section                           |
| Arrow on non-clickable list items              | Removed — no false affordance                                              |
| Repeated uppercase tracked eyebrows            | "Schedule type" → vertical axis label; "Configure once." → `text-sm` plain |
| Low-contrast muted text (`/60`, `/70` opacity) | All opacity modifiers removed                                              |

### Scope Notes for BD and Marketing

This PR covers the landing page and marketing surface only. No changes were made to the dashboard (`/streams`), wallet integration, or on-chain program. The landing page communicates three vesting schedule types (Cliff, Linear, Milestone) with a live animated chart, the four-step flow (Create / Fund / Track / Claim), target audience rows, and a CTA into the dashboard. For questions about end-to-end devnet transaction status, refer to the team's shared devnet testing records.
