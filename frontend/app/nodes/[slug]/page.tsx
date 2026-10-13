import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PaperCard from "@/components/PaperCard";
import PapersFeed from "@/components/PapersFeed";
import TrendChart from "@/components/TrendChart";
import TreeView from "@/components/TreeView";
import WatchButton from "@/components/WatchButton";
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  SectionTitle,
  Stat,
  Tabs,
  cx,
  inputCls,
  selectCls,
} from "@/components/ui";
import {
  apiGet,
  type NodeDetailDTO,
  type PaperDTO,
  type PapersResponse,
  type TimelineResponse,
  type TreeResponse,
} from "@/lib/api";
import { L } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

const TAB_KEYS = ["overview", "papers", "timeline", "feed"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const SORTS = ["new", "citations", "year"] as const;
type SortKey = (typeof SORTS)[number];

const SORT_LABEL: Record<SortKey, string> = {
  new: L.node.sortNew,
  citations: L.node.sortCitations,
  year: L.node.sortYear,
};

/** 后端 `/api/nodes/{id}/papers` 的 per_page 上限为 100（见 backend/app/api/nodes.py）。 */
const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PER_PAGE = 20;

type PaperQuery = {
  page: number;
  sort: SortKey;
  perPage: number;
  year?: string;
  q?: string;
};

/** 论文列表的口径：子树内独立论文（同一论文挂多个方向只计一次）。 */
type Scope = {
  /** 子树内独立论文数，与论文列表 total 同口径。 */
  distinct: number;
  /** 子树内「论文 × 方向」挂载条目数，后端未去重时的旧口径。 */
  linked: number;
};

function paperHref(slug: string, query: PaperQuery) {
  const sp = new URLSearchParams({ tab: "papers", sort: query.sort, page: String(query.page) });
  if (query.perPage !== DEFAULT_PER_PAGE) sp.set("per_page", String(query.perPage));
  if (query.year) sp.set("year", query.year);
  if (query.q) sp.set("q", query.q);
  return `/nodes/${encodeURIComponent(slug)}?${sp.toString()}`;
}

function tabHref(slug: string, tab: string) {
  return `/nodes/${encodeURIComponent(slug)}?tab=${tab}`;
}

function nodeHref(id: string) {
  return `/nodes/${encodeURIComponent(id)}`;
}

function hiddenFields(query: PaperQuery) {
  const fields: { name: string; value: string }[] = [
    { name: "tab", value: "papers" },
    { name: "sort", value: query.sort },
  ];
  if (query.perPage !== DEFAULT_PER_PAGE) fields.push({ name: "per_page", value: String(query.perPage) });
  if (query.year) fields.push({ name: "year", value: query.year });
  if (query.q) fields.push({ name: "q", value: query.q });
  return fields;
}

async function getNode(slug: string): Promise<NodeDetailDTO> {
  try {
    return await apiGet<NodeDetailDTO>(`/api/nodes/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof Error && /: 404$/.test(e.message)) notFound();
    throw e;
  }
}

/**
 * 列表接口的 `total` 是子树内去重后的论文数；详情接口的 `stats.paper_count` 在旧后端里
 * 会把「同一论文挂多个方向」重复累加。以列表口径为准，取不到时回退，保证标题与列表不自相矛盾。
 */
async function getListTotal(slug: string): Promise<number | null> {
  try {
    const res = await apiGet<Pick<PapersResponse, "total">>(
      `/api/nodes/${encodeURIComponent(slug)}/papers?per_page=1&page=1`
    );
    return res.total;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getNode(slug);
  return {
    title: `${detail.name_zh} · ${L.node.eyebrow}`,
    description: detail.description,
  };
}

/**
 * Boundary pager cells must not be focusable links: `pointer-events-none` only
 * swallows mouse clicks, so keyboard users could still activate `?page=0`,
 * which the API rejects with 422.
 */
function PagerEdge({ href, label }: { href: string | null; label: string }) {
  const cls =
    "inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-xs text-muted transition-colors";
  if (!href) {
    return (
      <span aria-disabled="true" className={cx(cls, "opacity-45")}>
        {label}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cx(cls, "hover:bg-raised hover:text-fg")}>
      {label}
    </Link>
  );
}

function pageWindow(current: number, total: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let p = 1; p <= total; p++) {
    const keep = p === 1 || p === total || Math.abs(p - current) <= 1;
    const value = keep ? p : null;
    if (out[out.length - 1] !== value) out.push(value);
  }
  return out;
}

export default async function NodePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab: TabKey = TAB_KEYS.includes(sp.tab as TabKey) ? (sp.tab as TabKey) : "overview";
  const [detail, listTotal, tree] = await Promise.all([
    getNode(slug),
    getListTotal(slug),
    apiGet<TreeResponse>("/api/nodes"),
  ]);
  const scope: Scope = {
    distinct: listTotal ?? detail.stats.paper_count,
    linked: detail.stats.paper_count,
  };

  const crumb = detail.ancestors.map((a, i) => ({
    label: a.name_zh,
    href: i < detail.ancestors.length - 1 ? nodeHref(a.id) : undefined,
  }));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="order-2 min-w-0 lg:sticky lg:top-[72px] lg:order-1">
        <TreeView roots={tree.roots} activeId={slug} />
      </aside>

      <div className="order-1 min-w-0 space-y-5 lg:order-2">
        <header className="space-y-3">
          <Breadcrumbs items={[{ label: L.node.crumbHome, href: "/" }, ...crumb]} />

          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <Eyebrow className="mb-1 block">
                {L.node.eyebrow} · {detail.name_en}
              </Eyebrow>
              <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[28px]">
                {detail.name_zh}
                <span
                  className="ml-2 align-baseline text-sm font-normal text-subtle"
                  title={L.node.statPapersDistinctHint}
                >
                  {L.node.paperCountSuffix(scope.distinct)}
                </span>
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">{detail.description}</p>
              <p className="mt-1.5 max-w-3xl text-xs text-subtle">{L.node.scopeNote}</p>
            </div>
            <WatchButton nodeId={slug} nodeName={detail.name_zh} />
          </div>
        </header>

        <Tabs
          active={tab}
          hrefFor={(key) => tabHref(slug, key)}
          items={[
            { key: "overview", label: L.node.overview },
            { key: "papers", label: L.node.papersTab, count: scope.distinct },
            { key: "timeline", label: L.node.timeline },
            { key: "feed", label: L.node.feed },
          ]}
        />

        <div>
          {tab === "overview" ? <Overview slug={slug} detail={detail} scope={scope} /> : null}
          {tab === "papers" ? (
            <PapersTab
              slug={slug}
              scope={scope}
              query={{
                page: Math.max(1, parseInt(sp.page ?? "1", 10) || 1),
                sort: SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "new",
                perPage: PER_PAGE_OPTIONS.includes(Number(sp.per_page) as (typeof PER_PAGE_OPTIONS)[number])
                  ? Number(sp.per_page)
                  : DEFAULT_PER_PAGE,
                year: sp.year,
                q: sp.q,
              }}
            />
          ) : null}
          {tab === "timeline" ? <TimelineTab slug={slug} scope={scope} childCount={detail.children.length} /> : null}
          {tab === "feed" ? <FeedTab slug={slug} /> : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- overview */

async function Overview({ slug, detail, scope }: { slug: string; detail: NodeDetailDTO; scope: Scope }) {
  const trends = await apiGet<{ data: { year: number; count: number }[] }>(
    `/api/nodes/${encodeURIComponent(slug)}/trends`
  );
  const milestones = Array.from(new Map(detail.milestones.map((p) => [p.id, p])).values());
  const linkedShown = scope.linked > scope.distinct;
  /* 年度趋势与时间线仍按「论文 × 方向」聚合，合计可能高于去重后的论文数。 */
  const trendInflated = trends.data.reduce((acc, d) => acc + d.count, 0) > scope.distinct;

  return (
    <div className="space-y-5">
      <div className={cx("grid gap-3 sm:grid-cols-2", linkedShown ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        <Stat
          label={L.node.statPapers}
          value={scope.distinct.toLocaleString()}
          hint={L.node.statPapersDistinctHint}
        />
        {linkedShown ? (
          <Stat label={L.node.statLinked} value={scope.linked.toLocaleString()} hint={L.node.statLinkedHint} />
        ) : null}
        <Stat
          label={L.node.statSpan}
          value={detail.stats.year_min ? `${detail.stats.year_min}–${detail.stats.year_max}` : L.common.none}
        />
        <Stat
          label={L.node.statMilestones}
          value={detail.stats.milestone_count.toLocaleString()}
          hint={detail.stats.milestone_count > 0 ? L.node.statMilestonesHint : undefined}
        />
        <Stat label={L.node.statSubfields} value={detail.children.length} hint={L.node.statSubfieldsHint} />
      </div>

      {detail.children.length > 0 ? (
        <section>
          <SectionTitle hint={L.node.subfieldsHint}>{L.node.subfields}</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detail.children.map((c) => (
              <Card as="div" key={c.id} className="transition-[border-color,box-shadow] hover:border-accent/45 hover:shadow-pop">
                <Link href={nodeHref(c.id)} className="block px-3.5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-fg">{c.name_zh}</span>
                    <span
                      className="shrink-0 text-xs tabular-nums text-subtle"
                      title={linkedShown ? L.node.statLinkedHint : L.node.statPapersDistinctHint}
                    >
                      {(c.paper_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{c.description}</p>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle hint={trendInflated ? L.node.trendHintLinked : L.node.trendHint}>
          {L.node.trendTitle}
        </SectionTitle>
        <Card className="p-3">
          {trends.data.length > 0 ? (
            <TrendChart data={trends.data} />
          ) : (
            <EmptyState
              title={L.node.trendEmpty}
              description={L.node.trendEmptyHint}
              action={
                <Button href={paperHref(slug, { page: 1, sort: "new", perPage: DEFAULT_PER_PAGE })}>
                  {L.node.toPapers}
                </Button>
              }
            />
          )}
        </Card>
      </section>

      {milestones.length > 0 ? (
        <section>
          <SectionTitle hint={L.node.milestonesHint(milestones.length)}>{L.node.milestonesTitle}</SectionTitle>
          <div className="space-y-2">
            {milestones.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      ) : null}

      {detail.keywords.length > 0 ? (
        <section>
          <SectionTitle hint={L.node.keywordsHint}>{L.node.keywordsTitle}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {detail.keywords.map((k) => (
              <Link
                key={k}
                href={`/search?q=${encodeURIComponent(k)}`}
                className="rounded-md bg-raised px-2 py-1 text-xs text-muted transition-colors hover:bg-accent-soft hover:text-accent"
              >
                {k}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------- papers */

async function PapersTab({ slug, query, scope }: { slug: string; query: PaperQuery; scope: Scope }) {
  const api = new URLSearchParams({
    sort: query.sort,
    page: String(query.page),
    per_page: String(query.perPage),
  });
  if (query.year) api.set("year", query.year);
  if (query.q) api.set("q", query.q);
  const apiWithoutPage = new URLSearchParams(api);
  const data = await apiGet<PapersResponse>(`/api/nodes/${encodeURIComponent(slug)}/papers?${api.toString()}`);

  const perPage = data.per_page || query.perPage;
  const totalPages = Math.max(1, Math.ceil(data.total / perPage));
  if (query.page > totalPages && data.total > 0) {
    redirect(paperHref(slug, { ...query, page: totalPages }));
  }

  const activeChips = [
    query.q ? { key: "q", text: `${L.node.filterKeyword}: ${query.q}` } : null,
    query.year ? { key: "year", text: `${L.node.filterYear}: ${query.year}` } : null,
  ].filter((c): c is { key: string; text: string } => c !== null);

  const hasFilter = Boolean(query.q || query.year);
  const clearedHref = paperHref(slug, { page: 1, sort: query.sort, perPage: query.perPage });
  const from = data.total === 0 ? 0 : (query.page - 1) * perPage + 1;
  const to = Math.min(data.total, (query.page - 1) * perPage + data.items.length);
  const linkedShown = scope.linked > scope.distinct;
  /* 年份桶在后端是按「论文 × 方向」计数聚合的，可能高于去重后的论文数——此时只展示年份本身。 */
  const yearSum = data.years.reduce((acc, y) => acc + y.count, 0);
  const yearCountsReliable = yearSum <= scope.distinct;

  return (
    <div className="space-y-3">
      <Card as="section" className="p-3">
        <form action={`/nodes/${encodeURIComponent(slug)}`} method="get" className="flex flex-wrap items-end gap-2">
          {hiddenFields(query).map((f) => (
            <input key={f.name} type="hidden" name={f.name} value={f.value} />
          ))}

          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="paper-q" className="mb-1 block text-xs text-subtle">
              {L.node.filterKeyword}
            </label>
            <input
              id="paper-q"
              name="q"
              defaultValue={query.q ?? ""}
              placeholder={L.node.searchPlaceholder}
              className={cx(inputCls, "h-8")}
            />
          </div>

          <div className="min-w-0 flex-1 basis-32">
            <label htmlFor="paper-year" className="mb-1 block text-xs text-subtle">
              {L.node.filterYear}
            </label>
            <select id="paper-year" name="year" defaultValue={query.year ?? ""} className={cx(selectCls, "h-8 w-full")}>
              <option value="">{L.node.allYears}</option>
              {data.years.map((y) => (
                <option key={y.year} value={y.year}>
                  {yearCountsReliable ? L.node.yearOption(y.year, y.count) : y.year}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 basis-32">
            <label htmlFor="paper-sort" className="mb-1 block text-xs text-subtle">
              {L.node.filterSort}
            </label>
            <select id="paper-sort" name="sort" defaultValue={query.sort} className={cx(selectCls, "h-8 w-full")}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" variant="primary" size="sm" className="h-8">
            {L.node.applyFilter}
          </Button>
        </form>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-soft pt-2.5">
          <p className="text-xs text-muted tabular-nums">
            {L.node.rangeSummary(from, to, data.total)}
            <span className="text-subtle"> · </span>
            {L.node.pageSummary(query.page, totalPages)}
          </p>
          {activeChips.map((c) => (
            <Badge key={c.key} tone="outline">
              {c.text}
            </Badge>
          ))}
          {hasFilter ? (
            <Button size="sm" variant="ghost" href={clearedHref}>
              {L.node.clearFilters}
            </Button>
          ) : null}
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-subtle">
          <span>{L.node.listScopeNote}</span>
          {linkedShown ? (
            <span title={L.node.linkedNoteHint} className="rounded-md bg-raised px-1.5 py-0.5 tabular-nums">
              {L.node.linkedNote(scope.linked)}
            </span>
          ) : null}
        </p>
      </Card>

      {data.items.length > 0 ? (
        <PapersFeed
          slug={slug}
          apiQuery={apiWithoutPage.toString()}
          startPage={query.page}
          totalPages={totalPages}
          total={data.total}
          initial={data.items}
        />
      ) : (
        <EmptyState
          title={L.node.emptyPapers}
          description={hasFilter ? L.node.emptyPapersFiltered : L.node.emptyPapersAll}
          action={
            hasFilter ? (
              <Button href={clearedHref}>{L.node.clearFilters}</Button>
            ) : (
              <Button href={tabHref(slug, "timeline")}>{L.node.toTimeline}</Button>
            )
          }
        />
      )}

      {data.total > 0 ? (
        <nav aria-label={L.node.pagerLabel} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-1">
          {totalPages > 1 ? (
            <ul className="flex flex-wrap items-center justify-center gap-1">
              <li>
                <PagerEdge
                  href={query.page > 1 ? paperHref(slug, { ...query, page: query.page - 1 }) : null}
                  label={L.node.pagerPrev}
                />
              </li>
              {pageWindow(query.page, totalPages).map((p, i) =>
                p === null ? (
                  <li key={`gap-${i}`} aria-hidden className="px-1 text-xs text-subtle">
                    …
                  </li>
                ) : (
                  <li key={p}>
                    <Link
                      href={paperHref(slug, { ...query, page: p })}
                      aria-label={L.node.pagerPageLabel(p)}
                      aria-current={p === query.page ? "page" : undefined}
                      className={cx(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs tabular-nums transition-colors",
                        p === query.page
                          ? "border-accent bg-accent-soft font-semibold text-accent"
                          : "border-line text-muted hover:bg-raised hover:text-fg"
                      )}
                    >
                      {p}
                    </Link>
                  </li>
                )
              )}
              <li>
                <PagerEdge
                  href={query.page < totalPages ? paperHref(slug, { ...query, page: query.page + 1 }) : null}
                  label={L.node.pagerNext}
                />
              </li>
            </ul>
          ) : null}

          <div
            role="group"
            aria-label={L.node.perPageGroupLabel}
            className="flex items-center gap-1 rounded-lg border border-line p-0.5"
          >
            <span className="px-1 text-[11px] text-subtle">{L.node.perPageGroupLabel}</span>
            {PER_PAGE_OPTIONS.map((n) => (
              <Link
                key={n}
                href={paperHref(slug, { ...query, page: 1, perPage: n })}
                aria-label={L.node.perPageAria(n)}
                aria-current={n === perPage ? "true" : undefined}
                className={cx(
                  "inline-flex h-7 items-center rounded-md px-1.5 text-xs tabular-nums transition-colors",
                  n === perPage
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-muted hover:bg-raised hover:text-fg"
                )}
              >
                {n}
              </Link>
            ))}
          </div>

          {totalPages > 1 ? (
            <form action={`/nodes/${encodeURIComponent(slug)}`} method="get" className="flex items-center gap-1.5">
              {hiddenFields(query).map((f) => (
                <input key={f.name} type="hidden" name={f.name} value={f.value} />
              ))}
              <label htmlFor="paper-jump" className="whitespace-nowrap text-xs text-subtle">
                {L.node.pagerJump}
              </label>
              <input
                id="paper-jump"
                name="page"
                type="number"
                min={1}
                max={totalPages}
                defaultValue={query.page}
                className={cx(inputCls, "h-8 w-20 text-center")}
              />
              <span className="whitespace-nowrap text-[11px] tabular-nums text-subtle">
                {L.node.pagerJumpLabel(totalPages)}
              </span>
              <Button type="submit" size="sm" className="h-8">
                {L.node.pagerGo}
              </Button>
            </form>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- timeline */

async function TimelineTab({
  slug,
  scope,
  childCount,
}: {
  slug: string;
  scope: Scope;
  childCount: number;
}) {
  const data = await apiGet<TimelineResponse>(`/api/nodes/${encodeURIComponent(slug)}/timeline`);

  if (data.years.length === 0) {
    return (
      <EmptyState
        title={L.node.emptyTimeline}
        description={L.node.emptyTimelineHint}
        action={<Button href={paperHref(slug, { page: 1, sort: "year", perPage: DEFAULT_PER_PAGE })}>{L.node.toPapers}</Button>}
      />
    );
  }

  /* 时间线的年份条目按「论文 × 方向」聚合且单年有统计上限，与论文列表的去重口径不同。 */
  const showNote = childCount > 0 || data.years.reduce((acc, b) => acc + b.count, 0) > scope.distinct;

  return (
    <div className="space-y-5">
      {showNote ? <p className="text-xs text-subtle">{L.node.timelineSubtreeNote}</p> : null}
      {data.years.map((bucket) => (
        <section key={bucket.year}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-sm font-semibold tabular-nums text-accent">
              {bucket.year}
            </span>
            <span className="text-xs text-subtle tabular-nums">{L.node.yearBucketCount(bucket.count)}</span>
            {bucket.count > bucket.papers.length ? (
              <span className="text-xs text-subtle">{L.node.yearBucketSample(bucket.papers.length)}</span>
            ) : null}
          </div>
          <div className="space-y-2 border-l border-line pl-4 ml-1">
            {bucket.papers.map((p) => (
              <PaperCard key={p.id} paper={p} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------- feed */

async function FeedTab({ slug }: { slug: string }) {
  const days = 30;
  const data = await apiGet<{ items: PaperDTO[] }>(
    `/api/nodes/${encodeURIComponent(slug)}/feed?days=${days}&limit=30`
  );

  if (data.items.length === 0) {
    return (
      <EmptyState
        title={L.node.emptyFeed}
        description={L.node.emptyFeedHint}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button href={paperHref(slug, { page: 1, sort: "new", perPage: DEFAULT_PER_PAGE })}>
              {L.node.toPapers}
            </Button>
            <Button href="/watchlist" variant="ghost">
              {L.node.toWatchlist}
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-subtle">{L.node.feedHint(days, data.items.length)}</p>
      <div className="space-y-2">
        {data.items.map((p) => (
          <PaperCard key={p.id} paper={p} />
        ))}
      </div>
    </div>
  );
}
