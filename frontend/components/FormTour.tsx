"use client";

import { useEffect, useRef, useState } from "react";

export type TourStep = {
  fieldId: string;
  label: string;
  explanation: string;
  example: string;
};

type FormTourProps = {
  steps: TourStep[];
  onDone: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

const TOOLTIP_OFFSET = 12;

export function FormTour({ steps, onDone }: FormTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const current = steps[step];

  useEffect(() => {
    function measure() {
      const el = document.getElementById(current.fieldId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [current.fieldId]);

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else onDone();
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  // Compute tooltip position — prefer below, fall back to above
  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) return { display: "none" };
    const viewH = window.innerHeight;
    const tooltipH = 160; // approximate
    const below = rect.top + rect.height + TOOLTIP_OFFSET;
    const above = rect.top - tooltipH - TOOLTIP_OFFSET;

    const top = below + tooltipH < viewH ? below : above;
    const left = Math.min(
      Math.max(rect.left, 8),
      window.innerWidth - 320 - 8
    );

    return { position: "fixed", top, left, width: 320 };
  })();

  // Highlight ring style
  const highlightStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        borderRadius: "0.5rem",
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
        border: "2px solid var(--color-primary, #3348CC)",
        pointerEvents: "none",
        zIndex: 49,
        transition: "top 250ms ease, left 250ms ease, width 250ms ease, height 250ms ease",
      }
    : { display: "none" };

  return (
    <>
      {/* Backdrop handled by box-shadow on highlight */}
      <div style={highlightStyle} aria-hidden="true" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{ ...tooltipStyle, zIndex: 50 }}
        className="rounded-lg border border-border bg-card p-4 shadow-xl"
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step ${step + 1} of ${steps.length}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {step + 1} of {steps.length}
          </span>
          <button
            onClick={onDone}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
        </div>

        <p className="text-sm font-semibold text-foreground">{current.label}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {current.explanation}
        </p>
        <p className="mt-2 rounded-md bg-secondary/60 px-2 py-1.5 font-mono text-xs text-muted-foreground">
          e.g. {current.example}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={back}
            disabled={step === 0}
            className="min-h-8 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:text-foreground/30"
          >
            Back
          </button>
          <button
            onClick={next}
            className="min-h-8 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            {step === steps.length - 1 ? "Got it, let's start" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
