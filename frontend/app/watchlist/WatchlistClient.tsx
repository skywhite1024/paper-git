"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PaperCard from "@/components/PaperCard";
import { Badge, Button, Card, EmptyState, Skeleton, cx } from "@/components/ui";
import { clientGet, type NodeDTO, type PaperDTO } from "@/lib/api";
import { API_BASE } from "@/lib/api";
import { L } from "@/lib/lexicon";

export type Section = { node: NodeDTO; items: PaperDTO[] };
export type Digest = { user: string; days: number; sections: Section[] };

type Status = "loading" | "ready" | "error";
type Toast = { text: string; section: Section; index: number } | null;

const WINDOWS = [7, 14, 30];
const DAY_MS = 86_400_000;

/** 后端 digest 在窗口内无新增时会回退到该方向的近期论文，前端据此标注口径。 */
function isInWindow(p: PaperDTO, days: number) {
  if (!p.published) return false;
  const t = Date.parse(p.published);
  return Number.isFinite(t) && t >= Date.now() - days * DAY_MS;
}

function newestPublished(sections: Section[]): string | null {
  let best: string | null = null;
  for (const s of sections) {
    for (const p of s.items) {
      if (p.published && (!best || p.published > best)) best = p.published;
    }
  }
  return best ? best.slice(0, 10) : null;
}

/**
 * 首屏内容由 `page.tsx` 在服务端取好后传入（默认窗口），切换时间窗口时才在客户端补取，
 * 这样直达链接与慢网络下都不会先看到一屏骨架。
 */
