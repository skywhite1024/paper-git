"use client";

import { useEffect, useRef, useState } from "react";
import PaperCard from "@/components/PaperCard";
import { Button } from "@/components/ui";
import { clientGet, type PaperDTO, type PapersResponse } from "@/lib/api";
import { L } from "@/lib/lexicon";

/** Appending past this point costs more scrolling than narrowing the filter. */
const MAX_LOADED = 500;

/** A stalled append would otherwise leave the button stuck on "loading" forever. */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Appends pages below the server-rendered first page so scanning a large subtree
 * does not require clicking through hundreds of pager pages. The caller keys this
 * component by the query identity so a filter or page change remounts it with
 * fresh state instead of keeping a stale, divergent list.
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
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");
  const listRef = useRef<HTMLDivElement>(null);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => inflight.current?.abort(), []);

  const atCap = items.length >= MAX_LOADED;
  const atEnd = page >= totalPages;
  const busy = status === "loading";

  const loadMore = async () => {
    if (busy || atEnd || atCap) return;
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    setStatus("loading");
    try {
      const next = page + 1;
      const data = await clientGet<PapersResponse>(
        `/api/nodes/${encodeURIComponent(slug)}/papers?${apiQuery}&page=${next}`,
        ctrl.signal
      );
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setStatus("idle");
      // Keep the caret with the reader rather than dropping it to <body>, which
      // is what disabling the button would do on every append.
      listRef.current?.focus();
    } catch {
      setStatus("failed");
    } finally {
      clearTimeout(timer);
      if (inflight.current === ctrl) inflight.current = null;
    }
  };

  const message = atCap
    ? L.node.loadMoreCapped(MAX_LOADED)
    : atEnd
      ? L.node.loadMoreEnd
      : status === "failed"
        ? L.node.loadMoreFailed
        : L.node.loadMoreProgress(items.length, total);

  return (
    <div className="space-y-3">
      <div ref={listRef} tabIndex={-1} className="space-y-2 focus:outline-none" aria-label={L.node.listLabel}>
        {items.map((p) => (
          <PaperCard key={p.id} paper={p} />
        ))}
      </div>

      {!atEnd && !atCap ? (
        <div className="flex flex-col items-center gap-1.5">
          <Button onClick={loadMore} aria-disabled={busy || undefined}>
            {busy ? L.node.loadMoreBusy : L.node.loadMore(Math.min(MAX_LOADED - items.length, total - items.length))}
          </Button>
        </div>
      ) : null}

      <p aria-live="polite" className="text-center text-[11px] tabular-nums text-subtle">
        {message}
      </p>
    </div>
  );
}
