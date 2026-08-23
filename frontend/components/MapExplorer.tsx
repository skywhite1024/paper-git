"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import NetworkMap, { type GraphLink, type GraphNode, type RouteMeta } from "@/components/NetworkMap";
import NetworkMap3D from "@/components/NetworkMap3D";
import StageDiagram from "@/components/StageDiagram";
import { ROUTE_NAMES, routeColor } from "@/lib/routeColors";

type FullNode = GraphNode & {
  name_en?: string;
  pipeline?: string;
  insight?: string;
  item_count?: number;
  stage_description?: string;
  note?: string;
  full_title?: string;
  url?: string;
  figure_url?: string;
};

export type NetworkData = {
  family: { id: string; name_zh: string; description: string };
  routes_meta: RouteMeta[];
  nodes: FullNode[];
  links: GraphLink[];
};

export default function MapExplorer({
  data,
  initialRoute,
  initialNode,
}: {
  data: NetworkData;
  initialRoute?: string;
  initialNode?: string;
}) {
  const routesMeta = data.routes_meta;
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [selectedId, setSelectedId] = useState<string | null>(initialNode ?? null);
  const [focusToken, setFocusToken] = useState<{ id: string; nonce: number } | null>(
    initialNode ? { id: initialNode, nonce: 1 } : null
  );
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    () => new Set(initialRoute ? [initialRoute] : routesMeta.map((r) => r.id))
  );
  const [query, setQuery] = useState("");
  const [showStagePapers, setShowStagePapers] = useState(true);

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  const toggleRoute = (id: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) setFocusToken({ id, nonce: Date.now() });
  };

  const searchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit =
      data.nodes.find((n) => n.label.toLowerCase() === q) ??
      data.nodes.find((n) => n.label.toLowerCase().includes(q));
    if (hit) select(hit.id);
  };

  const upstream = selected ? data.links.filter((l) => l.target === selected.id) : [];
  const downstream = selected ? data.links.filter((l) => l.source === selected.id) : [];
  const stagePeers = useMemo(() => {
    if (!selected || selected.kind !== "paper" || !selected.route) return [];
    return data.nodes.filter(
      (n) => n.kind === "paper" && n.route === selected.route && n.stage === selected.stage
    );
  }, [selected, data.nodes]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--pg-border)] bg-white p-3">
        <div className="flex overflow-hidden rounded-md border border-[var(--pg-border)] text-xs">
          {(["2d", "3d"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 ${mode === m ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {m === "2d" ? "2D 大画布" : "3D 立体网络"}
            </button>
          ))}
        </div>
        <form onSubmit={searchSubmit} className="flex flex-1 sm:max-w-xs">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索方法（如 DIAYN / METRA / ASPIRE）…"
            className="w-full rounded-md border border-[var(--pg-border)] px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          {routesMeta.map((r) => {
            const on = activeRoutes.has(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggleRoute(r.id)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                  on ? "border-transparent text-white" : "border-[var(--pg-border)] bg-white text-gray-500"
                }`}
                style={on ? { background: routeColor(r.id) } : undefined}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: on ? "#fff" : routeColor(r.id) }} />
                {r.name_zh}
              </button>
            );
          })}
          {activeRoutes.size < routesMeta.length && (
            <button
              onClick={() => setActiveRoutes(new Set(routesMeta.map((r) => r.id)))}
              className="rounded-full border border-dashed border-[var(--pg-border)] px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
            >
              显示全部
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <div>
          {mode === "2d" ? (
            <NetworkMap
              nodes={data.nodes}
              links={data.links}
              routesMeta={routesMeta}
              selectedId={selectedId}
              onSelect={select}
              activeRoutes={activeRoutes}
              focusToken={focusToken}
            />
          ) : (
            <NetworkMap3D nodes={data.nodes} links={data.links} onSelect={select} activeRoutes={activeRoutes} />
          )}
          <p className="mt-1.5 text-xs text-gray-500">
            {mode === "2d"
              ? "滚轮缩放 · 拖拽平移 · 双击复位 · 悬停高亮上下游 · 点击节点/路线头查看详情。实线=演进/使能关系，紫色虚线=跨路线闭环回流。"
              : "拖拽旋转 · 滚轮缩放 · 点击节点查看详情。⭐ 关键方法与路线枢纽带标签。"}
          </p>
        </div>

        <aside className="max-h-[calc(100vh-190px)] space-y-3 overflow-y-auto rounded-xl border border-[var(--pg-border)] bg-white p-4">
          {!selected && (
            <div className="space-y-3">
              <h2 className="text-base font-bold">{data.family.name_zh} · 互动网络</h2>
              <p className="text-sm leading-relaxed text-gray-600">{data.family.description}</p>
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                点击任意<b>方法节点</b>查看：一句话贡献、论文链接、架构/阶段图示、上下游演进、同阶段全部论文；
                点击顶部<b>路线枢纽</b>查看路线主流程与洞察。
              </div>
              <div className="text-xs font-semibold text-gray-500">六条路线</div>
              {routesMeta.map((r) => (
                <Link
                  key={r.id}
                  href={`/routes/${r.id}`}
                  className="flex items-center gap-2 rounded-lg border border-[var(--pg-border)] px-3 py-2 text-sm hover:border-blue-400"
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: routeColor(r.id) }} />
                  {r.name_zh}
                  <span className="ml-auto text-xs text-gray-400">{r.stages.length} 阶段 →</span>
                </Link>
              ))}
            </div>
          )}

          {selected?.kind === "hub" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: routeColor(selected.route ?? "") }} />
                <h2 className="text-lg font-bold">{selected.label}</h2>
              </div>
              {selected.name_en && <p className="text-xs italic text-gray-400">{selected.name_en}</p>}
              <StageDiagram route={selected.route ?? "usd"} />
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700">
                <b className="text-gray-500">主流程：</b>
                {selected.pipeline}
              </div>
              {selected.insight && (
                <blockquote className="border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-gray-700">
                  {selected.insight}
                </blockquote>
              )}
              <Link
                href={`/routes/${selected.route}`}
                className="inline-block rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                打开完整路线页 →
              </Link>
            </div>
          )}

          {selected?.kind === "paper" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-bold">
                  {selected.key && "⭐"}
                  {selected.label}
                </h2>
                {selected.year && <span className="text-sm text-gray-500">{selected.year}</span>}
              </div>
              {selected.full_title && <p className="text-sm italic text-gray-500">{selected.full_title}</p>}
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="rounded-full px-2 py-0.5 text-white" style={{ background: routeColor(selected.route ?? "") }}>
                  {ROUTE_NAMES[selected.route ?? ""] ?? selected.route}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  阶段 {(selected.stage_idx ?? 0) + 1} · {selected.stage}
                </span>
              </div>
              {selected.note && <p className="text-sm leading-relaxed text-gray-700">{selected.note}</p>}

              <div>
                <div className="mb-1 text-xs font-semibold text-gray-500">阶段示意（该阶段在路线中的位置）</div>
                <StageDiagram route={selected.route ?? "usd"} />
              </div>

              {selected.figure_url ? (
                <div>
                  <div className="mb-1 text-xs font-semibold text-gray-500">论文架构图</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.figure_url} alt={`${selected.label} 架构图`} className="w-full rounded-lg border border-[var(--pg-border)]" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--pg-border)] p-3 text-xs leading-relaxed text-gray-500">
                  架构图：当前为自绘阶段示意图。单篇论文原图可在 <code>routes/routes.yaml</code> 为该节点补充
                  <code> figure_url</code>（自截图存放于 <code>frontend/public/figures/</code>）后在此展示。
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                    论文页 ↗
                  </a>
                )}
                <Link href={`/routes/${selected.route}`} className="rounded border border-[var(--pg-border)] px-3 py-1 text-gray-600 hover:bg-gray-50">
                  所属路线页
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="mb-1 font-semibold text-gray-500">上游</div>
                  <div className="flex flex-wrap gap-1">
                    {upstream.length === 0 && <span className="text-gray-400">无</span>}
                    {upstream.map((l) => (
                      <button
                        key={`u-${l.source}`}
                        onClick={() => select(l.source)}
                        className="rounded-full border border-[var(--pg-border)] bg-white px-2 py-0.5 hover:border-blue-400"
                        title={l.label}
                      >
                        ↑ {nodeById.get(l.source)?.label ?? l.source}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-semibold text-gray-500">下游</div>
                  <div className="flex flex-wrap gap-1">
                    {downstream.length === 0 && <span className="text-gray-400">无</span>}
                    {downstream.map((l) => (
                      <button
                        key={`d-${l.target}`}
                        onClick={() => select(l.target)}
                        className="rounded-full border border-[var(--pg-border)] bg-white px-2 py-0.5 hover:border-blue-400"
                        title={l.label}
                      >
                        ↓ {nodeById.get(l.target)?.label ?? l.target}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setShowStagePapers((v) => !v)}
                  className="mb-1 text-xs font-semibold text-gray-500 hover:text-blue-600"
                >
                  {showStagePapers ? "▾" : "▸"} 该阶段涉及的文章（{stagePeers.length}）
                </button>
                {showStagePapers && (
                  <div className="space-y-1">
                    {stagePeers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => select(p.id)}
                        className={`flex w-full items-baseline gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm ${
                          p.id === selected.id ? "border-blue-500 bg-blue-50" : "border-[var(--pg-border)] hover:border-blue-300"
                        }`}
                      >
                        <span className="font-medium">
                          {p.key && "⭐"}
                          {p.label}
                        </span>
                        {p.year && <span className="text-xs text-gray-400">{p.year}</span>}
                        <span className="ml-auto line-clamp-1 max-w-[55%] text-xs text-gray-400">{p.note}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