export default function WatchlistClient({
  initialDays,
  initialSections,
}: {
  initialDays: number;
  initialSections: Section[] | null;
}) {
  const [days, setDays] = useState(initialDays);
  const [sections, setSections] = useState<Section[]>(initialSections ?? []);
  const [status, setStatus] = useState<Status>(initialSections ? "ready" : "loading");
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 用户切换过窗口后，服务端首屏数据即失效。 */
  const stale = useRef(false);

  const load = useCallback(async (window: number, signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const data = await clientGet<Digest>(`/api/watch/digest?days=${window}`, signal);
      if (signal?.aborted) return;
      setSections(data.sections);
      setStatus("ready");
    } catch {
      if (signal?.aborted) return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    if (!stale.current && initialSections && days === initialDays) return () => ac.abort();
    load(days, ac.signal);
    return () => ac.abort();
  }, [days, load, initialDays, initialSections]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const showToast = (next: Toast) => {
    setToast(next);
    if (timer.current) clearTimeout(timer.current);
    if (next) timer.current = setTimeout(() => setToast(null), 7000);
  };

  const pickWindow = (w: number) => {
    stale.current = true;
    setDays(w);
  };

  const unwatch = async (index: number) => {
    const removed = sections[index];
    if (!removed) return;
    setSections(sections.filter((_, i) => i !== index));
    showToast({ text: L.watchlist.unwatched(removed.node.name_zh), section: removed, index });
    try {
      const res = await fetch(`${API_BASE}/api/watch/${removed.node.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setSections((cur) => cur.slice(0, index).concat(removed, cur.slice(index)));
      showToast(null);
      setStatus("error");
    }
  };

  const restore = async () => {
    if (!toast) return;
    const { section, index, text } = toast;
    const nextText = text;
    stale.current = true;
    setSections((cur) => cur.slice(0, index).concat(section, cur.slice(index)));
    showToast(null);
    try {
      const res = await fetch(`${API_BASE}/api/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: section.node.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      showToast({ text: L.watchlist.undone(section.node.name_zh), section, index });
    } catch {
      setSections((cur) => cur.filter((s) => s.node.id !== section.node.id));
      showToast({ text: `${L.watchlist.restoreFailed}（${nextText}）`, section, index });
    }
  };

  const total = sections.reduce((a, s) => a + s.items.length, 0);
  const freshBySection = useMemo(() => sections.map((s) => s.items.filter((p) => isInWindow(p, days)).length), [sections, days]);
  const freshTotal = freshBySection.reduce((a, n) => a + n, 0);
  const newest = useMemo(() => newestPublished(sections), [sections]);
  const allFallback = status === "ready" && sections.length > 0 && total > 0 && freshTotal === 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{L.watchlist.title}</h1>
          <div className="flex items-center gap-1" role="group" aria-label={L.watchlist.windowLabel}>
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={days === w}
                onClick={() => pickWindow(w)}
                className={cx(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  days === w ? "bg-accent-soft text-accent" : "text-muted hover:bg-raised hover:text-fg"
                )}
              >
                {L.watchlist.daysLabel(w)}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">{L.watchlist.subtitle(days)}</p>
      </div>

      {allFallback ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-card border border-line bg-raised px-3.5 py-2.5">
          <span className="text-xs text-fg">{L.watchlist.windowEmptyPage(days)}</span>
          {newest ? <span className="text-[11px] text-subtle">{L.watchlist.ingestNewest(newest)}</span> : null}
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <span className="sr-only">{L.watchlist.loading}</span>
          {[0, 1].map((i) => (
            <Card key={i} as="section" className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-7 w-20" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <EmptyState
          title={L.watchlist.errorTitle}
          description={L.watchlist.errorHint}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="sm" onClick={() => load(days)}>
                {L.watchlist.retry}
              </Button>
              <Button href="/nodes/ai" variant="default" size="sm">
                {L.watchlist.emptyAction}
              </Button>
            </div>
          }
        />
      ) : null}

      {status === "ready" && sections.length === 0 ? (
        <EmptyState
          icon="☆"
          title={L.watchlist.emptyTitle}
          description={L.watchlist.emptyHint}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/nodes/ai" variant="primary" size="sm">
                {L.watchlist.emptyAction}
              </Button>
              <Button href="/routes" variant="default" size="sm">
                {L.searchPage.toRoutes}
              </Button>
            </div>
          }
        />
      ) : null}

      {status === "ready" && sections.length > 0 ? (
        <>
          <p className="text-xs text-subtle">
            {[
              L.watchlist.sectionTotal(sections.length),
              L.watchlist.itemsCount(total),
              freshTotal > 0 ? L.watchlist.freshInWindow(freshTotal) : null,
              L.watchlist.ingestHint,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="space-y-4">
            {sections.map((s, i) => {
              const fresh = freshBySection[i] ?? 0;
              const fallback = s.items.length > 0 && fresh === 0;
              return (
                <Card as="section" key={s.node.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="min-w-0 text-base font-semibold text-fg">
                      <Link href={`/nodes/${s.node.id}`} className="hover:text-accent hover:underline">
                        {s.node.name_zh}
                      </Link>
                    </h2>
                    <span className="text-xs text-subtle">{s.node.name_en}</span>
                    <span className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
                      {L.watchlist.itemsCount(s.items.length)}
                    </span>
                    {fallback ? (
                      <Badge tone="neutral" title={L.watchlist.windowEmpty(days)}>
                        {L.watchlist.fallbackTag}
                      </Badge>
                    ) : fresh > 0 ? (
                      <Badge tone="ok">{L.watchlist.freshInWindow(fresh)}</Badge>
                    ) : null}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => unwatch(i)}>
                      {L.watchlist.unwatch}
                    </Button>
                  </div>
                  {fallback && !allFallback ? (
                    <p className="mt-1.5 text-[11px] leading-4 text-subtle">{L.watchlist.windowEmpty(days)}</p>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {s.items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-subtle">
                        {L.watchlist.noItems}
                      </p>
                    ) : (
                      s.items.map((p) => <PaperCard key={p.id} paper={p} />)
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        {toast ? (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-card border border-line bg-surface px-4 py-2.5 shadow-pop">
            <span className="text-sm text-fg">{toast.text}</span>
            <Button variant="default" size="sm" onClick={restore}>
              {L.watchlist.undo}
            </Button>
            <button
              type="button"
              onClick={() => showToast(null)}
              aria-label={L.common.cancel}
              className="rounded px-1 text-sm text-subtle hover:text-fg"
            >
              ×
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
