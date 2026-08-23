import Link from "next/link";
import type { PaperDTO } from "@/lib/api";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

export default function PaperCard({ paper, showNodes = true }: { paper: PaperDTO; showNodes?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--pg-border)] bg-white p-4 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/papers/${paper.id}`} className="font-semibold text-blue-700 hover:underline">
            {paper.is_milestone && (
              <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-amber-700">
                里程碑
              </span>
            )}
            {paper.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="max-w-xl truncate">{paper.authors.join(", ")}</span>
            <span>{paper.year}</span>
            {paper.venue && <span className="italic">{paper.venue}</span>}
            <span>引用 {paper.citation_count.toLocaleString()}</span>
            {paper.published && <span>{formatDate(paper.published)}</span>}
            {paper.is_demo && <span className="rounded bg-amber-100 px-1.5 text-amber-700">示例数据</span>}
          </div>
          {showNodes && paper.nodes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {paper.nodes.slice(0, 4).map((n) => (
                <Link
                  key={n.id}
                  href={`/nodes/${n.id}`}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                >
                  {n.name_zh}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-xs">
          {paper.abs_url && (
            <a href={paper.abs_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              arXiv ↗
            </a>
          )}
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline">
              PDF ↗
            </a>
          )}
          {paper.code_url && (
            <a href={paper.code_url} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline">
              Code ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
