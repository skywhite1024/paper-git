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
    L.topology.routeCount(topo.routes_meta.length),
    L.topology.stageCount(stageCount),
    L.topology.nodeCount(paperCount),
    L.topology.edgeCount(topo.links.length),
    L.home.corpusStat(stats.paper_real.toLocaleString()),
    L.home.recentStat(stats.recent_7d),
  ];

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight text-fg">{L.topology.title}</h1>
          <p className="mt-0.5 truncate text-[11px] text-subtle">{topo.family.name_zh}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted">
          {facts.map((f) => (
            <li key={f} className="whitespace-nowrap">
              {f}
            </li>
          ))}
        </ul>
        <nav aria-label={L.topology.overview} className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="hidden items-center gap-1.5 text-[11px] text-subtle sm:flex">
            {L.topology.searchKbd}
            <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">
              Ctrl K
            </kbd>
          </span>
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
