"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LoopEdge, LoopNode } from "@/lib/api";
import { ROUTE_NAMES, routeColor } from "@/lib/routeColors";
import { L } from "@/lib/lexicon";
import { Card, cx, Dot, SectionTitle } from "@/components/ui";

type Box = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

const KIND_COLOR: Record<string, string> = {
  input: "#94a3b8",
  hub: "#f59e0b",
  route: "#6366f1",
  data: "#10b981",
  process: "#a855f7",
  artifact: "#f43f5e",
};

const KIND_ORDER = ["input", "hub", "route", "data", "process", "artifact"];

function kindColor(kind: string) {
  return KIND_COLOR[kind] ?? "#94a3b8";
}

function kindLabel(kind: string) {
  return L.routes.kind[kind as keyof typeof L.routes.kind] ?? kind;
}

/** Longest-path layering over the acyclic part; the feedback edge is excluded so the loop closes visually. */
function computeLayers(nodes: LoopNode[], edges: LoopEdge[]): string[][] {
  const ids = new Set(nodes.map((n) => n.id));
  const fwd = edges.filter((e) => e.kind !== "feedback" && ids.has(e.from) && ids.has(e.to));
  const out = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const remaining = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const e of fwd) {
    out.get(e.from)!.push(e.to);
    remaining.set(e.to, remaining.get(e.to)! + 1);
  }
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const ready = nodes.filter((n) => remaining.get(n.id) === 0).map((n) => n.id);
  for (let head = 0; head < ready.length; head += 1) {
    const id = ready[head];
    for (const t of out.get(id)!) {
      depth.set(t, Math.max(depth.get(t)!, depth.get(id)! + 1));
      remaining.set(t, remaining.get(t)! - 1);
      if (remaining.get(t) === 0) ready.push(t);
    }
  }
  const maxDepth = Math.max(0, ...depth.values());
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const n of nodes) layers[depth.get(n.id) ?? 0].push(n.id);
  return layers.filter((l) => l.length > 0);
}

/** Anchor on the longest straight run of a connector: that is the empty gutter between two layers. */
function midPoint(pts: Pt[]): Pt {
  let best = pts[Math.floor(pts.length / 2)] ?? { x: 0, y: 0 };
  let bestLen = -1;
  for (let i = 1; i < pts.length; i += 1) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (len > bestLen) {
      bestLen = len;
      best = { x: (pts[i - 1].x + pts[i].x) / 2, y: (pts[i - 1].y + pts[i].y) / 2 };
    }
  }
  return best;
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

function forwardRoute(
  a: Box,
  b: Box,
  horizontal: boolean,
  skip: boolean,
  lane: number,
  top: number,
  left: number
): Pt[] {
  if (horizontal) {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    if (!skip) {
      if (Math.abs(y1 - y2) < 2) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      const mx = x1 + Math.max(20, (x2 - x1) / 2);
      return [{ x: x1, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: x2, y: y2 }];
    }
    const oy = Math.max(6, top - 14 - lane * 10);
    return [
      { x: x1, y: y1 },
      { x: x1 + 22, y: y1 },
      { x: x1 + 22, y: oy },
      { x: x2 - 22, y: oy },
      { x: x2 - 22, y: y2 },
      { x: x2, y: y2 },
    ];
  }
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const x2 = b.x + b.w / 2;
  const y2 = b.y;
  if (!skip) {
    if (Math.abs(x1 - x2) < 2) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const my = y1 + Math.max(14, (y2 - y1) / 2);
    return [{ x: x1, y: y1 }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: y2 }];
  }
  const lx = Math.max(4, left - 12 - lane * 6);
  return [
    { x: a.x, y: y1 - a.h / 2 },
    { x: lx, y: y1 - a.h / 2 },
    { x: lx, y: y2 + b.h / 2 },
    { x: b.x, y: y2 + b.h / 2 },
  ];
}

function feedbackRoute(a: Box, b: Box, horizontal: boolean, channel: number): Pt[] {
  if (horizontal) {
    return [
      { x: a.x + a.w / 2, y: a.y + a.h },
      { x: a.x + a.w / 2, y: channel },
      { x: b.x + b.w / 2, y: channel },
      { x: b.x + b.w / 2, y: b.y + b.h },
    ];
  }
  return [
    { x: a.x, y: a.y + a.h / 2 },
    { x: channel, y: a.y + a.h / 2 },
    { x: channel, y: b.y + b.h / 2 },
    { x: b.x, y: b.y + b.h / 2 },
  ];
}

function labelWidth(text: string) {
  let units = 0;
  for (const ch of text) units += ch.charCodeAt(0) < 256 ? 0.56 : 1;
  return Math.round(units * 11.5) + 18;
}

function overlaps(a: Box, b: Box, pad: number) {
  return (
    a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y
  );
}

