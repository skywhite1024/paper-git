import Link from "next/link";
import { Badge, Button, Card, cx } from "@/components/ui";
import { L } from "@/lib/lexicon";
import type { PaperDTO } from "@/lib/api";

const chipCls =
  "inline-flex max-w-full items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 " +
  "text-[11px] font-medium text-accent transition-colors hover:bg-accent hover:text-accent-fg";

function authorLine(authors: string[]) {
  const shown = authors.slice(0, 3).join(", ");
  const rest = authors.length - 3;
  return rest > 0 ? `${shown} ${L.paper.moreAuthors(rest)}` : shown;
}

export default function PaperCard({
  paper,
  showNodes = true,
  compact = false,
}: {
  paper: PaperDTO;
  showNodes?: boolean;
  compact?: boolean;
}) {
  const published = paper.published ? paper.published.slice(0, 10) : null;
  const meta: { key: string; text: string; className?: string }[] = [
    { key: "year", text: String(paper.year), className: "font-medium tabular-nums text-muted" },
  ];
  if (paper.venue) meta.push({ key: "venue", text: paper.venue, className: "italic" });
  /* 引用为 0 是该语料的常态（新收录条目尚无引用数），不占列表视觉焦点，直接省略。 */
  if (paper.citation_count > 0) {
    meta.push({
      key: "cites",
      text: `${L.node.citations} ${paper.citation_count.toLocaleString()}`,
      className: "font-medium tabular-nums text-muted",
    });
  }
  if (published) meta.push({ key: "pub", text: published, className: "tabular-nums" });
  if (paper.is_demo) meta.push({ key: "demo", text: L.node.demo });

  return (
    <Card
      as="article"
      className={cx(
        "group transition-[border-color,box-shadow] hover:border-accent/45 hover:shadow-pop",
        compact ? "px-3 py-2.5" : "px-4 py-3.5"
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          {(paper.is_milestone || showNodes) && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {paper.is_milestone ? (
                <Badge tone="warn" title={L.paper.milestoneHint}>
                  {L.paper.milestone}
                </Badge>
              ) : null}
              {showNodes &&
                paper.nodes.slice(0, compact ? 2 : 3).map((n) => (
                  <Link key={n.id} href={`/nodes/${n.id}`} className={chipCls} title={n.name_en}>
                    <span className="truncate">{n.name_zh}</span>
                  </Link>
                ))}
              {showNodes && paper.nodes.length > (compact ? 2 : 3) ? (
                <Link
                  href={`/papers/${paper.id}`}
                  className="text-[11px] font-medium text-subtle hover:text-accent"
                >
                  {L.paper.moreNodes(paper.nodes.length - (compact ? 2 : 3))}
                </Link>
              ) : null}
            </div>
          )}

          <h3 className="text-[15px] leading-snug font-semibold text-fg">
            <Link href={`/papers/${paper.id}`} title={paper.title} className="line-clamp-2 rounded-sm hover:text-accent">
              {paper.title}
            </Link>
          </h3>

          {paper.authors.length > 0 ? (
            <p className="mt-1 truncate text-xs text-muted" title={paper.authors.join(", ")}>
              {authorLine(paper.authors)}
            </p>
          ) : null}

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
            {meta.map((m, i) => (
              <span key={m.key} className={cx("flex items-center gap-2", m.className)}>
                {i > 0 ? (
                  <span aria-hidden className="text-line">
                    ·
                  </span>
                ) : null}
                {m.text}
              </span>
            ))}
          </p>
        </div>

        {(paper.abs_url || paper.pdf_url || paper.code_url) && (
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-end">
            {paper.abs_url ? <Button size="sm" href={paper.abs_url}>{L.paper.linkAbs}</Button> : null}
            {paper.pdf_url ? (
              <Button size="sm" href={paper.pdf_url} variant="ghost">
                {L.paper.linkPdf}
              </Button>
            ) : null}
            {paper.code_url ? (
              <Button size="sm" href={paper.code_url} variant="ghost">
                {L.paper.linkCode}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
