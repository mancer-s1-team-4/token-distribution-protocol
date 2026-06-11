"use client";

import { useEffect } from "react";

export function LandingScroll() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const [{ default: Lenis }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      gsap.registerPlugin(ScrollTrigger);

      const mm = gsap.matchMedia();

      mm.add(
        {
          noMotion: "(prefers-reduced-motion: no-preference)",
          isDesktop: "(min-width: 1024px)",
        },
        (ctx) => {
          const { noMotion, isDesktop } = ctx.conditions as {
            noMotion: boolean;
            isDesktop: boolean;
          };

          // Reduced motion: reveal everything instantly, skip all animation
          if (!noMotion) {
            document.querySelectorAll("[data-reveal='clip'],[data-reveal='fade']").forEach((el) => {
              (el as HTMLElement).style.opacity = "1";
              (el as HTMLElement).style.clipPath = "none";
            });
            document.querySelectorAll("[data-counter]").forEach((el) => {
              const t = parseFloat((el as HTMLElement).dataset.counter ?? "0");
              el.textContent = t % 1 !== 0 ? t.toFixed(1) + "M" : String(Math.round(t));
            });
            document.querySelectorAll("[data-step]").forEach((el, i) => {
              (el as HTMLElement).dataset.state = i === 0 ? "active" : "pending";
            });
            document.querySelectorAll("[data-feature]").forEach((el, i) => {
              (el as HTMLElement).dataset.featureState = i === 0 ? "active" : "pending";
            });
            return;
          }

          // ── Lenis smooth scroll ───────────────────────────────────────────
          const lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
          });

          lenis.on("scroll", () => ScrollTrigger.update());
          const tickerFn = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(tickerFn);
          gsap.ticker.lagSmoothing(0);

          // ── Nav: staggered entrance + scroll glow + progress bar ─────────
          const navEl = document.querySelector("[data-nav]") as HTMLElement | null;
          const navLogo = document.querySelector("[data-nav-logo]") as HTMLElement | null;
          const navLinks = document.querySelectorAll("[data-nav-link]");
          const navCta = document.querySelector("[data-nav-cta]") as HTMLElement | null;
          const navProgress = document.querySelector("[data-nav-progress]") as HTMLElement | null;

          if (navLogo) gsap.from(navLogo, { x: -20, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.05 });
          if (navLinks.length > 0) gsap.from(navLinks, { y: -12, opacity: 0, stagger: 0.07, duration: 0.5, ease: "power3.out", delay: 0.18 });
          if (navCta) gsap.from(navCta, { x: 20, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.38 });

          // Toggle glow class when user scrolls off the top
          if (navEl) {
            ScrollTrigger.create({
              trigger: "body",
              start: "top top-=1",
              onEnter: () => navEl.classList.add("nav-scrolled"),
              onLeaveBack: () => navEl.classList.remove("nav-scrolled"),
            });
          }

          if (navProgress) {
            gsap.set(navProgress, { scaleX: 0, transformOrigin: "left center" });
            gsap.to(navProgress, {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: "body",
                start: "top top",
                end: "bottom bottom",
                scrub: true,
                invalidateOnRefresh: true,
                refreshPriority: -10,
              },
            });
          }

          // ── Hero panel: 3D depth-collapse on scroll ───────────────────────
          const heroPanel = document.querySelector("[data-parallax='hero-panel']") as HTMLElement | null;
          const heroSection = document.querySelector("[data-section='hero']") as HTMLElement | null;

          if (heroPanel && heroSection) {
            gsap.set(heroPanel, {
              transformPerspective: 1100,
              rotateX: 8,
              rotateY: -7,
              scale: 0.94,
              opacity: 0.72,
            });

            gsap.to(heroPanel, {
              rotateX: 0,
              rotateY: 0,
              scale: 1,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: heroSection,
                start: "top top",
                end: "bottom center",
                scrub: 1.8,
              },
            });

            // Mouse-tracking tilt within hero viewport
            const xTo = gsap.quickTo(heroPanel, "rotateY", { duration: 0.7, ease: "power2.out" });
            const yTo = gsap.quickTo(heroPanel, "rotateX", { duration: 0.7, ease: "power2.out" });

            const onMouseMove = (e: Event) => {
              const me = e as MouseEvent;
              const rect = heroSection.getBoundingClientRect();
              if (rect.bottom < 0 || rect.top > window.innerHeight) return;
              xTo(((me.clientX - rect.left) / rect.width - 0.5) * 7);
              yTo(((me.clientY - rect.top) / rect.height - 0.5) * -5);
            };
            const onMouseLeave = () => { xTo(0); yTo(0); };

            heroSection.addEventListener("mousemove", onMouseMove);
            heroSection.addEventListener("mouseleave", onMouseLeave);
          }

          // ── Background orb parallax ───────────────────────────────────────
          const orb1 = document.querySelector("[data-parallax='orb-1']") as HTMLElement | null;
          const orb2 = document.querySelector("[data-parallax='orb-2']") as HTMLElement | null;

          if (orb1) {
            gsap.to(orb1, {
              y: "-28%",
              ease: "none",
              scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: true },
            });
          }
          if (orb2) {
            gsap.to(orb2, {
              y: "-42%",
              ease: "none",
              scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: true },
            });
          }

          // ── Pinned features — morphing chart spotlight ────────────────────
          const featuresSection = document.querySelector("[data-section='features']") as HTMLElement | null;
          const featureItems = document.querySelectorAll("[data-feature]");
          const featureDots = document.querySelectorAll("[data-feature-dot]");

          if (featuresSection && featureItems.length > 0) {
            const applyFeature = (active: number) => {
              featureItems.forEach((item, i) => {
                (item as HTMLElement).dataset.featureState =
                  i < active ? "done" : i === active ? "active" : "pending";
              });
              featureDots.forEach((dot, i) => {
                if (i === active) {
                  dot.classList.add("is-active-feature");
                } else {
                  dot.classList.remove("is-active-feature");
                }
              });
              document.dispatchEvent(
                new CustomEvent("vesting-mode", { detail: { mode: active } }),
              );
            };

            applyFeature(0);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ScrollTrigger.create({
              trigger: featuresSection,
              pin: true,
              zIndexBoost: false,
              start: "top top",
              end: `+=${featureItems.length * 600}`,
              scrub: true,
              onUpdate: (self: { progress: number }) => {
                const active = Math.min(
                  Math.floor(self.progress * featureItems.length),
                  featureItems.length - 1,
                );
                applyFeature(active);
              },
            } as any);
          }

          // ── Pinned "How it works" — step spotlight ────────────────────────
          const stepsSection = document.querySelector("[data-section='steps']") as HTMLElement | null;
          const stepItems = document.querySelectorAll("[data-step]");
          const stepDots = document.querySelectorAll("[data-step-dot]");
          const stepNumEl = document.querySelector("[data-step-num]") as HTMLElement | null;
          const stepNumColors = [
            "var(--brand-cyan)",
            "var(--primary)",
            "var(--brand-violet)",
            "var(--brand-emerald)",
          ];

          if (stepsSection && stepItems.length > 0) {
            const applyStep = (active: number) => {
              stepItems.forEach((item, i) => {
                (item as HTMLElement).dataset.state =
                  i < active ? "done" : i === active ? "active" : "pending";
              });
              stepDots.forEach((dot, i) => {
                if (i === active) {
                  dot.classList.add("is-active");
                } else {
                  dot.classList.remove("is-active");
                }
              });
              if (stepNumEl) {
                stepNumEl.textContent = `0${active + 1}`;
                stepNumEl.style.color = `color-mix(in oklch, ${stepNumColors[active]} 35%, transparent)`;
              }
            };

            // Set initial state before pin starts
            applyStep(0);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ScrollTrigger.create({
              trigger: stepsSection,
              pin: true,
              zIndexBoost: false,
              start: "top top",
              end: `+=${stepItems.length * 260}`,
              scrub: true,
              onUpdate: (self: { progress: number }) => {
                const active = Math.min(
                  Math.floor(self.progress * stepItems.length),
                  stepItems.length - 1,
                );
                applyStep(active);
              },
            } as any);
          }

          // ── Clip-path wipe for section headings ───────────────────────────
          document.querySelectorAll("[data-reveal='clip']").forEach((el) => {
            gsap.from(el, {
              clipPath: "inset(0 100% 0 0)",
              duration: 0.72,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            });
          });

          // Body text fade-in
          document.querySelectorAll("[data-reveal='fade']").forEach((el) => {
            gsap.from(el, {
              opacity: 0,
              y: 12,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            });
          });

          // ── Counter animations ─────────────────────────────────────────────
          document.querySelectorAll("[data-counter]").forEach((el) => {
            const target = parseFloat((el as HTMLElement).dataset.counter ?? "0");
            const isFloat = target % 1 !== 0;
            const obj = { val: 0 };

            gsap.to(obj, {
              val: target,
              duration: 1.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none none",
              },
              onUpdate: () => {
                el.textContent = isFloat
                  ? obj.val.toFixed(1) + "M"
                  : String(Math.round(obj.val));
              },
            });
          });

          // ── Risk rows: stagger entrance + depth parallax ─────────────────
          document.querySelectorAll("[data-parallax='risk-row']").forEach((row, i) => {
            gsap.from(row, {
              x: -56,
              opacity: 0,
              duration: 0.65,
              ease: "power3.out",
              delay: i * 0.12,
              scrollTrigger: {
                trigger: row,
                start: "top 88%",
                toggleActions: "play none none none",
              },
            });
            gsap.fromTo(
              row,
              { y: 28 - i * 8 },
              {
                y: -(18 - i * 6),
                ease: "none",
                scrollTrigger: {
                  trigger: row,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });

          // ── Audience rows stagger entrance + depth parallax ──────────────
          document.querySelectorAll("[data-parallax='audience-card']").forEach((card, i) => {
            gsap.from(card, {
              x: -32,
              opacity: 0,
              duration: 0.55,
              ease: "power3.out",
              delay: i * 0.08,
              scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none none",
              },
            });
            gsap.fromTo(
              card,
              { y: 20 },
              {
                y: -20,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });

          // ── CTA band scale-in ─────────────────────────────────────────────
          const ctaBand = document.querySelector("[data-parallax='cta-band']") as HTMLElement | null;
          if (ctaBand) {
            gsap.from(ctaBand, {
              scale: 0.93,
              opacity: 0,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: {
                trigger: ctaBand,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            });
          }

          // ── Magnetic CTA buttons ──────────────────────────────────────────
          if (isDesktop) {
            document.querySelectorAll("[data-magnet]").forEach((btn) => {
              const el = btn as HTMLElement;
              const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power2.out" });
              const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power2.out" });

              el.addEventListener("mousemove", (e) => {
                const me = e as MouseEvent;
                const rect = el.getBoundingClientRect();
                xTo((me.clientX - (rect.left + rect.width / 2)) * 0.38);
                yTo((me.clientY - (rect.top + rect.height / 2)) * 0.38);
              });
              el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
            });
          }

          return () => {
            lenis.destroy();
            gsap.ticker.remove(tickerFn);
            ScrollTrigger.getAll().forEach((t) => t.kill());
          };
        },
      );

      cleanup = () => mm.revert();
    };

    init();

    return () => cleanup?.();
  }, []);

  return null;
}
