"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Eyebrow, cx, inputCls } from "@/components/ui";
import { L } from "@/lib/lexicon";
import type { NodeDTO } from "@/lib/api";

function subtreeMatches(node: NodeDTO, q: string): boolean {
  const hit =
    node.name_zh.toLowerCase().includes(q) ||
    node.name_en.toLowerCase().includes(q) ||
    node.id.toLowerCase().includes(q);
  return hit || (node.children ?? []).some((c) => subtreeMatches(c, q));
}

function TreeNodeRow({
  node,
  depth,
  activeId,
  expanded,
  query,
  onToggle,
}: {
  node: NodeDTO;
  depth: number;
  activeId: string | null;
  expanded: Set<string>;
  query: string;
  onToggle: (id: string) => void;
}) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const forcedOpen = query.length > 0 && subtreeMatches(node, query);
  const isOpen = forcedOpen || expanded.has(node.id);
  const isActive = node.id === activeId;
  const isAncestor = !!activeId && activeId.startsWith(node.id + ".");
  const shown = children.length > 0 && isOpen ? children : [];

  return (
    <li>
      <div
        className={cx(
          "flex items-center gap-1 rounded-md py-1 pr-1.5 transition-colors",
          isActive ? "bg-accent-soft" : "hover:bg-raised"
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={(isOpen ? L.node.treeCollapse : L.node.treeExpand)(node.name_zh)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-subtle transition-colors hover:bg-line-soft hover:text-fg"
          >
            <svg
              viewBox="0 0 12 12"
              aria-hidden
              className={cx("h-2.5 w-2.5 transition-transform duration-150", isOpen && "rotate-90")}
            >
              <path d="M4 2.5 8 6l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span aria-hidden className="h-5 w-5 shrink-0 grid place-items-center">
            <span className="h-1 w-1 rounded-full bg-line" />
          </span>
        )}

        <Link
          href={`/nodes/${node.id}`}
          aria-current={isActive ? "page" : undefined}
          title={`${node.name_zh} · ${node.name_en}`}
          className={cx(
            "min-w-0 flex-1 truncate rounded text-[13px] leading-5",
            isActive
              ? "font-semibold text-accent"
              : isAncestor
                ? "font-medium text-fg"
                : "text-muted hover:text-fg"
          )}
        >
          {node.name_zh}
        </Link>

        <span
          className={cx(
            "shrink-0 text-right text-[11px] tabular-nums",
            isActive ? "font-semibold text-accent" : "text-subtle"
          )}
        >
          {(node.paper_count ?? 0).toLocaleString()}
        </span>
      </div>

      {shown.length > 0 && (
        <ul
          className={cx(
            "mt-0.5 space-y-0.5 border-l border-line pl-2",
            depth >= 1 && "ml-2.5"
          )}
        >
          {shown.map((c) => (
            <TreeNodeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              query={query}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
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

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([...ancestorsOf(index, activeId ?? ""), ...roots.map((r) => r.id)])
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const q = query.trim().toLowerCase();
  const visibleRoots = q ? roots.filter((r) => subtreeMatches(r, q)) : roots;

  return (
    <nav
      aria-label={L.node.treeTitle}
      className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-3 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>{L.node.treeTitle}</Eyebrow>
        <span className="text-[11px] tabular-nums text-subtle">{L.node.treeCount(index.size)}</span>
      </div>

      <div>
        <label className="sr-only" htmlFor="tree-filter">
          {L.node.treeFilterLabel}
        </label>
        <input
          id="tree-filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L.node.treeFilterPlaceholder}
          className={cx(inputCls, "h-8 text-[13px]")}
        />
      </div>

      <div className="pg-scroll -mr-1 max-h-[calc(100vh-13rem)] overflow-y-auto pr-1">
        {visibleRoots.length > 0 ? (
          <ul className="space-y-0.5">
            {visibleRoots.map((r) => (
              <TreeNodeRow
                key={r.id}
                node={r}
                depth={0}
                activeId={activeId}
                expanded={expanded}
                query={q}
                onToggle={toggle}
              />
            ))}
          </ul>
        ) : (
          <div className="px-1 py-6 text-center">
            <p className="text-sm text-muted">{L.node.treeNoMatch}</p>
            <p className="mt-1 text-xs text-subtle">{L.node.treeNoMatchHint}</p>
            <Button size="sm" className="mt-3" onClick={() => setQuery("")}>
              {L.node.treeClearFilter}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
