"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RouteEdge, RouteItem, RouteStage } from "@/lib/api";
import { L } from "@/lib/lexicon";
import { Button, cx } from "@/components/ui";

type Box = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

const RELATION_COLOR: Record<string, string> = {
  evolve: "#3b82f6",
  enable: "#10b981",
  compare: "#d97706",
};

const RELATION_ORDER = ["evolve", "enable", "compare"];

function relationLabel(rel: string) {
  return L.routes.relation[rel as keyof typeof L.routes.relation] ?? rel;
}

function pathOf(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const p = pts[i];
    const a = pts[i - 1];
    const b = pts[i + 1];
    const la = Math.hypot(p.x - a.x, p.y - a.y);
    const lb = Math.hypot(b.x - p.x, b.y - p.y);
    const r = Math.min(9, la / 2, lb / 2);
    d += ` L ${p.x + ((a.x - p.x) / (la || 1)) * r} ${p.y + ((a.y - p.y) / (la || 1)) * r}`;
    d += ` Q ${p.x} ${p.y} ${p.x + ((b.x - p.x) / (lb || 1)) * r} ${p.y + ((b.y - p.y) / (lb || 1)) * r}`;
  }
  return `${d} L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
}

/** Forward edges leave the right edge of a card and enter the left edge of the next column's card. */
function routeEdge(a: Box, b: Box, horizontal: boolean, lane: number): Pt[] {
  if (horizontal) {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    if (Math.abs(y1 - y2) < 2) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const mx = x1 + 16 + lane * 9;
    return [{ x: x1, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: x2, y: y2 }];
  }
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const x2 = b.x + b.w / 2;
  const y2 = b.y;
  if (Math.abs(x1 - x2) < 2) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  const my = y1 + 12 + lane * 7;
  return [{ x: x1, y: y1 }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: y2 }];
}

/** Same-column edges join adjacent rows directly and detour through the column gutter otherwise. */
function routeSameColumn(a: Box, b: Box, gutterX: number): Pt[] {
  const below = b.y >= a.y + a.h;
  const y1 = below ? a.y + a.h : a.y;
  const y2 = below ? b.y : b.y + b.h;
  const gap = below ? b.y - (a.y + a.h) : a.y - (b.y + b.h);
  const x1 = a.x + a.w / 2;
  const x2 = b.x + b.w / 2;
  if (gap <= 26) {
    if (Math.abs(x1 - x2) < 2) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const my = (y1 + y2) / 2;
    return [{ x: x1, y: y1 }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: y2 }];
  }
  const ay = a.y + a.h / 2;
  const by = b.y + b.h / 2;
  return [
    { x: a.x + a.w, y: ay },
    { x: gutterX, y: ay },
    { x: gutterX, y: by },
    { x: b.x + b.w, y: by },
  ];
}

/** Same-column or backwards edges detour below the two cards so they never cut through content. */
function routeAround(a: Box, b: Box, channel: number): Pt[] {
  const y = Math.max(a.y + a.h, b.y + b.h) + channel;
  return [
    { x: a.x + a.w / 2, y: a.y + a.h },
    { x: a.x + a.w / 2, y },
    { x: b.x + b.w / 2, y },
    { x: b.x + b.w / 2, y: b.y + b.h },
  ];
}

export default function RouteGraph({
  stages,
  edges,
  routeId,
}: {
  stages: RouteStage[];
  edges: RouteEdge[];
  routeId?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [geom, setGeom] = useState<{ boxes: Record<string, Box>; w: number; h: number } | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const index = useMemo(() => {
    const m = new Map<string, { item: RouteItem; stageIdx: number }>();
    stages.forEach((s, si) => s.items.forEach((it) => m.set(it.label, { item: it, stageIdx: si })));
    return m;
  }, [stages]);

  useEffect(() => {
    const measure = () => {
      const inner = innerRef.current;
      if (!inner) return;
      const host = inner.getBoundingClientRect();
      const boxes: Record<string, Box> = {};
      for (const [label, el] of cardRefs.current) {
        const r = el.getBoundingClientRect();
        boxes[label] = { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height };
      }
      setGeom({ boxes, w: inner.offsetWidth, h: inner.offsetHeight });
    };
    measure();
    const inner = innerRef.current;
    const ro = new ResizeObserver(measure);
    if (inner) ro.observe(inner);
    for (const el of cardRefs.current.values()) ro.observe(el);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stages]);

  const horizontal = useMemo(() => {
    if (!geom || stages.length < 2) return true;
    const a = geom.boxes[stages[0].items[0]?.label ?? ""];
    const b = geom.boxes[stages[1].items[0]?.label ?? ""];
    if (!a || !b) return true;
    return b.x > a.x + 8;
  }, [geom, stages]);

  const neighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const e of edges) {
      if (e.from === active) set.add(e.to);
      if (e.to === active) set.add(e.from);
    }
    return set;
  }, [active, edges]);

  const drawn = useMemo(() => {
    if (!geom) return [];
    const boxes = Object.values(geom.boxes);
    if (!boxes.length) return [];
    const bottom = Math.max(...boxes.map((b) => b.y + b.h));
    const channel = Math.min(34, Math.max(14, geom.h - bottom - 8));
    const colRight = new Map<number, number>();
    for (const [label, meta] of index) {
      const box = geom.boxes[label];
      if (box) colRight.set(meta.stageIdx, Math.max(colRight.get(meta.stageIdx) ?? 0, box.x + box.w));
    }
    const laneCount = new Map<string, number>();
    return edges.flatMap((e, i) => {
      const a = geom.boxes[e.from];
      const b = geom.boxes[e.to];
      if (!a || !b) return [];
      const colA = index.get(e.from)?.stageIdx ?? 0;
      const colB = index.get(e.to)?.stageIdx ?? 0;
      const laneKey = `${colA}-${colB}`;
      const lane = (laneCount.get(laneKey) ?? 0) + 1;
      laneCount.set(laneKey, lane);
      const pts =
        colB > colA
          ? routeEdge(a, b, horizontal, lane % 4)
          : colB === colA
            ? routeSameColumn(a, b, (colRight.get(colA) ?? a.x + a.w) + (horizontal ? 26 : 12))
            : routeAround(a, b, channel + (lane % 3) * 6);
      return [{ key: `${e.from}-${e.to}-${i}`, edge: e, d: pathOf(pts) }];
    });
  }, [geom, edges, horizontal, index]);

  const selectedItem = active ? index.get(active)?.item ?? null : null;
  const incoming = active ? edges.filter((e) => e.to === active) : [];
  const outgoing = active ? edges.filter((e) => e.from === active) : [];
  const relations = useMemo(() => {
    const seen = new Set(edges.map((e) => e.relation));
    return RELATION_ORDER.filter((r) => seen.has(r));
  }, [edges]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-subtle">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {relations.map((rel) => (
            <li key={rel} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0.5 w-5 rounded-full" style={{ background: RELATION_COLOR[rel] }} />
              {relationLabel(rel)}
            </li>
          ))}
        </ul>
        <span>{L.routes.relationHint}</span>
        {active ? (
          <button
            type="button"
            onClick={() => setActive(null)}
            className="rounded-md bg-raised px-2 py-0.5 font-medium text-muted hover:text-fg"
          >
            {L.routes.focusClear}
          </button>
        ) : null}
      </div>

      <div className="pg-scroll overflow-x-auto rounded-card border border-line bg-surface">
        <div
          ref={innerRef}
          className={cx(
            "relative flex flex-col gap-6 px-6 py-5",
            horizontal && "md:w-max md:flex-row md:items-start md:gap-x-[62px] md:px-7 md:py-6"
          )}
        >
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-0" width={geom?.w ?? 0} height={geom?.h ?? 0}>
            <defs>
              {Object.entries(RELATION_COLOR).map(([rel, color]) => (
                <marker key={rel} id={`rg-${rel}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" style={{ fill: color }} />
                </marker>
              ))}
            </defs>
            {drawn.map((d) => {
              const dim = !!active && !(neighbors?.has(d.edge.from) && neighbors?.has(d.edge.to));
              return (
                <path
                  key={d.key}
                  d={d.d}
                  fill="none"
                  strokeWidth={1.7}
                  opacity={dim ? 0.12 : 0.9}
                  style={{ stroke: RELATION_COLOR[d.edge.relation] ?? "var(--c-muted)" }}
                  markerEnd={`url(#rg-${d.edge.relation})`}
                />
              );
            })}
          </svg>

          {stages.map((stage, si) => (
            <div key={stage.name} className={cx("z-10 flex shrink-0 flex-col gap-2.5", horizontal ? "md:w-[236px]" : "w-full")}>
              <div className="rounded-lg border border-line bg-raised px-2.5 py-1.5">
                <div className="text-xs font-semibold text-fg">
                  <span className="tabular-nums text-subtle">{si + 1}. </span>
                  {stage.name}
                </div>
                <div className="text-[10px] text-subtle">{L.routes.stageItems(stage.items.length)}</div>
              </div>
              {stage.items.map((item) => {
                const on = item.label === active;
                const dim = !!active && !neighbors?.has(item.label);
                return (
                  <div
                    key={item.label}
                    ref={(el) => {
                      if (el) cardRefs.current.set(item.label, el);
                      else cardRefs.current.delete(item.label);
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setActive(on ? null : item.label)}
                      onMouseEnter={() => setActive(item.label)}
                      onMouseLeave={() => setActive(null)}
                      className={cx(
                        "block w-full rounded-lg border bg-surface px-2.5 py-2 text-left",
                        "transition-[border-color,box-shadow,opacity,transform] duration-150",
                        on
                          ? "-translate-y-0.5 border-accent shadow-pop"
                          : item.key
                            ? "border-warn/45 hover:border-warn"
                            : "border-line hover:border-accent/60 hover:shadow-card"
                      )}
                      style={{ opacity: dim ? 0.35 : 1 }}
                    >
                      <span className="flex items-start gap-1.5">
                        <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-fg">
                          {item.label}
                        </span>
                        {item.year ? (
                          <span className="shrink-0 rounded bg-raised px-1 text-[10px] tabular-nums text-subtle">
                            {item.year}
                          </span>
                        ) : null}
                      </span>
                      {item.key ? (
                        <span className="mt-1 inline-block rounded bg-warn/12 px-1 text-[9px] font-medium text-warn">
                          {L.routes.keyWork}
                        </span>
                      ) : null}
                      {item.note ? (
                        <span className="mt-1 block text-[11px] leading-snug text-muted">{item.note}</span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedItem ? (
        <div className="pg-enter mt-4 rounded-card border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-fg">{selectedItem.label}</h3>
            {selectedItem.year ? (
              <span className="text-xs tabular-nums text-subtle">{selectedItem.year}</span>
            ) : null}
            {selectedItem.key ? (
              <span className="rounded bg-warn/12 px-1.5 text-[11px] font-medium text-warn">
                {L.routes.keyWorkFull}
              </span>
            ) : null}
          </div>
          {selectedItem.full_title ? (
            <p className="mt-1 text-sm italic text-muted">{selectedItem.full_title}</p>
          ) : null}
          {selectedItem.note ? <p className="mt-2 text-sm text-fg">{selectedItem.note}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {selectedItem.url ? (
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {L.routes.paperLink}
              </a>
            ) : null}
            {routeId ? (
              <Button
                href={`/?route=${routeId}&node=${encodeURIComponent(selectedItem.label)}`}
                variant="default"
                size="sm"
              >
                {L.routes.locateInTopology}
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.09em] text-subtle">
                {L.routes.upstreamLabel}
              </div>
              {incoming.length === 0 ? (
                <p className="text-xs text-subtle">{L.routes.noUpstream}</p>
              ) : (
                <ul className="space-y-1.5">
                  {incoming.map((e) => (
                    <li key={`${e.from}-${e.to}`}>
                      <button
                        type="button"
                        onClick={() => setActive(e.from)}
                        className="flex w-full items-start gap-2 rounded-lg border border-line bg-raised px-2 py-1.5 text-left text-xs text-fg hover:border-accent"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{e.from}</span>
                          {e.label ? <span className="block text-muted">{e.label}</span> : null}
                        </span>
                        <span
                          aria-hidden
                          className="mt-1 h-0.5 w-4 shrink-0 rounded-full"
                          style={{ background: RELATION_COLOR[e.relation] ?? "var(--c-muted)" }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.09em] text-subtle">
                {L.routes.downstreamLabel}
              </div>
              {outgoing.length === 0 ? (
                <p className="text-xs text-subtle">{L.routes.noDownstream}</p>
              ) : (
                <ul className="space-y-1.5">
                  {outgoing.map((e) => (
                    <li key={`${e.from}-${e.to}`}>
                      <button
                        type="button"
                        onClick={() => setActive(e.to)}
                        className="flex w-full items-start gap-2 rounded-lg border border-line bg-raised px-2 py-1.5 text-left text-xs text-fg hover:border-accent"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{e.to}</span>
                          {e.label ? <span className="block text-muted">{e.label}</span> : null}
                        </span>
                        <span
                          aria-hidden
                          className="mt-1 h-0.5 w-4 shrink-0 rounded-full"
                          style={{ background: RELATION_COLOR[e.relation] ?? "var(--c-muted)" }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
