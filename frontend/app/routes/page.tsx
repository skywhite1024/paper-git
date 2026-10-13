import Link from "next/link";
import type { Metadata } from "next";
import LoopGraph from "@/components/LoopGraph";
import { Badge, Breadcrumbs, Card, Dot, Eyebrow, SectionTitle, Stat } from "@/components/ui";
import { apiGet, type RoutesResponse } from "@/lib/api";
import { L } from "@/lib/lexicon";
import { ROUTE_NAMES, routeColor } from "@/lib/routeColors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: L.routes.hubEyebrow,
  description: "六条机器人技能发现技术路线的整体闭环、阶段构成与演进关系。",
};

export default async function RoutesHubPage() {
  const data = await apiGet<RoutesResponse>("/api/routes");
  const { family, routes } = data;
  const totalItems = routes.reduce((a, r) => a + r.item_count, 0);
  const totalEdges = routes.reduce((a, r) => a + r.edge_count, 0);

  return (
    <div className="space-y-8">
      <div>
        <Breadcrumbs items={[{ label: L.brand, href: "/" }, { label: L.routes.hubEyebrow }]} className="mb-3" />
        <Card as="section" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1">
              <Eyebrow>
                {L.routes.family} · {family.name_en}
              </Eyebrow>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg sm:text-[26px]">
                {L.routes.hubEyebrow} · {family.name_zh}
              </h1>
              <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">{family.description}</p>
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-2.5">
              <Stat label={L.routes.statRoutes} value={routes.length} className="min-w-[74px] px-3 py-2" />
              <Stat label={L.routes.statMethods} value={totalItems} className="min-w-[86px] px-3 py-2" />
              <Stat label={L.routes.statRelations} value={totalEdges} className="min-w-[86px] px-3 py-2" />
            </div>
          </div>
          <p className="mt-4 rounded-lg border-l-2 border-accent bg-accent-soft px-4 py-2.5 text-sm leading-relaxed text-fg">
            {family.theme_quote}
          </p>
        </Card>
      </div>

      <section aria-labelledby="loop-title">
        <SectionTitle id="loop-title" hint={L.routes.loopSubtitle}>
          {L.routes.loopTitle}
        </SectionTitle>
        <LoopGraph nodes={family.loop.nodes} edges={family.loop.edges} />
      </section>

      <section aria-labelledby="routes-title">
        <SectionTitle id="routes-title" hint={L.routes.statRoutes}>
          {L.routes.routeLegendTitle}
        </SectionTitle>
        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
          {routes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routes/${r.id}`}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-fg"
              >
                <Dot color={routeColor(r.id)} />
                <span className="font-medium text-fg">{r.name_zh}</span>
                <span className="text-subtle">{r.id}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {routes.map((r, i) => (
            <Link
              key={r.id}
              href={`/routes/${r.id}`}
              className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface p-5 pt-[19px] shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-pop focus-visible:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ background: routeColor(r.id) }}
              />
              <div className="flex items-center justify-between gap-2">
                <Eyebrow className="truncate">
                  {String(i + 1).padStart(2, "0")} · {r.id}
                </Eyebrow>
                <span className="shrink-0 text-[11px] tabular-nums text-subtle">
                  {r.stage_count} {L.routes.stages} · {r.item_count}
                </span>
              </div>
              <h3 className="mt-2 text-[17px] font-semibold leading-snug text-fg">{r.name_zh}</h3>
              <p className="mt-0.5 text-[11px] text-subtle">{r.name_en}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{r.description}</p>

              <ul className="mt-3 flex flex-wrap gap-1">
                {r.stages.map((s, si) => (
                  <li key={s.name}>
                    <Badge tone="neutral" title={s.name} className="max-w-full">
                      <span className="tabular-nums text-subtle">{si + 1}</span>
                      <span className="truncate">{s.name}</span>
                      <span className="tabular-nums">{s.item_count}</span>
                    </Badge>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-3">
                <div className="rounded-lg bg-raised px-3 py-2">
                  <Eyebrow>{L.routes.insightLabel}</Eyebrow>
                  <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-muted">{r.insight}</p>
                </div>
                <p className="mt-2.5 flex items-center gap-1 text-xs font-medium text-accent">
                  {ROUTE_NAMES[r.id] ?? r.name_zh}
                  <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="min-w-0 p-5">
          <SectionTitle>{L.routes.contract}</SectionTitle>
          {/* The contract is a single formula meant to be read in full; a
              horizontally scrolling <pre> hides its tail with no cue. */}
          <pre className="max-w-full whitespace-pre-wrap break-words rounded-lg bg-raised px-4 py-3 font-mono text-xs leading-relaxed text-fg">
            <code>{family.contract.formula}</code>
          </pre>
          <p className="mt-3 text-sm leading-relaxed text-muted">{family.contract.note}</p>
        </Card>
        <Card as="section" className="min-w-0 p-5">
          <SectionTitle hint={L.routes.matrix}>{L.routes.matrix}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">{L.routes.matrix}</caption>
              <thead>
                <tr className="border-b border-line text-subtle">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {L.routes.matrixClaim}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {L.routes.matrixEvidence}
                  </th>
                </tr>
              </thead>
              <tbody>
                {family.matrix.map((m) => (
                  <tr key={m.claim} className="border-b border-line-soft last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-semibold text-fg">
                      {m.claim}
                    </th>
                    <td className="py-2 text-muted">{m.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
