'use client';

import { useState, useEffect, startTransition } from 'react';
import { Player } from '@remotion/player';
import { VestingAnimation } from './VestingAnimation';

const DURATION = 240;
const FPS = 30;
const COMP_W = 640;
const COMP_H = 360;

export function VestingPlayer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { startTransition(() => setMounted(true)); }, []);

  if (!mounted) {
    return (
      <div
        style={{ aspectRatio: `${COMP_W} / ${COMP_H}` }}
        className="flex w-full items-center justify-center rounded-xl border border-border/60 bg-card/30"
      >
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/60" />
        </div>
      </div>
    );
  }

  return (
    <Player
      component={VestingAnimation}
      durationInFrames={DURATION}
      compositionWidth={COMP_W}
      compositionHeight={COMP_H}
      fps={FPS}
      loop
      autoPlay
      clickToPlay={false}
      acknowledgeRemotionLicense
      style={{ width: '100%', height: 'auto', display: 'block' }}
      inputProps={{}}
    />
  );
}
