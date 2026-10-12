import Link from "next/link";
import { notFound } from "next/navigation";
import PaperCard from "@/components/PaperCard";
import WatchButton from "@/components/WatchButton";
import { Badge, Breadcrumbs, Button, Card, Eyebrow, SectionTitle, cx } from "@/components/ui";
import { apiGet, type NodeDetailDTO, type PaperDTO } from "@/lib/api";
import { L } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

async function getPaper(id: string): Promise<PaperDTO> {
  try {
    return await apiGet<PaperDTO>(`/api/papers/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof Error && /: 404$/.test(e.message)) notFound();
    throw e;
  }
}

async function getNode(slug: string): Promise<NodeDetailDTO> {
  try {
    return await apiGet<NodeDetailDTO>(`/api/nodes/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof Error && /: 404$/.test(e.message)) notFound();
    throw e;
  }
}

function nodeHref(id: string) {
  return `/nodes/${encodeURIComponent(id)}`;
}

/** 面包屑末端用截断后的标题，避免出现「论文 #1」这类无意义标识。 */
function crumbTitle(title: string, max = 40) {
  const clean = title.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paper = await getPaper(id);
  return {
    title: paper.title,
    description: paper.abstract ? paper.abstract.slice(0, 150) : L.paper.metaFallback,
  };
}

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paper = await getPaper(id);
  const primary = paper.nodes[0];
  const chain = primary ? await getNode(primary.id) : null;

  const crumbs = chain
    ? chain.ancestors.map((a, i) => ({
        label: a.name_zh,
        href: i < chain.ancestors.length - 1 ? nodeHref(a.id) : undefined,
      }))
    : [];

  const hasCites = paper.citation_count > 0;

  const metaRows: { key: string; label: string; value: string; mono?: boolean; muted?: boolean; hint?: string }[] = [
    { key: "year", label: L.paper.yearField, value: String(paper.year) },
    {
      key: "cites",
      label: L.paper.citesField,
      value: hasCites ? paper.citation_count.toLocaleString() : L.paper.citesNoneShort,
      muted: !hasCites,
      hint: hasCites ? undefined : L.paper.citesNoneHint,
    },
    { key: "venue", label: L.paper.venueField, value: paper.venue ?? L.common.none },
    { key: "pub", label: L.paper.pubField, value: paper.published ? paper.published.slice(0, 10) : L.common.none },
    { key: "source", label: L.paper.sourceField, value: paper.source },
  ];
  if (paper.arxiv_id) metaRows.push({ key: "arxiv", label: L.paper.arxivField, value: paper.arxiv_id, mono: true });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <Breadcrumbs
          items={[
            { label: L.node.crumbHome, href: "/" },
            ...crumbs,
            { label: crumbTitle(paper.title) },
          ]}
        />

        <header className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {paper.is_milestone ? (
              <Badge tone="warn" title={L.paper.milestoneHint}>
                {L.paper.milestone}
              </Badge>
            ) : null}
            {paper.is_demo ? <Badge tone="neutral">{L.node.demo}</Badge> : null}
            <Eyebrow>{L.paper.eyebrow}</Eyebrow>
          </div>

          <h1 className="text-[22px] font-bold leading-snug tracking-tight text-fg sm:text-[26px]">
            {paper.title}
          </h1>

          {paper.authors.length > 0 ? (
            <p className="text-sm text-muted">{paper.authors.join(", ")}</p>
          ) : null}

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
            <span className="font-medium tabular-nums text-muted">{paper.year}</span>
            {paper.venue ? (
              <>
                <span aria-hidden className="text-line">
                  ·
                </span>
                <span className="italic">{paper.venue}</span>
              </>
            ) : null}
            {hasCites ? (
              <>
                <span aria-hidden className="text-line">
                  ·
                </span>
                <span className="font-medium tabular-nums text-muted">
                  {L.node.citations} {paper.citation_count.toLocaleString()}
                </span>
              </>
            ) : null}
            {paper.nodes.length > 0 ? (
              <>
                <span aria-hidden className="text-line">
                  ·
                </span>
                <span>{L.paper.nodeCount(paper.nodes.length)}</span>
              </>
            ) : null}
          </p>
        </header>

        <section>
          <SectionTitle hint={paper.abstract ? L.paper.abstractLen(paper.abstract.length) : undefined}>
            {L.paper.abstractTitle}
          </SectionTitle>
          <Card className="px-4 py-3.5">
            {paper.abstract ? (
              <p className="max-w-[78ch] text-[15px] leading-7 text-fg">{paper.abstract}</p>
            ) : (
              <p className="text-sm text-muted">{L.paper.noAbstract}</p>
            )}
          </Card>
        </section>

        {paper.related && paper.related.length > 0 ? (
          <section>
            <SectionTitle hint={L.paper.relatedHint}>{L.paper.relatedTitle}</SectionTitle>
            <div className="space-y-2">
              {paper.related.map((p) => (
                <PaperCard key={p.id} paper={p} compact showNodes={false} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-[72px]">
        <Card className="p-3.5">
          <Eyebrow className="mb-2 block">{L.paper.metaTitle}</Eyebrow>
          {hasCites ? (
            <div className="mb-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-fg">
                {paper.citation_count.toLocaleString()}
              </span>
              <span className="text-xs text-subtle">{L.paper.citesUnit}</span>
            </div>
          ) : null}
          <dl className="divide-y divide-line-soft">
            {metaRows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="shrink-0 text-xs text-subtle">{row.label}</dt>
                <dd
                  className={cx(
                    "min-w-0 truncate text-right text-[13px]",
                    row.muted ? "text-subtle" : "text-fg",
                    row.mono && "font-mono text-xs",
                    row.key === "year" && "tabular-nums"
                  )}
                  title={row.hint ?? row.value}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        {(paper.abs_url || paper.pdf_url || paper.code_url) && (
          <Card className="p-3.5">
            <Eyebrow className="mb-2 block">{L.paper.linksTitle}</Eyebrow>
            <div className="flex flex-col gap-1.5">
              {paper.abs_url ? (
                <Button href={paper.abs_url} variant="primary" size="sm" className="w-full">
                  {L.paper.linkAbsFull}
                </Button>
              ) : null}
              {paper.pdf_url ? (
                <Button href={paper.pdf_url} size="sm" className="w-full">
                  {L.paper.linkPdf}
                </Button>
              ) : null}
              {paper.code_url ? (
                <Button href={paper.code_url} size="sm" className="w-full">
                  {L.paper.linkCode}
                </Button>
              ) : null}
            </div>
          </Card>
        )}

        {primary ? (
          <Card className="p-3.5">
            <Eyebrow className="mb-2 block">{L.paper.watchTitle}</Eyebrow>
            <WatchButton nodeId={primary.id} nodeName={primary.name_zh} />
            <p className="mt-2 text-[11px] leading-4 text-subtle">{L.paper.watchHint}</p>
          </Card>
        ) : null}

        {paper.nodes.length > 0 ? (
          <Card className="p-3.5">
            <Eyebrow className="mb-2 block">{L.paper.nodesTitle}</Eyebrow>
            <ul className="flex flex-wrap gap-1.5">
              {paper.nodes.map((n) => (
                <li key={n.id}>
                  <Link
                    href={nodeHref(n.id)}
                    title={n.name_en}
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-accent-fg"
                  >
                    <span className="truncate">{n.name_zh}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-4 text-subtle">{L.paper.nodesHint}</p>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
