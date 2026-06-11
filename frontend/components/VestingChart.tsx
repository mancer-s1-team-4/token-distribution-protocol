"use client";

import { useEffect, useRef } from "react";

export type VestingMode = 0 | 1 | 2;

const MONTHS = Array.from({ length: 25 }, (_, i) => i);

// Same data-point count on all modes — ECharts interpolates smoothly between them
const getData = (mode: VestingMode): number[] => {
  if (mode === 0) {
    // Cliff: locked until month 12, then full release
    return MONTHS.map((m) => (m < 12 ? 0 : 100));
  }
  if (mode === 1) {
    // Linear: gradual release each month
    return MONTHS.map((m) => Math.round((m / 24) * 100));
  }
  // Milestone: step releases at month 6, 12, 18, 24
  return MONTHS.map((m) => {
    if (m < 6) return 0;
    if (m < 12) return 25;
    if (m < 18) return 50;
    if (m < 24) return 75;
    return 100;
  });
};

const LINE: Record<VestingMode, string> = {
  0: "#67e8f9",
  1: "#818cf8",
  2: "#c084fc",
};

const AREA: Record<VestingMode, string> = {
  0: "#3b82f6",
  1: "#c084fc",
  2: "#f59e0b",
};

function buildOption(mode: VestingMode) {
  const line = LINE[mode];
  const area = AREA[mode];

  return {
    animation: true,
    animationDuration: 900,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    grid: { top: "8%", right: "5%", bottom: "18%", left: "9%" },
    xAxis: {
      type: "category",
      data: MONTHS,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
      axisTick: { show: false },
      axisLabel: {
        color: "rgba(255,255,255,0.22)",
        fontSize: 11,
        interval: 0,
        formatter: (v: string) => {
          const n = Number(v);
          if (n === 0) return "Start";
          if (n === 24) return "24m";
          if (n % 6 === 0) return `${n}m`;
          return "";
        },
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      interval: 25,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "rgba(255,255,255,0.22)",
        fontSize: 11,
        formatter: "{value}%",
      },
      splitLine: {
        lineStyle: { color: "rgba(255,255,255,0.05)", type: "dashed" },
      },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(7,9,22,0.96)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: line, fontSize: 12 },
      formatter: (params: Array<{ axisValue: number; value: number }>) => {
        const p = params[0];
        if (!p) return "";
        return `Month ${p.axisValue} &nbsp; <b>${p.value}%</b> vested`;
      },
    },
    series: [
      {
        id: "vesting",
        type: "line",
        data: getData(mode),
        smooth: false,
        step: false,
        lineStyle: { color: line, width: 2.5, cap: "round" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: line + "44" },
              { offset: 1, color: area + "06" },
            ],
          },
        },
        symbol: "none",
        emphasis: {
          scale: false,
          lineStyle: { width: 2.5 },
        },
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          lineStyle: {
            color: "rgba(255,255,255,0.12)",
            type: "dashed",
            width: 1,
          },
          label: {
            show: true,
            position: "insideEndTop",
            formatter: "Now",
            color: "rgba(255,255,255,0.28)",
            fontSize: 10,
            distance: 4,
          },
          data: [{ xAxis: 12 }],
        },
      },
    ],
  };
}

export function VestingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMode = useRef<VestingMode>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let disposeChart: (() => void) | undefined;

    (async () => {
      const { init } = await import("echarts");
      if (cancelled || !containerRef.current) return;

      const chart = init(containerRef.current, null, { renderer: "canvas" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.setOption(buildOption(0) as any);

      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(containerRef.current!);

      const onMode = (e: Event) => {
        const mode = (e as CustomEvent<{ mode: VestingMode }>).detail.mode;
        if (mode === activeMode.current) return;
        activeMode.current = mode;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart.setOption(buildOption(mode) as any);
      };

      document.addEventListener("vesting-mode", onMode);

      disposeChart = () => {
        ro.disconnect();
        document.removeEventListener("vesting-mode", onMode);
        chart.dispose();
      };
    })();

    return () => {
      cancelled = true;
      disposeChart?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Vesting schedule visualization"
    />
  );
}
