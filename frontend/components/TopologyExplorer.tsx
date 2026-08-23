"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Topology3D, { Topology3DBoundary, type TopoLink, type TopoNode, type TopoRouteMeta } from "@/components/Topology3D";
import StageDiagram from "@/components/StageDiagram";
import { L } from "@/lib/lexicon";
import { ROUTE_NAMES, routeColor } from "@/lib/routeColors";

export type TopoData = {
  family: { id: string; name_zh: string; description: string };
  routes_meta: TopoRouteMeta[];
  nodes: TopoNode[];
  links: TopoLink[];
};

export default function TopologyExplorer({
  data,
  initialRoute,
  initialNode,
}: {
  data: TopoData;
  initialRoute?: string;
  initialNode?: string;
}) {
  const routesMeta = data.routes_meta;
  const [selectedId, setSelectedId] = useState<string | null>(initialNode ?? null);
  const [focusToken, setFocusToken] = useState<{ id: string; nonce: number } | null>(
    initialNode ? { id: initialNode, nonce: 1 } : null
  );
  const [resetToken, setResetToken] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    () => new Set(initialRoute ? [initialRoute] : routesMeta.map((r) => r.id))
  );
  const [query, setQuery] = useState("");
  const [peersOpen, setPeersOpen] = useState(true);

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) setFocusToken({ id, nonce: Date.now() });
  };

  const searchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit =
      data.nodes.find((n) => n.label.toLowerCase() === q) ?? data.nodes.find((n) => n.label.toLowerCase().includes(q));
    if (hit) select(hit.id);
  };

  const upstream = selected ? data.links.filter((l) => l.target === selected.id) : [];
  const downstream = selected ? data.links.filter((l) => l.source === selected.id) : [];
  const stagePeers = useMemo(() => {
    if (!selected || selected.kind !== "paper" || !selected.route) return [];
    return data.nodes.filter((n) => n.kind === "paper" && n.route === selected.route && n.stage === selected.stage);
  }, [selected, data.nodes]);
  const stageItems = useMemo(() => {
    if (!selected || !selected.route || selected.stage_idx === undefined) return [];
    return data.nodes.filter((n) => n.kind === "paper" && n.route === selected.route && n.stage_idx === selected.stage_idx);
  }, [selected, data.nodes]);

  const dimOthers = (id: string) => {
    const n = nodeById.get(id);
    if (!n?.route) return;
    setActiveRoutes(new Set([n.route]));
  };

  return (
    <div className="relative h-[calc(100vh-172px)] min-h-[560px] overflow-hidden rounded-xl border border-slate-800 bg-[#0a0f1c]">
      <Topology3DBoundary>
        <Topology3D
          nodes={data.nodes}
          links={data.links}
          routesMeta={routesMeta}
          selectedId={selectedId}
          onSelect={select}
          activeRoutes={activeRoutes}
          focusToken={focusToken}
          resetToken={resetToken}
        />
      </Topology3DBoundary>

      {/* 顶部左：标题与操作说明 */}
      <div className="pointer-events-none absolute left-4 top-3 z-10">
        <div className="text-sm font-semibold text-slate-100">{L.topology.subtitle}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">{L.topology.controlsHint}</div>
      </div>

      {/* 顶部右：检索 */}
      <form onSubmit={searchSubmit} className="absolute right-4 top-3 z-10 w-64">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L.search.placeholder}
          className="w-full rounded-md border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
      </form>

      {/* 左下：图例与筛选 */}
      <div className="absolute bottom-4 left-4 z-10 max-w-[320px] rounded-lg border border-slate-800 bg-slate-900/85 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{L.topology.legendTitle}</span>
          {activeRoutes.size < routesMeta.length && (
            <button
              onClick={() => setActiveRoutes(new Set(routesMeta.map((r) => r.id)))}
              className="text-[11px] text-sky-400 hover:text-sky-300"
            >
              {L.topology.showAll}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {routesMeta.map((r) => {
            const on = activeRoutes.has(r.id);
            return (
              <button
                key={r.id}
                onClick={() =>
                  setActiveRoutes((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.id)) next.delete(r.id);
                    else next.add(r.id);
                    return next;
                  })
                }
                className={`flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] transition ${
                  on ? "border-slate-600 bg-slate-800/80 text-slate-200" : "border-slate-800 bg-slate-900/40 text-slate-600"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: on ? routeColor(r.id) : "#334155", boxShadow: on ? `0 0 6px ${routeColor(r.id)}` : undefined }}
                />
                {r.name_zh}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setResetToken((v) => v + 1)}
          className="mt-2 w-full rounded border border-slate-700 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          {L.topology.resetView}
        </button>
      </div>

      {/* 右侧 HUD：详情面板 */}
      <aside className="absolute right-4 top-14 bottom-4 z-10 w-[340px] max-w-[calc(100%-32px)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/92 p-4 backdrop-blur">
        {!selected && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{data.family.name_zh}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{data.family.description}</p>
            </div>
            <p className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs leading-relaxed text-slate-400">
              {L.hud.selectHint}
            </p>
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{L.topology.routeCount(routesMeta.length)}</div>
              {routesMeta.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded border border-slate-800 px-3 py-2 text-xs text-slate-300">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: routeColor(r.id) }} />
                  <span className="flex-1">{r.name_zh}</span>
                  <span className="text-slate-500">{r.stages.length} {L.routes.stages}</span>
                  <Link href={`/routes/${r.id}`} className="text-sky-400 hover:text-sky-300">
                    {L.hud.openRoute}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected?.kind === "hub" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: routeColor(selected.route ?? "") }} />
              <span className="text-[11px] uppercase tracking-wider text-slate-500">{L.hud.hub}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">{selected.label}</h2>
            {selected.name_en && <p className="text-xs italic text-slate-500">{selected.name_en}</p>}
            <StageDiagram route={selected.route ?? "usd"} />
            {selected.pipeline && (
              <div className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-slate-500">{L.hud.pipeline}：</span>
                {selected.pipeline}
              </div>
            )}
            {selected.insight && (
              <blockquote className="border-l-2 border-amber-500/70 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
                {selected.insight}
              </blockquote>
            )}
            <div className="flex gap-2 text-xs">
              <Link href={`/routes/${selected.route}`} className="rounded bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-500">
                {L.hud.openRoute}
              </Link>
              <button
                onClick={() => dimOthers(selected.id)}
                className="rounded border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
              >
                {L.topology.filters}
              </button>
            </div>
          </div>
        )}

        {selected?.kind === "stage" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: routeColor(selected.route ?? "") }} />
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                {L.hud.stage} · {(selected.stage_idx ?? 0) + 1}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">{selected.label}</h2>
            {selected.stage_description && (
              <p className="text-xs leading-relaxed text-slate-300">{selected.stage_description}</p>
            )}
            <StageDiagram route={selected.route ?? "usd"} />
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {L.hud.peers} · {stageItems.length}
              </div>
              <div className="space-y-1">
                {stageItems.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => select(p.id)}
                    className={`flex w-full items-baseline gap-2 rounded border px-2.5 py-1.5 text-left text-xs ${
                      p.id === selectedId ? "border-sky-500 bg-sky-500/10" : "border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <span className={`font-medium ${p.key ? "text-amber-300" : "text-slate-200"}`}>{p.label}</span>
                    {p.year && <span className="text-slate-500">{p.year}</span>}
                    <span className="ml-auto max-w-[55%] truncate text-slate-500">{p.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selected?.kind === "paper" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: routeColor(selected.route ?? "") }} />
              <span className="text-[11px] uppercase tracking-wider text-slate-500">{L.hud.paper}</span>
              {selected.key && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">{L.hud.key}</span>
              )}
              {selected.year && <span className="text-xs text-slate-400">{selected.year}</span>}
            </div>
            <h2 className="text-lg font-semibold leading-snug text-slate-100">{selected.label}</h2>
            {selected.full_title && <p className="text-xs italic text-slate-500">{selected.full_title}</p>}
            <div className="text-[11px] text-slate-500">
              {ROUTE_NAMES[selected.route ?? ""] ?? selected.route} · {L.hud.stageOf} {(selected.stage_idx ?? 0) + 1} {selected.stage}
            </div>
            {selected.note && <p className="text-xs leading-relaxed text-slate-300">{selected.note}</p>}
            <StageDiagram route={selected.route ?? "usd"} />

            {selected.figure_url ? (
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{L.hud.figure}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.figure_url} alt={selected.label} className="w-full rounded border border-slate-800" />
              </div>
            ) : (
              <p className="rounded border border-dashed border-slate-800 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                {L.hud.figureAbsent}
              </p>
            )}

            <div className="flex flex-wrap gap-2 text-xs">
              {selected.url && (
                <a href={selected.url} target="_blank" rel="noreferrer" className="rounded bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-500">
                  {L.hud.openPaper}
                </a>
              )}
              <Link href={`/routes/${selected.route}`} className="rounded border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">
                {L.hud.openRoute}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{L.hud.upstream}</div>
                <div className="flex flex-wrap gap-1">
                  {upstream.length === 0 && <span className="text-[11px] text-slate-600">{L.common.none}</span>}
                  {upstream.map((l) => (
                    <button
                      key={`u-${l.source}`}
                      onClick={() => select(l.source)}
                      title={l.label}
                      className="rounded border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:border-sky-600"
                    >
                      {nodeById.get(l.source)?.label ?? l.source}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{L.hud.downstream}</div>
                <div className="flex flex-wrap gap-1">
                  {downstream.length === 0 && <span className="text-[11px] text-slate-600">{L.common.none}</span>}
                  {downstream.map((l) => (
                    <button
                      key={`d-${l.target}`}
                      onClick={() => select(l.target)}
                      title={l.label}
                      className="rounded border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:border-sky-600"
                    >
                      {nodeById.get(l.target)?.label ?? l.target}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={() => setPeersOpen((v) => !v)}
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-sky-400"
              >
                {peersOpen ? "▾" : "▸"} {L.hud.peersToggle(stagePeers.length)}
              </button>
              {peersOpen && (
                <div className="mt-1.5 space-y-1">
                  {stagePeers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => select(p.id)}
                      className={`flex w-full items-baseline gap-2 rounded border px-2.5 py-1.5 text-left text-xs ${
                        p.id === selectedId ? "border-sky-500 bg-sky-500/10" : "border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <span className={`font-medium ${p.key ? "text-amber-300" : "text-slate-200"}`}>{p.label}</span>
                      {p.year && <span className="text-slate-500">{p.year}</span>}
                      <span className="ml-auto max-w-[55%] truncate text-slate-500">{p.note}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
