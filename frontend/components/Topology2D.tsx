"use client";

/**
 * 拓扑列表视图：WebGL 不可用时的等价替代，也作为窄屏与读屏路径。
 * 结构与三维场景一致：路线走廊 -> 阶段地层 -> 代表工作。
 */

import { useMemo } from "react";
import type { TopoNode, TopoRouteMeta } from "@/components/Topology3D";
import { Badge, Dot, cx } from "@/components/ui";
import { L } from "@/lib/lexicon";
import { routeColor } from "@/lib/routeColors";

export default function Topology2D({
  nodes,
  routesMeta,
  activeRoutes,
  selectedId,
  onSelect,
}: {
  nodes: TopoNode[];
  routesMeta: TopoRouteMeta[];
  activeRoutes: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const byRoute = new Map<string, Map<number, TopoNode[]>>();
    for (const n of nodes) {
      if (n.kind !== "paper" || !n.route) continue;
      const idx = n.stage_idx ?? -1;
      let stages = byRoute.get(n.route);
      if (!stages) {
        stages = new Map();
        byRoute.set(n.route, stages);
      }
      const arr = stages.get(idx);
      if (arr) arr.push(n);
      else stages.set(idx, [n]);
    }
    return byRoute;
  }, [nodes]);

  const shown = routesMeta.filter((r) => activeRoutes.has(r.id));

  return (
    <div className="pg-scroll h-full overflow-y-auto px-3 py-3 sm:px-4">
      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{L.topology.hiddenAll}</p>
      ) : (
        <div className="space-y-5">
          {shown.map((r) => {
            const hub = nodes.find((n) => n.kind === "hub" && n.route === r.id);
            const stages = nodes
              .filter((n) => n.kind === "stage" && n.route === r.id)
              .sort((a, b) => (a.stage_idx ?? 0) - (b.stage_idx ?? 0));
            const papers = grouped.get(r.id);
            return (
              <section key={r.id} aria-label={r.name_zh}>
                <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-line pb-2">
                  <Dot color={routeColor(r.id)} />
                  {hub ? (
                    <button
                      type="button"
                      onClick={() => onSelect(hub.id)}
                      className="text-sm font-semibold text-fg hover:text-accent"
                    >
                      {r.name_zh}
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-fg">{r.name_zh}</span>
                  )}
                  <span className="text-[11px] text-subtle">
                    {L.hud.stagesOf(stages.length)} ·{" "}
                    {L.hud.papersOf(stages.reduce((s, st) => s + (papers?.get(st.stage_idx ?? -1)?.length ?? 0), 0))}
                  </span>
                </div>
                <ol className="space-y-2">
                  {stages.map((st) => {
                    const items = papers?.get(st.stage_idx ?? -1) ?? [];
                    return (
                      <li key={st.id} className="rounded-card border border-line bg-raised/40 p-2.5">
                        <button
                          type="button"
                          onClick={() => onSelect(st.id)}
                          className={cx(
                            "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded text-left text-[13px] font-medium hover:text-accent",
                            selectedId === st.id ? "text-accent" : "text-fg"
                          )}
                        >
                          <span className="font-mono text-[11px] text-subtle">{(st.stage_idx ?? 0) + 1}</span>
                          {st.label}
                          <span className="text-[11px] font-normal text-subtle">{items.length}</span>
                        </button>
                        {items.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {items.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => onSelect(p.id)}
                                  title={p.note ?? p.full_title ?? p.label}
                                  className={cx(
                                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                                    selectedId === p.id
                                      ? "border-accent bg-accent-soft text-accent"
                                      : "border-line bg-surface text-muted hover:border-accent hover:text-fg"
                                  )}
                                >
                                  {p.label}
                                  {p.year ? <span className="text-subtle">{p.year}</span> : null}
                                  {p.key ? <Badge tone="warn">{L.hud.key}</Badge> : null}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
