import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// 240 frames @ 30 fps = 8 s
// All colors pass WCAG AA on #050710 background
const C = {
  bg:          '#050710',
  card:        '#0d0f1c',
  surface:     '#13162d',
  border:      '#222645',
  borderHi:    '#3646a8',
  primary:     '#818cf8',  // lighter indigo — L≈0.72, contrast ~8:1 on bg
  cyan:        '#67e8f9',  // light cyan — high contrast
  violet:      '#c084fc',  // light violet — high contrast
  emerald:     '#34d399',  // bright emerald
  amber:       '#fbbf24',
  fg:          '#e8edf8',  // near-white cool
  fgSub:       '#a8b8d4',  // medium-light blue-grey, ~5.5:1 on bg
  muted:       '#8898b8',  // was #5e6e8c (failed 4.5:1) → now ~5:1 on bg
};

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

export function VestingAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entrance
  const panelY = spring({
    frame,
    fps,
    from: 40,
    to: 0,
    config: { stiffness: 110, damping: 16, mass: 1 },
    durationInFrames: 55,
  });
  const panelOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Staggered section reveals
  const headerIn   = interpolate(frame, [ 8,  38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const metricsIn  = interpolate(frame, [30,  58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const progressIn = interpolate(frame, [55,  80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const row1In     = interpolate(frame, [78, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const row2In     = interpolate(frame, [92, 114], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const row3In     = interpolate(frame, [106,128], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Counting metrics
  const vestedAmt    = Math.floor(interpolate(frame, [50, 175], [0, 4800], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const claimableAmt = Math.floor(interpolate(frame, [65, 175], [0, 1920], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const recipAmt     = Math.floor(interpolate(frame, [58, 140], [0,  128], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // Progress fill
  const progress = interpolate(frame, [80, 215], [0, 0.62], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Status dot pulse
  const pulse = 0.55 + 0.45 * Math.sin((frame / fps) * 2 * Math.PI * 1.1);

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", "system-ui", -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 72% 60% at 50% 52%,
          rgba(129,140,248,0.10) 0%,
          rgba(192,132,252,0.05) 45%,
          transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Dot-grid overlay */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }} aria-hidden>
        <defs>
          <pattern id="grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="#8898b8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Dashboard panel */}
      <div
        style={{
          width: 560,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          background: C.card,
          overflow: 'hidden',
          transform: `translateY(${panelY}px)`,
          opacity: panelOpacity,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(129,140,248,0.07)`,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          opacity: headerIn,
          transform: `translateY(${(1 - headerIn) * 10}px)`,
        }}>
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.primary,       // #818cf8 — 8:1 on bg ✓
              marginBottom: 7,
            }}>
              Distribution Plan
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.fg,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              Ecosystem Grant Stream
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.28)',
            borderRadius: 24,
            padding: '5px 12px',
            flexShrink: 0,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.emerald,
              boxShadow: `0 0 ${10 * pulse}px ${C.emerald}90`,
            }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: C.emerald }}>Active</span>
          </div>
        </div>

        {/* Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '16px 22px',
          borderBottom: `1px solid ${C.border}`,
          opacity: metricsIn,
          transform: `translateY(${(1 - metricsIn) * 8}px)`,
        }}>
          {[
            { label: 'Escrowed',   value: fmt(vestedAmt),    sub: 'USDC locked',    accent: true  },
            { label: 'Claimable',  value: fmt(claimableAmt), sub: 'available now',  accent: false },
            { label: 'Recipients', value: fmt(recipAmt),     sub: 'wallets active', accent: false },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} style={{
              borderLeft: `2px solid ${accent ? C.borderHi : C.border}`,
              paddingLeft: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{label}</div>
              <div style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: 20,
                fontWeight: 800,
                color: accent ? C.fg : C.fgSub,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {value}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          padding: '13px 22px 12px',
          borderBottom: `1px solid ${C.border}`,
          opacity: progressIn,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Locked</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.primary }}>
              {Math.round(progress * 100)}% vested
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Released</span>
          </div>
          <div style={{ height: 6, background: C.surface, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${C.cyan} 0%, ${C.primary} 52%, ${C.violet} 100%)`,
              borderRadius: 4,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 9, color: C.fgSub }}>Cliff</span>
            <span style={{ fontSize: 9, color: C.fgSub }}>Linear vest</span>
            <span style={{ fontSize: 9, color: C.fgSub }}>Complete</span>
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ padding: '10px 14px 14px' }}>
          {[
            { label: 'Recipient',   value: '7xKX...gAsU',    opacity: row1In },
            { label: 'Schedule',    value: 'Cliff + Linear', opacity: row2In },
            { label: 'Next action', value: 'Claim available', opacity: row3In },
          ].map(({ label, value, opacity }) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '7px 11px',
              marginBottom: 4,
              background: C.surface,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              opacity,
              transform: `translateX(${(1 - opacity) * -14}px)`,
            }}>
              <span style={{ fontSize: 11, color: C.fgSub }}>{label}</span>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                fontWeight: 700,
                color: C.fg,
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Watermark */}
      <div style={{
        position: 'absolute',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        opacity: interpolate(frame, [35, 65], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: C.muted,
        whiteSpace: 'nowrap',
      }}>
        Program-owned escrow · Solana
      </div>
    </AbsoluteFill>
  );
}
