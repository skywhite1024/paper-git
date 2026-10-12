import Link from "next/link";
import type { Metadata } from "next";
import PaperCard from "@/components/PaperCard";
import { Badge, Breadcrumbs, Button, Card, EmptyState, Eyebrow, SectionTitle, Tabs, inputCls } from "@/components/ui";
import { apiGet, type NodeDTO, type PaperDTO } from "@/lib/api";
import { L } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: L.searchPage.headTitle,
  description: "按论文标题、摘要与研究方向关键词检索 PaperGit 语料。",
};

const BASE_LIMIT = 30;
const MAX_LIMIT = 100;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const parts = text.split(new RegExp(`(${escapeRe(query)})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-accent">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function href(q: string, scope: string, limit?: number) {
  const p = new URLSearchParams({ q, scope });
  if (limit) p.set("limit", String(limit));
  return `/search?${p.toString()}`;
}

function NodeChip({ node, query }: { node: NodeDTO; query: string }) {
  return (
    <Link
      href={`/nodes/${node.id}`}
      className="flex flex-col gap-1 rounded-card border border-line bg-surface px-3.5 py-3 shadow-card transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-pop"
    >
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold text-fg">
          <Highlight text={node.name_zh} query={query} />
        </span>
        <span className="text-[11px] text-subtle">
          <Highlight text={node.name_en} query={query} />
        </span>
      </span>
      <span className="line-clamp-2 text-xs leading-relaxed text-muted">{node.description}</span>
      <span className="flex flex-wrap items-center gap-1">
        {node.paper_count !== undefined ? <Badge tone="outline">{L.searchPage.nodePapers(node.paper_count)}</Badge> : null}
        {node.keywords.slice(0, 3).map((k) => (
          <Badge key={k} tone="neutral">
            <Highlight text={k} query={query} />
          </Badge>
        ))}
      </span>
    </Link>
  );
}

function Guidance({ query }: { query?: string }) {
  return (
    <div className="space-y-5">
      <EmptyState
        icon="⌕"
        title={L.searchPage.minChars}
        description={L.searchPage.minCharsHint}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button href="/nodes/ai" variant="primary" size="sm">
              {L.searchPage.toTree}
            </Button>
            <Button href="/routes" variant="default" size="sm">
              {L.searchPage.toRoutes}
            </Button>
            <Button href="/" variant="default" size="sm">
              {L.searchPage.toTopology}
            </Button>
          </div>
        }
      />
      <Card as="section" className="p-4">
        <SectionTitle>{L.searchPage.hotQueries}</SectionTitle>
        <ul className="flex flex-wrap gap-2">
          {L.searchPage.hotQueryList.map((q) => (
            <li key={q}>
              <Link
                href={href(q, "all")}
                className="rounded-lg border border-line bg-raised px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {q}
              </Link>
            </li>
          ))}
        </ul>
        {query ? (
          <p className="mt-3 text-xs text-subtle">
            “{query}” — {L.searchPage.minChars}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const scope = sp.scope === "papers" || sp.scope === "nodes" ? sp.scope : "all";
  const limit = Math.min(Math.max(Number(sp.limit) || BASE_LIMIT, 1), MAX_LIMIT);

  if (query.length < 2) return <Guidance query={query} />;

  const data = await apiGet<{ query: string; papers: PaperDTO[]; nodes: NodeDTO[] }>(
    `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  const total = data.papers.length + data.nodes.length;

  return (
    <div className="space-y-5">
      <div>
        <Breadcrumbs
          items={[{ label: L.brand, href: "/" }, { label: L.searchPage.headTitle, href: "/search" }, { label: query }]}
          className="mb-3"
        />
        <Card as="section" className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <Eyebrow>{L.searchPage.eyebrow}</Eyebrow>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                <Highlight text={query} query={query} />
              </h1>
              <p aria-live="polite" className="mt-1 text-sm text-muted">
                {L.searchPage.resultCount(query, data.papers.length, data.nodes.length)}
              </p>
            </div>
            <form action="/search" method="get" className="flex w-full max-w-xs shrink-0 items-center gap-2">
              <label className="sr-only" htmlFor="q">
                {L.searchPage.refine}
              </label>
              <input
                id="q"
                name="q"
                defaultValue={query}
                className={inputCls}
                placeholder={L.search.placeholder}
                autoComplete="off"
              />
              <Button type="submit" variant="primary" size="md">
                {L.searchPage.refineSubmit}
              </Button>
            </form>
          </div>
          {query.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/search" className="rounded-md px-1.5 py-0.5 text-subtle hover:text-accent hover:underline">
                {L.searchPage.clear}
              </Link>
            </div>
          ) : null}
        </Card>
      </div>

      <Tabs
        items={[
          { key: "all", label: L.searchPage.scopeAll, count: total },
          { key: "papers", label: L.searchPage.scopePapers, count: data.papers.length },
          { key: "nodes", label: L.searchPage.scopeNodes, count: data.nodes.length },
        ]}
        active={scope}
        hrefFor={(key) => href(query, key, limit)}
      />

      {total === 0 ? (
        <EmptyState
          icon="⌕"
          title={L.searchPage.emptyTitle}
          description={L.searchPage.emptyHint(query)}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/nodes/ai" variant="primary" size="sm">
                {L.searchPage.toTree}
              </Button>
              <Button href="/routes" variant="default" size="sm">
                {L.searchPage.toRoutes}
              </Button>
              <Button href="/" variant="default" size="sm">
                {L.searchPage.toTopology}
              </Button>
            </div>
          }
        />
      ) : null}

      {scope !== "nodes" && data.papers.length > 0 ? (
        <section aria-labelledby="papers-title" className="space-y-2">
          <SectionTitle id="papers-title" hint={L.searchPage.papersShown(data.papers.length)}>
            {L.searchPage.papersTitle}
          </SectionTitle>
          {data.papers.map((p) => (
            <PaperCard key={p.id} paper={p} />
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {data.papers.length >= limit && limit < MAX_LIMIT ? (
              <Button href={href(query, scope, MAX_LIMIT)} variant="default" size="sm">
                {L.searchPage.showMore}
              </Button>
            ) : null}
            {limit > BASE_LIMIT ? (
              <Button href={href(query, scope, BASE_LIMIT)} variant="ghost" size="sm">
                {L.searchPage.showLess}
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {scope !== "papers" && data.nodes.length > 0 ? (
        <section aria-labelledby="nodes-title" className="space-y-2">
          <SectionTitle id="nodes-title" hint={L.searchPage.nodesShown(data.nodes.length)}>
            {L.searchPage.nodesTitle}
          </SectionTitle>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {data.nodes.map((n) => (
              <NodeChip key={n.id} node={n} query={query} />
            ))}
          </div>
        </section>
      ) : null}

      {scope === "papers" && data.papers.length === 0 ? (
        <EmptyState
          icon="⌕"
          title={L.searchPage.noPapers}
          description={L.searchPage.emptyHint(query)}
          action={
            <Button href={href(query, "all")} variant="primary" size="sm">
              {L.searchPage.scopeAll}
            </Button>
          }
        />
      ) : null}
      {scope === "nodes" && data.nodes.length === 0 ? (
        <EmptyState
          icon="⌕"
          title={L.searchPage.noNodes}
          description={L.searchPage.emptyHint(query)}
          action={
            <Button href={href(query, "all")} variant="primary" size="sm">
              {L.searchPage.scopeAll}
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
