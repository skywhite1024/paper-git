import Link from "next/link";
import MapExplorer, { type NetworkData } from "@/components/MapExplorer";
import { apiGet, type StatsDTO } from "@/lib/api";

export const dynamic = "force-dynamic";

const domainIcon: Record<string, string> = { ai: "🧠", cs: "💻", robotics: "🤖" };

export default async function MapHomePage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; node?: string }>;
}) {
  const sp = await searchParams;
  const [network, stats] = await Promise.all([
    apiGet<NetworkData>("/api/routes/graph/network"),
    apiGet<StatsDTO>("/api/stats"),
  ]);

  const initialNode = sp.node ? `${sp.route ?? ""}:${sp.node}` : null;
  const validNode = initialNode && network.nodes.some((n) => n.id === initialNode) ? initialNode : null;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--pg-border)] bg-white px-5 py-3">
        <div>
          <h1 className="text-xl font-bold">论文网络 · {network.family.name_zh}</h1>
          <p className="text-xs text-gray-500">
            {network.routes_meta.length} 条技术路线 · {network.nodes.filter((n) => n.kind === "paper").length} 个方法节点 ·{" "}
            {network.links.length} 条演进/闭环关系
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>📚 {stats.paper_real.toLocaleString()} 篇论文语料</span>
          <span>🌲 {stats.node_total} 领域节点</span>
          <span className="text-gray-300">|</span>
          {stats.domains.map((d) => (
            <Link key={d.id} href={`/nodes/${d.id}`} className="hover:text-blue-600">
              {domainIcon[d.id] ?? "📁"} {d.name_zh}
            </Link>
          ))}
          <Link href="/routes" className="text-blue-600 hover:underline">
            路线族总览 →
          </Link>
        </div>
      </section>

      <MapExplorer data={network} initialRoute={sp.route} initialNode={validNode ?? undefined} />
    </div>
  );
}
