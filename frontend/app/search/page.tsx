import Link from "next/link";
import PaperCard from "@/components/PaperCard";
import { apiGet, type PaperDTO, type NodeDTO } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (query.length < 2) {
    return (
      <div className="rounded-xl border border-[var(--pg-border)] bg-white p-10 text-center text-sm text-gray-500">
        输入至少 2 个字符进行搜索（支持标题与摘要检索、研究方向定位）。
      </div>
    );
  }

  const data = await apiGet<{ papers: PaperDTO[]; nodes: NodeDTO[] }>(
    `/api/search?q=${encodeURIComponent(query)}`
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        “{query}” 的搜索结果：{data.papers.length} 篇论文、{data.nodes.length} 个研究方向
      </p>

      {data.nodes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">研究方向</h2>
          <div className="flex flex-wrap gap-2">
            {data.nodes.map((n) => (
              <Link
                key={n.id}
                href={`/nodes/${n.id}`}
                className="rounded-full border border-[var(--pg-border)] bg-white px-3 py-1 text-sm text-blue-700 hover:border-blue-400"
              >
                {n.name_zh} <span className="text-xs text-gray-400">{n.name_en}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">论文</h2>
        <div className="space-y-2">
          {data.papers.map((p) => (
            <PaperCard key={p.id} paper={p} />
          ))}
          {data.papers.length === 0 && <p className="p-6 text-center text-sm text-gray-400">没有匹配的论文</p>}
        </div>
      </section>
    </div>
  );
}
