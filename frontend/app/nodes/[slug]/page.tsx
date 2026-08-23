import Link from "next/link";
import { notFound } from "next/navigation";
import PaperCard from "@/components/PaperCard";
import TrendChart from "@/components/TrendChart";
import TreeView from "@/components/TreeView";
import WatchButton from "@/components/WatchButton";
import {
  apiGet,
  type NodeDetailDTO,
  type PaperDTO,
  type PapersResponse,
  type TimelineResponse,
  type TreeResponse,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  page?: string;
  sort?: string;
  year?: string;
  q?: string;
}>;

const TABS = [
  { key: "overview", label: "概览" },
  { key: "papers", label: "论文列表" },
  { key: "timeline", label: "时间线" },
  { key: "feed", label: "动态" },
];

function tabHref(slug: string, tab: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  sp.set("tab", tab);
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  return `/nodes/${slug}?${sp.toString()}`;
}

export default async function NodePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "overview";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const sort = ["new", "citations", "year"].includes(sp.sort ?? "") ? sp.sort! : "new";

  const tree = await apiGet<TreeResponse>("/api/nodes");

  let detail: NodeDetailDTO;
  try {
    detail = await apiGet<NodeDetailDTO>(`/api/nodes/${encodeURIComponent(slug)}`);
  } catch {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="order-2 lg:order-1">
        <TreeView roots={tree.roots} activeId={slug} />
      </aside>

      <div className="order-1 min-w-0 lg:order-2">
        <nav className="mb-1 flex flex-wrap items-center gap-1 text-sm text-gray-500">
          {detail.ancestors.map((a, i) => (
            <span key={a.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              <Link href={`/nodes/${a.id}`} className={a.id === slug ? "font-semibold text-gray-800" : "hover:text-blue-600"}>
                {a.name_zh}
              </Link>
            </span>
          ))}
          <span className="ml-2 text-xs text-gray-400">{detail.name_en}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {detail.name_zh}
            <span className="ml-2 text-sm font-normal text-gray-400">{detail.stats.paper_count} 篇论文</span>
          </h1>
          <WatchButton nodeId={slug} />
        </div>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">{detail.description}</p>

        <div className="mt-4 flex gap-1 border-b border-[var(--pg-border)]">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(slug, t.key, {})}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === t.key
                  ? "border-blue-600 font-semibold text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="mt-4">
          {tab === "overview" && <Overview slug={slug} detail={detail} />}
          {tab === "papers" && <PapersTab slug={slug} page={page} sort={sort} year={sp.year} q={sp.q} />}
          {tab === "timeline" && <TimelineTab slug={slug} />}
          {tab === "feed" && <FeedTab slug={slug} />}
        </div>
      </div>
    </div>
  );
}

async function Overview({ slug, detail }: { slug: string; detail: NodeDetailDTO }) {
  const trends = await apiGet<{ data: { year: number; count: number }[] }>(
    `/api/nodes/${encodeURIComponent(slug)}/trends`
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="论文总数" value={detail.stats.paper_count.toLocaleString()} />
        <Stat label="时间跨度" value={detail.stats.year_min ? `${detail.stats.year_min}–${detail.stats.year_max}` : "—"} />
        <Stat label="里程碑" value={`${detail.stats.milestone_count} 篇`} />
        <Stat label="子方向" value={`${detail.children.length} 个`} />
      </div>

      {detail.children.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">子方向</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detail.children.map((c) => (
              <Link
                key={c.id}
                href={`/nodes/${c.id}`}
                className="rounded-lg border border-[var(--pg-border)] bg-white p-3 hover:border-blue-400"
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{c.name_zh}</span>
                  <span className="text-xs text-gray-400">{c.paper_count ?? 0}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{c.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">年度论文趋势</h3>
        <div className="rounded-lg border border-[var(--pg-border)] bg-white p-3">
          <TrendChart data={trends.data} />
        </div>
      </section>

      {detail.milestones.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">⭐ 里程碑工作</h3>
          <div className="space-y-2">
            {detail.milestones.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      )}

      {detail.keywords.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">关键词</h3>
          <div className="flex flex-wrap gap-1">
            {detail.keywords.map((k) => (
              <span key={k} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {k}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--pg-border)] bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

async function PapersTab({
  slug,
  page,
  sort,
  year,
  q,
}: {
  slug: string;
  page: number;
  sort: string;
  year?: string;
  q?: string;
}) {
  const sp = new URLSearchParams({ sort, page: String(page) });
  if (year) sp.set("year", year);
  if (q) sp.set("q", q);
  const data = await apiGet<PapersResponse>(`/api/nodes/${encodeURIComponent(slug)}/papers?${sp.toString()}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.per_page));

  const pageHref = (p: number) => {
    const params = new URLSearchParams({ tab: "papers", sort, page: String(p) });
    if (year) params.set("year", year);
    if (q) params.set("q", q);
    return `/nodes/${slug}?${params.toString()}`;
  };

  return (
    <div>
      <form action={`/nodes/${slug}`} className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="tab" value="papers" />
        <input type="hidden" name="sort" value={sort} />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="标题/摘要关键词…"
          className="w-48 rounded border border-[var(--pg-border)] px-2 py-1 focus:border-blue-400 focus:outline-none"
        />
        <select name="year" defaultValue={year ?? ""} className="rounded border border-[var(--pg-border)] px-2 py-1">
          <option value="">全部年份</option>
          {data.years.slice(0, 15).map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}（{y.count}）
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="rounded border border-[var(--pg-border)] px-2 py-1">
          <option value="new">最新发表</option>
          <option value="citations">高引用</option>
          <option value="year">年份</option>
        </select>
        <button className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">筛选</button>
        <span className="ml-auto text-xs text-gray-500">共 {data.total.toLocaleString()} 篇</span>
      </form>

      <div className="space-y-2">
        {data.items.map((p) => (
          <PaperCard key={p.id} paper={p} />
        ))}
        {data.items.length === 0 && <p className="p-6 text-center text-sm text-gray-400">没有匹配的论文</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded border border-[var(--pg-border)] bg-white px-3 py-1 hover:bg-gray-50">
              上一页
            </Link>
          )}
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="rounded border border-[var(--pg-border)] bg-white px-3 py-1 hover:bg-gray-50">
              下一页
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

async function TimelineTab({ slug }: { slug: string }) {
  const data = await apiGet<TimelineResponse>(`/api/nodes/${encodeURIComponent(slug)}/timeline`);
  return (
    <div className="space-y-6">
      {data.years.map((bucket) => (
        <section key={bucket.year}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-[#0d1117] px-2 py-0.5 text-sm font-semibold text-white">{bucket.year}</span>
            <span className="text-xs text-gray-500">{bucket.count} 篇</span>
          </div>
          <div className="space-y-2 border-l-2 border-gray-200 pl-4">
            {bucket.papers.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      ))}
      {data.years.length === 0 && <p className="p-6 text-center text-sm text-gray-400">暂无时间线数据</p>}
    </div>
  );
}

async function FeedTab({ slug }: { slug: string }) {
  const data = await apiGet<{ items: PaperDTO[] }>(
    `/api/nodes/${encodeURIComponent(slug)}/feed?days=30&limit=30`
  );
  return (
    <div className="space-y-2">
      {data.items.map((p) => (
        <PaperCard key={p.id} paper={p} />
      ))}
      {data.items.length === 0 && (
        <p className="p-6 text-center text-sm text-gray-400">近 30 天暂无新论文，可运行增量 ingest 更新</p>
      )}
    </div>
  );
}