/** Nudges each label off the nodes and off already-placed labels; keeps it inside the canvas. */
function placeLabels(
  raw: { key: string; text: string; at: Pt }[],
  obstacles: Box[],
  canvas: { w: number; h: number }
) {
  const placed: Box[] = [];
  return raw.map((lab) => {
    const w = labelWidth(lab.text);
    const h = 20;
    const baseX = Math.min(Math.max(lab.at.x, w / 2 + 2), canvas.w - w / 2 - 2);
    const baseY = lab.at.y;
    for (const dy of [0, 14, -14, 28, -28, 44, -44, 62, -62]) {
      const box = { x: baseX - w / 2, y: baseY + dy - h / 2, w, h };
      const clash =
        box.y < 0 ||
        box.y + box.h > canvas.h ||
        obstacles.some((o) => overlaps(box, o, 3)) ||
        placed.some((p) => overlaps(box, p, 4));
      if (!clash) {
        placed.push(box);
        return { ...lab, x: baseX, y: baseY + dy, box };
      }
    }
    const box = { x: baseX - w / 2, y: baseY - h / 2, w, h };
    placed.push(box);
    return { ...lab, x: baseX, y: baseY, box };
  });
}

export default function LoopGraph({ nodes, edges }: { nodes: LoopNode[]; edges: LoopEdge[] }) {
  const [mode, setMode] = useState<"graph" | "list">("graph");
  const [geom, setGeom] = useState<{ boxes: Record<string, Box>; w: number; h: number } | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const layers = useMemo(() => computeLayers(nodes, edges), [nodes, edges]);
  const layerIdx = useMemo(() => {
    const m = new Map<string, number>();
    layers.forEach((l, i) => l.forEach((id) => m.set(id, i)));
    return m;
  }, [layers]);

  useEffect(() => {
    if (mode !== "graph") return;
    const measure = () => {
      const inner = innerRef.current;
      if (!inner) return;
      const host = inner.getBoundingClientRect();
      const boxes: Record<string, Box> = {};
      for (const [id, el] of nodeRefs.current) {
        const r = el.getBoundingClientRect();
        boxes[id] = { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height };
      }
      setGeom({ boxes, w: inner.offsetWidth, h: inner.offsetHeight });
    };
    measure();
    const inner = innerRef.current;
    const ro = new ResizeObserver(measure);
    if (inner) ro.observe(inner);
    for (const el of nodeRefs.current.values()) ro.observe(el);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mode, layers]);

  const horizontal = useMemo(() => {
    if (!geom) return true;
    const first = layers[0]?.map((id) => geom.boxes[id]).filter(Boolean);
    const last = layers[layers.length - 1]?.map((id) => geom.boxes[id]).filter(Boolean);
    if (!first?.length || !last?.length) return true;
    return Math.max(...last.map((b) => b.x)) > Math.max(...first.map((b) => b.x)) + 8;
  }, [geom, layers]);

  const routes = useMemo(() => {
    if (!geom) return [];
    const boxes = Object.values(geom.boxes);
    if (!boxes.length) return [];
    const top = Math.min(...boxes.map((b) => b.y));
    const bottom = Math.max(...boxes.map((b) => b.y + b.h));
    const left = Math.min(...boxes.map((b) => b.x));
    const channel = horizontal ? bottom + 24 : 4;
    let skipLane = 0;
    return edges.flatMap((e, i) => {
      const a = geom.boxes[e.from];
      const b = geom.boxes[e.to];
      if (!a || !b) return [];
      const feedback = e.kind === "feedback";
      const la = layerIdx.get(e.from) ?? 0;
      const lb = layerIdx.get(e.to) ?? 0;
      const skip = !feedback && lb > la + 1;
      if (skip) skipLane += 1;
      const pts = feedback
        ? feedbackRoute(a, b, horizontal, channel)
        : forwardRoute(a, b, horizontal, skip, skipLane, top, left);
      return [{ key: `${e.from}-${e.to}-${i}`, edge: e, d: pathOf(pts), at: midPoint(pts), feedback, skip }];
    });
  }, [geom, edges, horizontal, layerIdx]);

  const labels = useMemo(() => {
    if (!geom) return [];
    // Stacked layers leave no gutter for detour labels, so those relations live in the list view only.
    const raw = routes
      .filter((r) => r.edge.label && (horizontal || !r.skip))
      .map((r) => ({ key: r.key, text: r.edge.label!, at: r.at }));
    return placeLabels(raw, Object.values(geom.boxes), { w: geom.w, h: geom.h });
  }, [routes, geom, horizontal]);

  const kinds = useMemo(() => {
    const seen = new Set(nodes.map((n) => n.kind));
    return KIND_ORDER.filter((k) => seen.has(k));
  }, [nodes]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1" role="group" aria-label={L.routes.legend}>
          {(["graph", "list"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                mode === m ? "bg-accent-soft text-accent" : "text-muted hover:bg-raised hover:text-fg"
              )}
            >
              {m === "graph" ? L.routes.viewGraph : L.routes.viewList}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle">
          {kinds.map((k) => (
            <li key={k} className="flex items-center gap-1">
              <Dot color={kindColor(k)} />
              {kindLabel(k)}
            </li>
          ))}
        </ul>
      </div>

      {mode === "graph" ? (
        <>
          <div className="pg-scroll overflow-x-auto rounded-card border border-line bg-surface">
            <div
              ref={innerRef}
              role="img"
              aria-label={L.routes.loopFigure(nodes.length, edges.length)}
              className={cx(
                "relative flex flex-col gap-7 py-6 pl-10 pr-4",
                horizontal &&
                  "md:w-max md:flex-row md:items-start md:gap-x-[78px] md:px-8 md:pt-14 md:pb-12"
              )}
            >
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0"
                width={geom?.w ?? 0}
                height={geom?.h ?? 0}
              >
                <defs>
                  <marker id="lg-flow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" style={{ fill: "var(--c-muted)" }} />
                  </marker>
                  <marker id="lg-fb" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L9,4.5 L0,9 z" style={{ fill: "var(--c-accent)" }} />
                  </marker>
                </defs>
                {routes.map((r) => (
                  <path
                    key={r.key}
                    d={r.d}
                    fill="none"
                    strokeWidth={r.feedback ? 2 : 1.5}
                    strokeDasharray={r.feedback ? "6 4" : undefined}
                    style={{ stroke: r.feedback ? "var(--c-accent)" : "var(--c-muted)" }}
                    markerEnd={r.feedback ? "url(#lg-fb)" : "url(#lg-flow)"}
                  />
                ))}
              </svg>

              {layers.map((layer, li) => (
                <div
                  key={layer.join("-")}
                  className={cx(
                    "z-10 flex shrink-0 flex-col gap-3",
                    horizontal ? "md:w-[186px]" : "w-full max-w-[360px]"
                  )}
                >
                  <div
                    className={cx(
                      "text-[11px] font-medium uppercase tracking-[0.09em] text-subtle",
                      horizontal && "md:text-center"
                    )}
                  >
                    {L.routes.layerOf(li + 1)}
                  </div>
                  {layer.map((id) => {
                    const n = byId.get(id);
                    if (!n) return null;
                    const isRoute = n.kind === "route" && n.route;
                    const accent = isRoute ? routeColor(n.route!) : kindColor(n.kind);
                    const body = (
                      <div
                        className={cx(
                          "relative overflow-hidden rounded-lg border border-line bg-surface py-2 pl-3 pr-2.5",
                          "transition-[border-color,box-shadow,transform] duration-150",
                          isRoute ? "hover:-translate-y-0.5 hover:border-accent hover:shadow-pop" : "hover:border-line-soft"
                        )}
                      >
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[3px]"
                          style={{ background: accent }}
                        />
                        <div className="text-[10px] leading-snug text-subtle">
                          <span>{kindLabel(n.kind)}</span>
                          {n.route && ROUTE_NAMES[n.route] ? (
                            <span className="text-accent"> · {ROUTE_NAMES[n.route]}</span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[12.5px] font-semibold leading-snug text-fg">{n.label}</div>
                      </div>
                    );
                    return (
                      <div
                        key={id}
                        ref={(el) => {
                          if (el) nodeRefs.current.set(id, el);
                          else nodeRefs.current.delete(id);
                        }}
                      >
                        {isRoute && n.route ? (
                          <Link href={`/routes/${n.route}`} className="block">
                            {body}
                          </Link>
                        ) : (
                          body
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {labels.map((l) => (
                <span
                  key={l.key}
                  aria-hidden
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10.5px] leading-none text-muted"
                  style={{ left: l.x, top: l.y }}
                >
                  {l.text}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-subtle">
            {L.routes.loopRouteHint} {L.routes.loopFeedbackHint} {L.routes.panHint}
          </p>
        </>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <SectionTitle>{L.routes.loopNodesTitle}</SectionTitle>
            <ol className="space-y-2">
              {layers.flatMap((layer, li) =>
                layer.map((id) => {
                  const n = byId.get(id);
                  if (!n) return [];
                  return (
                    <li key={id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5">
                        <Dot color={n.route ? routeColor(n.route) : kindColor(n.kind)} />
                      </span>
                      <span className="min-w-0">
                        <span className="text-subtle">{L.routes.layerOf(li + 1)} · {kindLabel(n.kind)} · </span>
                        {n.route ? (
                          <Link href={`/routes/${n.route}`} className="font-medium text-accent hover:underline">
                            {n.label}
                          </Link>
                        ) : (
                          <span className="font-medium text-fg">{n.label}</span>
                        )}
                      </span>
                    </li>
                  );
                })
              )}
            </ol>
          </Card>
          <Card className="p-4">
            <SectionTitle>{L.routes.loopEdgesTitle}</SectionTitle>
            <ol className="space-y-2">
              {edges.map((e, i) => (
                <li key={`${e.from}-${e.to}-${i}`} className="text-sm">
                  <span className="font-medium text-fg">{byId.get(e.from)?.label ?? e.from}</span>
                  <span aria-hidden className="mx-1.5 text-subtle">
                    →
                  </span>
                  <span className="font-medium text-fg">{byId.get(e.to)?.label ?? e.to}</span>
                  {e.label ? <span className="text-muted">：{e.label}</span> : null}
                  {e.kind === "feedback" ? (
                    <span className="text-accent"> · {L.routes.feedbackTag}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}
