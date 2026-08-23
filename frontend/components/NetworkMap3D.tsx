"use client";

import { useEffect, useRef } from "react";
import type { GraphLink, GraphNode } from "@/components/NetworkMap";
import { LINK_COLORS, routeColor } from "@/lib/routeColors";

/**
 * 3D 立体网络模式（3d-force-graph / three.js）。与 2D 大画布共享同一份数据与选中逻辑。
 */
export default function NetworkMap3D({
  nodes,
  links,
  onSelect,
  activeRoutes,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (id: string) => void;
  activeRoutes: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    let disposed = false;

    (async () => {
      const ForceGraph3DModule: any = await import("3d-force-graph");
      const SpriteTextModule: any = await import("three-spritetext");
      if (disposed || !containerRef.current) return;
      const ForceGraph3D = ForceGraph3DModule.default;

      const graph = new ForceGraph3D(containerRef.current)
        .backgroundColor("#0b1220")
        .nodeLabel((n: any) => `${n.kind === "hub" ? "【路线】" : ""}${n.label}${n.stage ? ` · ${n.stage}` : ""}`)
        .nodeVal((n: any) => (n.kind === "hub" ? 8 : n.key ? 4 : 2))
        .nodeColor((n: any) => routeColor(n.route ?? ""))
        .nodeOpacity(0.9)
        .linkColor((l: any) => LINK_COLORS[l.kind] ?? "#94a3b8")
        .linkOpacity(0.6)
        .linkWidth((l: any) => (l.kind === "loop" ? 1.6 : 0.8))
        .onNodeClick((n: any) => selectRef.current(n.id))
        .nodeThreeObject((n: any) => {
          if (n.kind !== "hub" && !n.key) return null;
          const sprite = new SpriteTextModule.default(n.label);
          sprite.color = "#e2e8f0";
          sprite.textHeight = n.kind === "hub" ? 6 : 4;
          sprite.position.set(0, n.kind === "hub" ? 10 : 8, 0);
          return sprite;
        });
      graphRef.current = graph;
    })();

    return () => {
      disposed = true;
      if (graphRef.current) {
        graphRef.current._destructor?.();
        graphRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const visible = nodes.filter((n) => n.kind === "hub" || !n.route || activeRoutes.has(n.route));
    const ids = new Set(visible.map((n) => n.id));
    const visibleLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target));
    graph.graphData({
      nodes: visible.map((n) => ({ ...n })),
      links: visibleLinks.map((l) => ({ ...l })),
    });
  }, [nodes, links, activeRoutes]);

  return <div ref={containerRef} className="h-[calc(100vh-190px)] min-h-[520px] w-full rounded-xl border border-[var(--pg-border)] bg-[#0b1220]" />;
}
