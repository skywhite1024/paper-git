import Link from "next/link";
import { notFound } from "next/navigation";
import RouteGraph from "@/components/RouteGraph";
import { apiGet, type RouteDetail, type RoutesResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

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

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/routes" className="text-blue-600 hover:underline">
          技术路线网
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-400">{route.name_en}</span>
        <div className="ml-auto flex gap-2">
          {prev && (
            <Link href={`/routes/${prev.id}`} className="rounded border border-[var(--pg-border)] bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-blue-400">
              ← {prev.name_zh}
            </Link>
          )}
          {next && (
            <Link href={`/routes/${next.id}`} className="rounded border border-[var(--pg-border)] bg-white px-2 py-0.5 text-xs text-gray-600 hover:border-blue-400">
              {next.name_zh} →
            </Link>
          )}
        </div>
      </nav>

      <header className="rounded-xl border border-[var(--pg-border)] bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{route.name_zh}</h1>
          <span className="text-sm text-gray-400">{route.name_en}</span>
          <span className="ml-auto text-xs text-gray-500">
            {route.stages.length} 阶段 · {route.item_count} 方法节点 · {route.edge_count} 演进边
          </span>
        </div>
        <p className="mt-3 text-sm text-gray-700">{route.description}</p>
        <div className="mt-3 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-700">
          <span className="font-semibold text-gray-500">主流程：</span>
          {route.pipeline}
        </div>
        {route.objective && (
          <div className="mt-2 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-700">
            <span className="font-semibold text-gray-500">统一目标：</span>
            {route.objective}
          </div>
        )}
        <blockquote className="mt-3 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-sm text-gray-700">
          {route.insight}
        </blockquote>
        <div className="mt-3 flex flex-wrap gap-1">
          {route.related_nodes.map((nid) => (
            <Link key={nid} href={`/nodes/${nid}`} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100">
              领域树 · {nid}
            </Link>
          ))}
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">演进网络（阶段从左到右，节点可点击）</h2>
        <RouteGraph stages={route.stages} edges={route.edges} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {route.stages.map((stage, i) => (
          <div key={stage.name} className="rounded-xl border border-[var(--pg-border)] bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              {i + 1}. {stage.name}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{stage.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
