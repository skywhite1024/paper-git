import Link from "next/link";
import { notFound } from "next/navigation";
import PaperCard from "@/components/PaperCard";
import { apiGet, type PaperDTO } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let paper: PaperDTO;
  try {
    paper = await apiGet<PaperDTO>(`/api/papers/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border border-[var(--pg-border)] bg-white p-6">
        <h1 className="text-2xl font-bold leading-snug">
          {paper.is_milestone && <span title="里程碑工作">⭐ </span>}
          {paper.title}
        </h1>
        <p className="mt-2 text-sm text-gray-600">{paper.authors.join(", ")}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{paper.year}</span>
          {paper.venue && <span className="italic">{paper.venue}</span>}
          <span>引用 {paper.citation_count.toLocaleString()}</span>
          {paper.published && <span>发布于 {paper.published.slice(0, 10)}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {paper.abs_url && (
            <a href={paper.abs_url} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
              arXiv 页面 ↗
            </a>
          )}
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="rounded border border-[var(--pg-border)] px-3 py-1 hover:bg-gray-50">
              PDF ↗
            </a>
          )}
        </div>

        {paper.nodes.length > 0 && (
          <div className="mt-4">
            <span className="text-xs font-semibold text-gray-500">所属研究方向</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {paper.nodes.map((n) => (
                <Link
                  key={n.id}
                  href={`/nodes/${n.id}`}
                  className="rounded-full bg-blue-50 px-2.5 py-1 text-sm text-blue-700 hover:bg-blue-100"
                >
                  {n.name_zh} · {n.name_en}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="mt-4 rounded-xl border border-[var(--pg-border)] bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">摘要</h2>
        <p className="text-sm leading-relaxed text-gray-800">{paper.abstract || "（暂无摘要）"}</p>
      </section>

      {paper.related && paper.related.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">相关论文（同方向高引用）</h2>
          <div className="space-y-2">
            {paper.related.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
