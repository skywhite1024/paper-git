"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import StageDiagram from "@/components/StageDiagram";
import Topology2D from "@/components/Topology2D";
import type { TopoLink, TopoNode, TopoRouteMeta } from "@/components/Topology3D";
import { Badge, Button, Dot, Eyebrow, Skeleton, cx, selectCls } from "@/components/ui";
import { LINK_COLORS, ROUTE_NAMES, routeColor } from "@/lib/routeColors";
import { L } from "@/lib/lexicon";

export type TopoData = {
  family: { id: string; name_zh: string; description: string };
  routes_meta: TopoRouteMeta[];
  nodes: TopoNode[];
  links: TopoLink[];
};

const Topology3D = dynamic(() => import("@/components/Topology3D"), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

function SceneSkeleton() {
  return (
    <div className="grid h-full w-full place-content-center gap-3 bg-bg px-8">
      <Skeleton className="mx-auto h-3 w-28" />
      <Skeleton className="mx-auto h-44 w-full max-w-lg" />
      <div className="mx-auto flex gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <p className="mx-auto text-xs text-subtle">{L.topology.sceneLoading}</p>
    </div>
  );
}

/** 三维子树抛错时静默回落到列表视图。 */
class SceneBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </section>
  );
}

function Chip({
  children,
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "rounded-md border px-2 py-1 text-left text-[11px] leading-4 transition-colors",
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-accent hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

function PeerRow({ node, active, onSelect }: { node: TopoNode; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      title={node.note ?? node.full_title ?? node.label}
      className={cx(
        "flex w-full items-baseline gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
        active ? "border-accent bg-accent-soft" : "border-line hover:bg-raised"
      )}
    >
      <span className={cx("font-medium", active ? "text-accent" : "text-fg")}>{node.label}</span>
      {node.key ? <Badge tone="warn">{L.hud.key}</Badge> : null}
      {node.year ? <span className="tabular-nums text-subtle">{node.year}</span> : null}
      <span className="ml-auto max-w-[46%] truncate text-subtle">{node.note}</span>
    </button>
  );
}

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
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [webglOff, setWebglOff] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialNode ?? null);
  const [focusToken, setFocusToken] = useState<{ id: string; nonce: number } | null>(
    initialNode ? { id: initialNode, nonce: 1 } : null
  );
  const [resetToken, setResetToken] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    () => new Set(initialRoute ? [initialRoute] : routesMeta.map((r) => r.id))
  );
  const [legendOpen, setLegendOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(Boolean(initialNode));
  const [peersOpen, setPeersOpen] = useState(false);

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  useEffect(() => {
    const probe = document.createElement("canvas");
    const supported = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
    setLegendOpen(window.innerWidth >= 768);
    if (!supported) {
      setWebglOff(true);
      setMode("2d");
    }
  }, []);

  useEffect(() => {
    if (initialRoute) setActiveRoutes(new Set([initialRoute]));
  }, [initialRoute]);

  useEffect(() => {
    if (!initialNode) return;
    setSelectedId(initialNode);
    setFocusToken({ id: initialNode, nonce: Date.now() });
    setPanelOpen(true);
  }, [initialNode]);

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setFocusToken({ id, nonce: Date.now() });
      setPanelOpen(true);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("route");
    url.searchParams.delete("node");
    if (id) {
      const node = nodeById.get(id);
      if (node?.route) url.searchParams.set("route", node.route);
      url.searchParams.set("node", id);
    }
    window.history.replaceState(null, "", url);
  };

  const switchMode = (next: "3d" | "2d") => {
    setMode(next);
    if (next === "3d" && selectedId) setFocusToken({ id: selectedId, nonce: Date.now() });
  };

  const isolate = (route: string) => setActiveRoutes(new Set([route]));
  const showAll = () => setActiveRoutes(new Set(routesMeta.map((r) => r.id)));

  const upstream = selected ? data.links.filter((l) => l.target === selected.id) : [];
  const downstream = selected ? data.links.filter((l) => l.source === selected.id) : [];
  const stagePeers = useMemo(() => {
    if (!selected || selected.kind !== "paper" || !selected.route) return [];
    return data.nodes.filter(
      (n) => n.kind === "paper" && n.route === selected.route && n.stage_idx === selected.stage_idx && n.id !== selected.id
    );
  }, [selected, data.nodes]);
  const stageItems = useMemo(() => {
    if (!selected || !selected.route || selected.stage_idx === undefined) return [];
    return data.nodes.filter((n) => n.kind === "paper" && n.route === selected.route && n.stage_idx === selected.stage_idx);
  }, [selected, data.nodes]);

  const finder = useMemo(() => {
    const rank = { hub: 0, stage: 1, paper: 2 } as const;
    return routesMeta.map((r) => ({
      route: r,
      items: data.nodes
        .filter((n) => n.route === r.id)
        .sort(
          (a, b) =>
            rank[a.kind] - rank[b.kind] || (a.stage_idx ?? -1) - (b.stage_idx ?? -1) || a.label.localeCompare(b.label)
        ),
    }));
  }, [routesMeta, data.nodes]);

  const kindLabel = (n: TopoNode) => (n.kind === "hub" ? L.hud.hub : n.kind === "stage" ? L.hud.stage : L.hud.paper);
  const routeName = (n: TopoNode) => ROUTE_NAMES[n.route ?? ""] ?? n.route ?? "";

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2">
        <div className="mr-auto min-w-0">
          <div className="truncate text-[13px] font-semibold text-fg">{L.topology.subtitle}</div>
          <div className="mt-0.5 hidden truncate text-[11px] text-subtle lg:block">
            {L.topology.controlsHint} · {L.topology.kbdHint}
          </div>
        </div>

        <div role="group" aria-label={L.topology.viewTitle} className="flex items-center gap-0.5 rounded-lg border border-line bg-raised p-0.5">
          {(["3d", "2d"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={mode === k}
              disabled={k === "3d" && webglOff}
              onClick={() => switchMode(k)}
              className={cx(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === k ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
              )}
            >
              {k === "3d" ? L.topology.view3d : L.topology.view2d}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5">
          <span className="text-[11px] text-subtle">{L.topology.finderLabel}</span>
          <select
            value=""
            aria-label={L.topology.finderLabel}
            onChange={(e) => e.target.value && select(e.target.value)}
            className={cx(selectCls, "h-7 max-w-[190px] text-xs")}
          >
            <option value="">{L.topology.finderPrompt}</option>
            {finder.map((g) => (
              <optgroup key={g.route.id} label={g.route.name_zh}>
                {g.items.map((n) => (
                  <option key={n.id} value={n.id}>
                    {kindLabel(n)} · {n.label}
                    {n.year ? ` (${n.year})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <Button size="sm" onClick={() => setResetToken((v) => v + 1)} disabled={mode !== "3d"}>
          {L.topology.resetView}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="relative h-[52vh] min-h-[380px] md:h-[calc(100vh-300px)] md:min-h-[440px] md:flex-1">
          {mode === "3d" ? (
            <SceneBoundary
              onFail={() => {
                setWebglOff(true);
                setMode("2d");
              }}
            >
              <Topology3D
                nodes={data.nodes}
                links={data.links}
                routesMeta={routesMeta}
                selectedId={selectedId}
                onSelect={select}
                activeRoutes={activeRoutes}
                focusToken={focusToken}
                resetToken={resetToken}
                onUnavailable={() => {
                  setWebglOff(true);
                  setMode("2d");
                }}
              />
            </SceneBoundary>
          ) : (
            <Topology2D
              nodes={data.nodes}
              routesMeta={routesMeta}
              activeRoutes={activeRoutes}
              selectedId={selectedId}
              onSelect={select}
            />
          )}

          {mode === "3d" && (
          <div className="absolute bottom-3 right-3 z-10 w-[min(300px,calc(100%-24px))] rounded-card border border-line bg-surface/92 p-2.5 shadow-card backdrop-blur">
            <div className="flex items-center gap-2">
              <Eyebrow>{L.topology.legendTitle}</Eyebrow>
              {activeRoutes.size < routesMeta.length && (
                <button type="button" onClick={showAll} className="text-[11px] text-accent hover:underline">
                  {L.topology.showAll}
                </button>
              )}
              <button
                type="button"
                onClick={() => setLegendOpen((v) => !v)}
                aria-expanded={legendOpen}
                className="ml-auto text-[11px] text-muted hover:text-fg"
              >
                {legendOpen ? L.topology.legendCollapse : L.topology.legendExpand}
              </button>
            </div>
            {legendOpen && (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {routesMeta.map((r) => {
                    const on = activeRoutes.has(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() =>
                          setActiveRoutes((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                        aria-pressed={on}
                        className={cx(
                          "flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[11px] leading-4 transition-colors",
                          on ? "border-line bg-raised text-fg" : "border-line-soft text-subtle"
                        )}
                      >
                        <Dot color={on ? routeColor(r.id) : "var(--c-subtle)"} />
                        {r.name_zh}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 border-t border-line-soft pt-2">
                  <Eyebrow>{L.topology.linkLegendTitle}</Eyebrow>
                  <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(L.topology.linkKinds).map(([kind, name]) => (
                      <li key={kind} className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span
                          aria-hidden
                          className="h-0.5 w-4 rounded-full"
                          style={{ background: LINK_COLORS[kind] ?? "var(--c-subtle)" }}
                        />
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-subtle">{L.topology.legendHint}</p>
              </>
            )}
          </div>
          )}

          {webglOff && mode === "2d" && (
            <p className="absolute right-3 top-3 z-10 max-w-[220px] rounded-lg border border-line bg-surface/92 px-2.5 py-1.5 text-[11px] leading-4 text-muted shadow-card">
              {L.topology.webglAbsent}
            </p>
          )}
        </div>

        <aside
          aria-label={L.hud.panelTitle}
          className="w-full shrink-0 border-t border-line bg-surface md:w-[330px] md:border-l md:border-t-0"
        >
          <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2 md:border-b-0">
            <Eyebrow className="mr-auto">{selected ? kindLabel(selected) : L.hud.panelTitle}</Eyebrow>
            {selected && (
              <button type="button" onClick={() => select(null)} className="text-[11px] text-muted hover:text-fg">
                {L.hud.clearPick}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              className="text-[11px] text-muted hover:text-fg md:hidden"
            >
              {panelOpen ? L.hud.collapsePanel : L.hud.expandPanel}
            </button>
          </div>

          <div className={cx("pg-scroll max-h-[40vh] overflow-y-auto px-3 py-3 md:max-h-[calc(100vh-356px)]", !panelOpen && "hidden md:block")}>
            {!selected && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-fg">{data.family.name_zh}</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{data.family.description}</p>
                </div>
                <p className="rounded-lg border border-line bg-raised px-3 py-2 text-xs leading-relaxed text-muted">
                  {L.hud.selectHint}
                </p>
                <Group label={L.topology.routeCount(routesMeta.length)}>
                  <ul className="space-y-1">
                    {routesMeta.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs"
                      >
                        <Dot color={routeColor(r.id)} />
                        <button
                          type="button"
                          onClick={() => isolate(r.id)}
                          className="min-w-0 flex-1 truncate text-left text-fg hover:text-accent"
                        >
                          {r.name_zh}
                        </button>
                        <span className="shrink-0 text-[11px] text-subtle">{r.stages.length}</span>
                        <Link href={`/routes/${r.id}`} className="shrink-0 text-[11px] text-accent hover:underline">
                          {L.hud.openRoute}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Group>
              </div>
            )}

            {selected && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Dot color={routeColor(selected.route ?? "")} />
                    <Badge tone="accent">{kindLabel(selected)}</Badge>
                    {selected.key ? <Badge tone="warn">{L.hud.key}</Badge> : null}
                    {selected.year ? (
                      <span className="text-[11px] tabular-nums text-subtle">{selected.year}</span>
                    ) : null}
                    {selected.item_count !== undefined ? (
                      <span className="text-[11px] text-subtle">{L.hud.papersOf(selected.item_count)}</span>
                    ) : null}
                  </div>
                  <h2 className="mt-1.5 text-[15px] font-semibold leading-snug text-fg">{selected.label}</h2>
                  {selected.name_en ? <p className="text-xs italic text-subtle">{selected.name_en}</p> : null}
                  {selected.route ? (
                    <p className="mt-1 text-[11px] text-subtle">
                      {L.hud.routeOf}：{routeName(selected)}
                      {selected.stage_idx !== undefined
                        ? ` · ${L.hud.stageOf} ${(selected.stage_idx ?? 0) + 1} ${selected.stage ?? ""}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 border-y border-line-soft py-2.5">
                  {selected.url && (
                    <Button href={selected.url} size="sm" variant="primary">
                      {L.hud.openPaper}
                    </Button>
                  )}
                  {selected.route && (
                    <>
                      <Button href={`/routes/${selected.route}`} size="sm" variant={selected.url ? "default" : "primary"}>
                        {L.hud.openRoute}
                      </Button>
                      <Button size="sm" onClick={() => isolate(selected.route!)} disabled={mode !== "3d"}>
                        {L.hud.onlyRoute}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => switchMode("3d")} disabled={mode === "3d" || webglOff}>
                        {L.hud.locateInScene}
                      </Button>
                    </>
                  )}
                </div>

                {selected.kind === "hub" && (
                  <>
                    {selected.pipeline && (
                      <Group label={L.hud.pipeline}>
                        <p className="rounded-lg border border-line bg-raised px-3 py-2 text-xs leading-relaxed text-muted">
                          {selected.pipeline}
                        </p>
                      </Group>
                    )}
                    {selected.insight && (
                      <Group label={L.hud.insight}>
                        <blockquote className="border-l-2 border-warn bg-raised px-3 py-2 text-xs leading-relaxed text-fg">
                          {selected.insight}
                        </blockquote>
                      </Group>
                    )}
                    <Group label={L.hud.stageChain}>
                      <StageDiagram route={selected.route ?? ""} caption={routeName(selected)} />
                      <ol className="mt-1.5 space-y-1">
                        {(routesMeta.find((r) => r.id === selected.route)?.stages ?? []).map((s, i) => {
                          const anchor = data.nodes.find((n) => n.kind === "stage" && n.route === selected.route && n.stage_idx === i);
                          return (
                            <li key={s}>
                              <Chip active={selectedId === anchor?.id} onClick={() => anchor && select(anchor.id)}>
                                {i + 1}. {s}
                              </Chip>
                            </li>
                          );
                        })}
                      </ol>
                    </Group>
                  </>
                )}

                {selected.kind === "stage" && (
                  <>
                    {selected.stage_description && (
                      <p className="text-xs leading-relaxed text-muted">{selected.stage_description}</p>
                    )}
                    <Group label={L.hud.stageChain}>
                      <StageDiagram route={selected.route ?? ""} caption={routeName(selected)} />
                    </Group>
                    <Group label={`${L.hud.peers} · ${stageItems.length}`}>
                      <div className="space-y-1">
                        {stageItems.map((p) => (
                          <PeerRow key={p.id} node={p} active={p.id === selectedId} onSelect={select} />
                        ))}
                      </div>
                    </Group>
                  </>
                )}

                {selected.kind === "paper" && (
                  <>
                    {selected.full_title && <p className="text-xs italic leading-relaxed text-subtle">{selected.full_title}</p>}
                    {selected.note && <p className="text-xs leading-relaxed text-muted">{selected.note}</p>}
                    <Group label={L.hud.stageChain}>
                      <StageDiagram route={selected.route ?? ""} caption={routeName(selected)} />
                    </Group>
                    <Group label={L.hud.figure}>
                      {selected.figure_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.figure_url} alt={selected.label} className="w-full rounded-lg border border-line" />
                      ) : (
                        <p className="rounded-lg border border-dashed border-line px-3 py-2 text-[11px] leading-relaxed text-subtle">
                          {L.hud.figureAbsent}
                        </p>
                      )}
                    </Group>
                    <div className="grid grid-cols-2 gap-3">
                      <Group label={L.hud.upstream}>
                        <div className="flex flex-wrap gap-1">
                          {upstream.length === 0 && <span className="text-[11px] text-subtle">{L.common.none}</span>}
                          {upstream.map((l) => (
                            <Chip key={`u-${l.source}`} active={selectedId === l.source} onClick={() => select(l.source)} title={l.label}>
                              {nodeById.get(l.source)?.label ?? l.source}
                            </Chip>
                          ))}
                        </div>
                      </Group>
                      <Group label={L.hud.downstream}>
                        <div className="flex flex-wrap gap-1">
                          {downstream.length === 0 && <span className="text-[11px] text-subtle">{L.common.none}</span>}
                          {downstream.map((l) => (
                            <Chip key={`d-${l.target}`} active={selectedId === l.target} onClick={() => select(l.target)} title={l.label}>
                              {nodeById.get(l.target)?.label ?? l.target}
                            </Chip>
                          ))}
                        </div>
                      </Group>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setPeersOpen((v) => !v)}
                        aria-expanded={peersOpen}
                        className="text-[11px] font-medium uppercase tracking-[0.09em] text-subtle hover:text-fg"
                      >
                        {peersOpen ? "▾" : "▸"} {L.hud.peersToggle(stagePeers.length)}
                      </button>
                      {peersOpen && (
                        <div className="mt-1.5 space-y-1">
                          {stagePeers.map((p) => (
                            <PeerRow key={p.id} node={p} active={p.id === selectedId} onSelect={select} />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
