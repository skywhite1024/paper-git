import Link from "next/link";
import PaperCard from "@/components/PaperCard";
import { apiGet, type StatsDTO, type PaperDTO, type TreeResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

const domainIcon: Record<string, string> = { ai: "🧠", cs: "💻", robotics: "🤖" };

export default async function HomePage() {
  const [stats, feed, tree] = await Promise.all([
    apiGet<StatsDTO>("/api/stats"),
    apiGet<{ items: PaperDTO[] }>("/api/feed?days=30&limit=15"),
    apiGet<TreeResponse>("/api/nodes"),
  ]);

  const domainChildren = (id: string) => tree.roots.find((r) => r.id === id)?.children ?? [];

  return (
    <div>
      <section className="rounded-xl border border-[var(--pg-border)] bg-white p-6">
        <h1 className="text-2xl font-bold">追踪研究进展，看清每条研究路线的脉络</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          PaperGit 用一棵持续更新的领域树组织论文：领域 → 子领域 → 研究路线。
          每个节点自动聚合论文、时间线与趋势，像逛 GitHub 一样观察研究方向的演进。
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <span>📚 {stats.paper_real.toLocaleString()} 篇真实论文</span>
          <span>🌲 {stats.node_total} 个领域节点</span>
          <span>🆕 近 7 天 {stats.recent_7d} 篇新论文</span>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.domains.map((d) => (
          <Link
            key={d.id}
            href={`/nodes/${d.id}`}
            className="rounded-xl border border-[var(--pg-border)] bg-white p-5 transition hover:border-blue-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{domainIcon[d.id] ?? "📁"}</span>
              <span className="text-sm text-gray-400">{d.paper_count?.toLocaleString()} 篇</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">{d.name_zh}</h2>
            <p className="text-xs text-gray-400">{d.name_en}</p>
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">{d.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {domainChildren(d.id).slice(0, 5).map((c) => (
                <span key={c.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {c.name_zh} {c.paper_count ?? 0}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      {stats.hot_nodes.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">🔥 热点研究方向（近 30 天）</h2>
          <div className="flex flex-wrap gap-2">
            {stats.hot_nodes.map((n) => (
              <Link
                key={n.id}
                href={`/nodes/${n.id}`}
                className="rounded-full border border-[var(--pg-border)] bg-white px-3 py-1 text-sm text-blue-700 hover:border-blue-400"
              >
                {n.name_zh}
                <span className="ml-1 text-xs text-gray-400">{n.paper_count ?? 0}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">🆕 最新论文</h2>
        <div className="space-y-2">
          {feed.items.map((p) => (
            <PaperCard key={p.id} paper={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
