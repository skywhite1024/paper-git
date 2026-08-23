"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NodeDTO } from "@/lib/api";

function collectMatches(node: NodeDTO, q: string): boolean {
  const hit =
    node.name_zh.toLowerCase().includes(q) ||
    node.name_en.toLowerCase().includes(q) ||
    node.id.toLowerCase().includes(q);
  return hit || (node.children ?? []).some((c) => collectMatches(c, q));
}

function TreeNode({
  node,
  activeId,
  expanded,
  onToggle,
  depth,
}: {
  node: NodeDTO;
  activeId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(node.id);
  const isActive = node.id === activeId;
  const isAncestorOfActive = !!activeId && activeId.startsWith(node.id + ".");

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md px-1 py-0.5 text-sm ${
          isActive ? "bg-blue-100 font-semibold" : isAncestorOfActive ? "bg-blue-50" : "hover:bg-gray-100"
        }`}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="w-4 shrink-0 text-center text-gray-400 hover:text-gray-700"
            aria-label={isOpen ? "折叠" : "展开"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0 text-center text-gray-300">·</span>
        )}
        <Link href={`/nodes/${node.id}`} className={`min-w-0 flex-1 truncate ${isActive ? "text-blue-800" : ""}`}>
          {node.name_zh}
          <span className="ml-1 text-xs text-gray-400">{node.paper_count ?? 0}</span>
        </Link>
      </div>
      {hasChildren && isOpen && (
        <div>
          {children.map((c) => (
            <TreeNode key={c.id} node={c} activeId={activeId} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ancestorsOf(index: Map<string, NodeDTO>, id: string): string[] {
  const chain: string[] = [];
  let cur = index.get(id);
  while (cur?.parent_id) {
    chain.push(cur.parent_id);
    cur = index.get(cur.parent_id);
  }
  return chain;
}

export default function TreeView({ roots, activeId }: { roots: NodeDTO[]; activeId: string | null }) {
  const [query, setQuery] = useState("");
  const index = useMemo(() => {
    const m = new Map<string, NodeDTO>();
    const walk = (n: NodeDTO) => {
      m.set(n.id, n);
      (n.children ?? []).forEach(walk);
    };
    roots.forEach(walk);
    return m;
  }, [roots]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ancestorsOf(index, activeId ?? "")));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const q = query.trim().toLowerCase();
  const visibleRoots = q
    ? roots.filter((r) => collectMatches(r, q))
    : roots;

  return (
    <div className="rounded-lg border border-[var(--pg-border)] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">领域树</span>
        <span className="text-xs text-gray-400">{index.size} 个节点</span>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="过滤节点…"
        className="mb-2 w-full rounded border border-[var(--pg-border)] px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
      />
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {visibleRoots.map((r) => (
          <TreeNode key={r.id} node={r} activeId={activeId} expanded={expanded} onToggle={toggle} depth={0} />
        ))}
        {visibleRoots.length === 0 && <p className="p-2 text-sm text-gray-400">无匹配节点</p>}
      </div>
    </div>
  );
}
