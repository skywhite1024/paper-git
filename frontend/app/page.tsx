import Link from "next/link";
import TopologyExplorer, { type TopoData } from "@/components/TopologyExplorer";
import { apiGet, type StatsDTO } from "@/lib/api";
import { L } from "@/lib/lexicon";

export const dynamic = "force-dynamic";

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

  const initialNode = sp.node ? `${sp.route ?? ""}:${sp.node}` : null;
  const validNode = initialNode && topo.nodes.some((n) => n.id === initialNode) ? initialNode : undefined;
  const paperCount = topo.nodes.filter((n) => n.kind === "paper").length;
  const stageCount = topo.nodes.filter((n) => n.kind === "stage").length;

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-[var(--pg-border)] bg-white px-5 py-2.5">
        <div>
          <span className="text-base font-bold">{L.topology.title}</span>
          <span className="ml-3 text-xs text-gray-500">
            {L.topology.routeCount(topo.routes_meta.length)} · {stageCount} 层地层 · {L.topology.nodeCount(paperCount)} ·{" "}
            {L.topology.edgeCount(topo.links.length)}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>{L.home.corpusStat(stats.paper_real.toLocaleString())}</span>
          <span>{L.home.taxonomyStat(stats.node_total)}</span>
          <span>{L.home.recentStat(stats.recent_7d)}</span>
          <span className="text-gray-300">|</span>
          <Link href="/routes" className="text-blue-700 hover:underline">
            {L.nav.routes}
          </Link>
          <Link href="/nodes/ai" className="hover:text-blue-700">
            {L.nav.treeAI}
          </Link>
          <Link href="/nodes/cs" className="hover:text-blue-700">
            {L.nav.treeCS}
          </Link>
          <Link href="/nodes/robotics" className="hover:text-blue-700">
            {L.nav.treeRobotics}
          </Link>
        </div>
      </section>

      <TopologyExplorer data={topo} initialRoute={sp.route} initialNode={validNode} />
    </div>
  );
}
