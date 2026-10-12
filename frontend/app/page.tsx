import Link from "next/link";
import TopologyExplorer, { type TopoData } from "@/components/TopologyExplorer";
import { Button } from "@/components/ui";
import { apiGet, type StatsDTO } from "@/lib/api";
import { L } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

/** 兼容三种入参写法：完整节点 id、route+论文代号、route+标签。 */
function resolveNodeId(data: TopoData, route: string | undefined, node: string | undefined) {
  if (!node) return undefined;
  if (data.nodes.some((n) => n.id === node)) return node;
  const scoped = `${route ?? ""}:${node}`;
  if (data.nodes.some((n) => n.id === scoped)) return scoped;
  const byLabel = data.nodes.find(
    (n) => (!route || n.route === route) && n.label.toLowerCase() === node.toLowerCase()
  );
  return byLabel?.id;
}

export default async function TopologyHomePage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; node?: string }>;
}) {
  const sp = await searchParams;
  const [topo, stats] = await Promise.all([
    apiGet<TopoData>("/api/routes/graph/network"),
    apiGet<StatsDTO>("/api/stats"),
  ]);

  const initialNode = resolveNodeId(topo, sp.route, sp.node);
  const paperCount = topo.nodes.filter((n) => n.kind === "paper").length;
  const stageCount = topo.nodes.filter((n) => n.kind === "stage").length;

  const facts = [
    { label: L.home.statCorpus, value: stats.paper_real.toLocaleString() },
    { label: L.home.statRoutes, value: topo.routes_meta.length },
    { label: L.home.statStages, value: stageCount },
    { label: L.home.statMethods, value: paperCount },
    { label: L.home.statEdges, value: topo.links.length },
    ...(stats.recent_7d > 0 ? [{ label: L.home.statRecent, value: stats.recent_7d }] : []),
  ];

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card">
        <div className="min-w-0 flex-1 basis-[300px]">
          <h1 className="text-[15px] font-semibold tracking-tight text-fg">{L.topology.title}</h1>
          <p className="mt-0.5 text-[11px] leading-snug text-subtle">{L.home.heroSubtitle(topo.family.name_zh)}</p>
        </div>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {facts.map((f) => (
            <div key={f.label} className="flex items-baseline gap-1.5">
              <dd className="text-[15px] font-semibold leading-5 tabular-nums text-fg">{f.value}</dd>
              <dt className="text-[11px] text-subtle">{f.label}</dt>
            </div>
          ))}
        </dl>
        <nav aria-label={L.topology.overview} className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button href="/routes" size="sm">
            {L.nav.routes}
          </Button>
          <Button href="/watchlist" size="sm" variant="ghost">
            {L.nav.watchlist}
          </Button>
          {sp.route && (
            <Link href="/" className="text-[11px] text-muted underline-offset-4 hover:text-accent hover:underline">
              {L.topology.showAll}
            </Link>
          )}
        </nav>
      </section>

      <TopologyExplorer data={topo} initialRoute={sp.route} initialNode={initialNode} />
    </div>
  );
}
