import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import RouteGraph from "@/components/RouteGraph";
import StageDiagram from "@/components/StageDiagram";
import { Badge, Breadcrumbs, Button, Card, Dot, Eyebrow, SectionTitle } from "@/components/ui";
import { apiGet, type RouteDetail, type RoutesResponse } from "@/lib/api";
import { L } from "@/lib/lexicon";
import { routeColor } from "@/lib/routeColors";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const route = await apiGet<RouteDetail>(`/api/routes/${id}`);
    return { title: route.name_zh, description: route.description };
  } catch {
    return { title: L.routes.hubEyebrow };
  }
}

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let route: RouteDetail;
  let siblings: RoutesResponse["routes"];
  try {
    [route, siblings] = await Promise.all([
      apiGet<RouteDetail>(`/api/routes/${id}`),
      apiGet<RoutesResponse>("/api/routes").then((d) => d.routes),
    ]);
  } catch {
    notFound();
  }

  const idx = siblings.findIndex((r) => r.id === route.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const accent = routeColor(route.id);
  const steps = route.pipeline.split("→").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: L.brand, href: "/" },
            { label: L.routes.hubEyebrow, href: "/routes" },
            { label: route.name_zh },
          ]}
        />
        <nav aria-label={L.routes.hubEyebrow} className="flex flex-wrap items-center gap-2">
          {prev ? (
            <Button href={`/routes/${prev.id}`} variant="default" size="sm" title={prev.name_zh}>
              <span aria-hidden>←</span>
              <span className="max-w-[9rem] truncate">{prev.name_zh}</span>
              <span className="sr-only">（{L.routes.prevRoute}）</span>
            </Button>
          ) : null}
          {next ? (
            <Button href={`/routes/${next.id}`} variant="default" size="sm" title={next.name_zh}>
              <span className="sr-only">（{L.routes.nextRoute}）</span>
              <span className="max-w-[9rem] truncate">{next.name_zh}</span>
              <span aria-hidden>→</span>
            </Button>
          ) : null}
        </nav>
      </div>

      <header className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <span aria-hidden className="block h-1 w-full" style={{ background: accent }} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <Eyebrow>
                <span className="inline-flex items-center gap-1.5">
                  <Dot color={accent} />
                  {route.id} · {route.name_en}
                </span>
              </Eyebrow>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg sm:text-[27px]">{route.name_zh}</h1>
            </div>
            <p className="shrink-0 text-xs tabular-nums text-subtle">
              {route.stages.length} {L.routes.stages} · {route.item_count} {L.routes.statMethods} ·{" "}
              {route.edge_count} {L.routes.statRelations}
            </p>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{route.description}</p>

          <div className="mt-5">
            <Eyebrow>{L.routes.pipelineFlow}</Eyebrow>
            <ol className="mt-2 flex flex-wrap items-stretch gap-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center">
                  {i > 0 ? (
                    <span aria-hidden className="mx-1 text-subtle">
                      →
                    </span>
                  ) : null}
                  <span className="rounded-lg border border-line bg-raised px-2.5 py-1 text-xs text-fg">
                    <span className="mr-1 tabular-nums text-subtle">{i + 1}</span>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {route.objective ? (
            <div className="mt-4 rounded-lg bg-raised px-4 py-2.5 text-sm leading-relaxed text-fg">
              <span className="font-medium text-muted">{L.routes.objectiveLabel}：</span>
              {route.objective}
            </div>
          ) : null}

          <p className="mt-4 rounded-lg border-l-2 border-accent bg-accent-soft px-4 py-2.5 text-sm leading-relaxed text-fg">
            <span className="font-medium">{L.routes.insightLabel}：</span>
            {route.insight}
          </p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <Eyebrow>{L.routes.stageAnchor}</Eyebrow>
              <ol className="mt-2 space-y-1.5">
                {route.stages.map((s, i) => (
                  <li key={s.name}>
                    <a
                      href={`#stage-${i + 1}`}
                      className="flex items-baseline gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg transition-colors hover:border-accent hover:bg-raised"
                    >
                      <span className="tabular-nums text-xs text-subtle">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-subtle">
                        {L.routes.stageItems(s.items.length)}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button href={`/?route=${route.id}`} variant="primary" size="sm">
                  {L.routes.locateInTopology}
                </Button>
                {route.related_nodes.map((nid) => (
                  <Link
                    key={nid}
                    href={`/nodes/${nid}`}
                    className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {L.routes.relatedTree(nid)}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <Eyebrow>{L.routes.principleFigure}</Eyebrow>
              <div className="mt-2">
                <StageDiagram route={route.id} height={92} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav aria-label={L.routes.stageAnchor} className="flex flex-wrap gap-2">
        <Button href="#network" variant="ghost" size="sm">
          {L.routes.networkSection}
        </Button>
        <Button href="#stages" variant="ghost" size="sm">
          {L.routes.stageSection}
        </Button>
        <Button href="/routes" variant="ghost" size="sm">
          {L.routes.hubEyebrow}
        </Button>
      </nav>

      <section id="network" aria-labelledby="network-title" className="scroll-mt-20">
        <SectionTitle id="network-title" hint={L.routes.relationHint}>
          {L.routes.networkSection}
        </SectionTitle>
        <RouteGraph stages={route.stages} edges={route.edges} routeId={route.id} />
      </section>

      <section id="stages" aria-labelledby="stages-title" className="scroll-mt-20">
        <SectionTitle id="stages-title" hint={L.routes.stageLocate}>
          {L.routes.stageSection}
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {route.stages.map((stage, i) => (
            <div key={stage.name} id={`stage-${i + 1}`} className="scroll-mt-20">
              <Card as="article" className="h-full p-4">
                <div className="flex items-baseline gap-2">
                  <span className="tabular-nums text-xs text-subtle">{i + 1}</span>
                  <h3 className="min-w-0 flex-1 text-sm font-semibold text-fg">{stage.name}</h3>
                  <span className="shrink-0 text-[11px] tabular-nums text-subtle">
                    {L.routes.stageItems(stage.items.length)}
                  </span>
                </div>
                {stage.description ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{stage.description}</p>
                ) : null}
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {stage.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={`/?route=${route.id}&node=${encodeURIComponent(item.label)}`}
                        title={item.note ?? item.full_title ?? item.label}
                        className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg transition-colors hover:border-accent hover:bg-raised"
                      >
                        {item.key ? <Badge tone="warn">{L.routes.keyWork}</Badge> : null}
                        <span className="font-medium">{item.label}</span>
                        {item.year ? (
                          <span className="tabular-nums text-[11px] text-subtle">{item.year}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
