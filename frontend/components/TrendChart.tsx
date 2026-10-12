"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui";
import { L } from "@/lib/lexicon";

type Point = { year: number; count: number };

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function palette() {
  return {
    fg: cssVar("--c-fg"),
    muted: cssVar("--c-muted"),
    subtle: cssVar("--c-subtle"),
    line: cssVar("--c-line"),
    lineSoft: cssVar("--c-line-soft"),
    accent: cssVar("--c-accent"),
    accentSoft: cssVar("--c-accent-soft"),
    surface: cssVar("--c-surface"),
  };
}

function compactTick(value: number) {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(value);
}

function optionFor(data: Point[]) {
  const p = palette();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    animation: !reduceMotion,
    animationDuration: 320,
    textStyle: { fontFamily: cssVar("--font-sans-stack") || "inherit" },
    grid: { left: 6, right: 12, top: 34, bottom: 2, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: p.accentSoft } },
      backgroundColor: p.surface,
      borderColor: p.line,
      borderWidth: 1,
      padding: [6, 9],
      extraCssText: "border-radius:8px;",
      textStyle: { color: p.fg, fontSize: 12 },
      formatter: (params: unknown) => {
        const list = params as { name: string; value: number; marker: string }[];
        const row = list[0];
        if (!row) return "";
        return (
          `<div style="font-weight:600;line-height:1.5">${row.name}</div>` +
          `<div style="display:flex;align-items:center;gap:6px;color:${p.muted}">` +
          `${row.marker}<span>${L.node.trend}</span>` +
          `<b style="color:${p.fg};font-variant-numeric:tabular-nums">${Number(row.value).toLocaleString()}</b>` +
          `<span>${L.node.papersUnit}</span></div>`
        );
      },
    },
    xAxis: {
      type: "category",
      data: data.map((d) => String(d.year)),
      axisTick: { alignWithLabel: true, lineStyle: { color: p.line } },
      axisLine: { lineStyle: { color: p.line } },
      axisLabel: { color: p.subtle, fontSize: 11, interval: "auto", hideOverlap: true },
    },
    yAxis: {
      type: "value",
      name: L.node.trendAxis,
      nameLocation: "end",
      nameGap: 14,
      nameTextStyle: { color: p.subtle, fontSize: 11, align: "left", padding: [0, 0, 0, -2] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.subtle, fontSize: 11, formatter: compactTick },
      splitLine: { lineStyle: { color: p.lineSoft, type: "solid" } },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => d.count),
        barMaxWidth: 34,
        itemStyle: { color: p.accent, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: p.accent, opacity: 0.82 } },
      },
    ],
  };
}

function summarize(data: Point[]) {
  const first = data[0].year;
  const last = data[data.length - 1].year;
  const total = data.reduce((s, d) => s + d.count, 0);
  const peak = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
  return {
    label: L.node.trendAria(
      L.node.trendSpan(first, last),
      total.toLocaleString(),
      L.node.trendPeak(peak.year, peak.count.toLocaleString())
    ),
    peak,
    first,
    last,
  };
}

export default function TrendChart({ data }: { data: Point[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (data.length === 0) return;
    let disposed = false;
    let chart: import("echarts/core").EChartsType | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    (async () => {
      const [core, { BarChart }, comps, { CanvasRenderer }] = await Promise.all([
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);
      if (disposed || !host.current) return;
      core.use([
        BarChart,
        comps.GridComponent,
        comps.AxisPointerComponent,
        comps.TooltipComponent,
        CanvasRenderer,
      ]);
      chart = core.init(host.current, undefined, { renderer: "canvas" });
      chart.setOption(optionFor(data));
      setReady(true);

      ro = new ResizeObserver(() => chart?.resize());
      ro.observe(host.current);

      // Palette lives in CSS custom properties; repaint when <html data-theme> flips.
      mo = new MutationObserver(() => chart?.setOption(optionFor(data)));
      mo.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      mo?.disconnect();
      chart?.dispose();
    };
  }, [data]);

  if (data.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-subtle">{L.node.trendEmpty}</p>;
  }

  const info = summarize(data);

  return (
    <div>
      <div className="relative">
        <div ref={host} role="img" aria-label={info.label} className="h-60 w-full sm:h-64" />
        {!ready ? <Skeleton className="absolute inset-0 rounded-lg" /> : null}
      </div>
      <div className="sr-only">
        <table>
          <caption>{info.label}</caption>
          <thead>
            <tr>
              <th scope="col">{L.node.trendYearCol}</th>
              <th scope="col">{L.node.trendCountCol}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.year}>
                <th scope="row">{d.year}</th>
                <td>{d.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
