"use client";

import { useState } from "react";
import PaperCard from "@/components/PaperCard";
import { Button } from "@/components/ui";
import { clientGet, type PaperDTO, type PapersResponse } from "@/lib/api";
import { L } from "@/lib/lexicon";

/**
 * Appends pages below the server-rendered first page so scanning a large subtree
 * does not require clicking through hundreds of pager pages. The pager stays for
 * deep links and no-JS use; `?page=N` remains the source of truth for position.
 */
export default function PapersFeed({
  slug,
  apiQuery,
  startPage,
  totalPages,
  total,
  initial,
}: {
  slug: string;
  apiQuery: string;
  startPage: number;
  totalPages: number;
  total: number;
  initial: PaperDTO[];
}) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(startPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const remaining = Math.max(0, total - items.length);
  const canLoad = page < totalPages;

  const loadMore = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const next = page + 1;
      const data = await clientGet<PapersResponse>(
        `/api/nodes/${encodeURIComponent(slug)}/papers?${apiQuery}&page=${next}`
      );
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((p) => (
          <PaperCard key={p.id} paper={p} />
        ))}
      </div>

      {canLoad ? (
        <div className="flex flex-col items-center gap-1.5">
          {failed && <p className="text-xs text-danger">{L.node.loadMoreFailed}</p>}
          <Button onClick={loadMore} disabled={loading}>
            {loading ? L.node.loadMoreBusy : L.node.loadMore(remaining)}
          </Button>
          <p aria-live="polite" className="text-[11px] tabular-nums text-subtle">
            {L.node.loadMoreProgress(items.length, total)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
