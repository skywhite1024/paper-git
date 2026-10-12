"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clientGet, type NodeDTO, type PaperDTO } from "@/lib/api";
import { L } from "@/lib/lexicon";
import { cx } from "@/components/ui";

type Hits = { papers: PaperDTO[]; nodes: NodeDTO[] };

type Row =
  | { kind: "node"; id: string; primary: string; secondary: string; href: string }
  | { kind: "paper"; id: string; primary: string; secondary: string; href: string };

const EMPTY: Hits = { papers: [], nodes: [] };

export default function GlobalSearch({ className, compact }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hits>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [cursor, setCursor] = useState(0);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  const rows: Row[] = [
    ...hits.nodes.map((n) => ({
      kind: "node" as const,
      id: n.id,
      primary: n.name_zh,
      secondary: n.name_en,
      href: `/nodes/${n.id}`,
    })),
    ...hits.papers.slice(0, 8).map((p) => ({
      kind: "paper" as const,
      id: String(p.id),
      primary: p.title,
      secondary: `${p.year} · ${p.authors[0] ?? ""}${p.authors.length > 1 ? " 等" : ""}`,
      href: `/papers/${p.id}`,
    })),
  ];

  useEffect(() => {
    if (tooShort || !open) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setFailed(false);
      try {
        const data = await clientGet<Hits>(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=8`,
          ctrl.signal
        );
        setHits(data);
        setCursor(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        setBusy(false);
      }
    }, 240);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmed, tooShort, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const submit = () => {
    if (tooShort) return;
    if (rows[cursor]) {
      router.push(rows[cursor].href);
      setOpen(false);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapRef} className={cx("relative", className)}>
      <label htmlFor="pg-search" className="sr-only">
        {L.search.placeholder}
      </label>
      <div
        className={cx(
          "flex items-center gap-2 rounded-lg border border-line bg-raised/70 px-2.5 transition-colors",
          "focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/20",
          compact ? "h-9" : "h-9"
        )}
      >
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-subtle">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.6-3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="pg-search"
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && !tooShort}
          aria-controls="pg-search-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={L.search.placeholder}
          className="h-full w-full min-w-0 bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
        />
        {tooShort ? (
          <kbd className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:block">
            Ctrl K
          </kbd>
        ) : (
          busy && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />
        )}
      </div>

      {open && !tooShort && (
        <div
          id="pg-search-listbox"
          role="listbox"
          className="pg-enter absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-line bg-surface p-1 shadow-pop pg-scroll"
        >
          {failed && <p className="px-3 py-4 text-sm text-danger">{L.search.failed}</p>}
          {!failed && busy && rows.length === 0 && (
            <p className="px-3 py-4 text-sm text-subtle">{L.search.searching}</p>
          )}
          {!failed && !busy && rows.length === 0 && <p className="px-3 py-4 text-sm text-subtle">{L.search.noResult}</p>}

          {rows.map((r, i) => (
            <Link
              key={`${r.kind}-${r.id}`}
              href={r.href}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm",
                i === cursor ? "bg-accent-soft text-accent" : "text-fg"
              )}
            >
              <span className="mt-0.5 shrink-0 text-[10px] uppercase tracking-wider text-subtle">
                {r.kind === "node" ? L.search.tagNode : L.search.tagPaper}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{r.primary}</span>
                <span className="block truncate text-xs text-subtle">{r.secondary}</span>
              </span>
            </Link>
          ))}

          {rows.length > 0 && (
            <button
              type="button"
              onClick={submit}
              className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-raised"
            >
              {L.search.viewAll(trimmed)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
