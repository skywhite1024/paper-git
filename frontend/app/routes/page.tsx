import Link from "next/link";
import LoopGraph from "@/components/LoopGraph";
import { apiGet, type RoutesResponse } from "@/lib/api";
import { L } from "@/lib/lexicon";
import { routeColor } from "@/lib/routeColors";

export const dynamic = "force-dynamic";

export default async function RoutesHubPage() {
  const data = await apiGet<RoutesResponse>("/api/routes");
  const { family, routes } = data;
  const totalItems = routes.reduce((a, r) => a + r.item_count, 0);
  const totalEdges = routes.reduce((a, r) => a + r.edge_count, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--pg-border)] bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">技术路线网 · {family.name_zh}</h1>
          <span className="text-sm text-gray-400">{family.name_en}</span>
          <span className="ml-auto text-xs text-gray-500">
            {routes.length} 条路线 · {totalItems} 个方法节点 · {totalEdges} 条演进关系
          </span>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-gray-700">{family.description}</p>
        <blockquote className="mt-3 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-sm text-gray-700">
          {family.theme_quote}
        </blockquote>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">整体闭环：能力从哪里来，到哪里去</h2>
        <LoopGraph nodes={family.loop.nodes} edges={family.loop.edges} />
        <p className="mt-2 text-xs text-gray-500">
          蓝色节点可点击进入对应技术路线；紫色虚线为技能库经验回流——闭环使「技能资产」持续演化。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">六条技术路线</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((r) => (
            <Link
              key={r.id}
              href={`/routes/${r.id}`}
              className="flex flex-col rounded-xl border border-[var(--pg-border)] bg-white p-5 transition hover:border-blue-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: routeColor(r.id) }} />
                  <span className="text-xs uppercase tracking-wider text-gray-400">{r.name_en}</span>
                </span>
                <span className="text-xs text-gray-400">
                  {r.stage_count} 阶段 · {r.item_count} 节点 · {r.edge_count} 演进边
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold">{r.name_zh}</h3>
              <p className="text-xs text-gray-400">{r.name_en}</p>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{r.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {r.stages.map((s) => (
                  <span key={s.name} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {s.name} {s.item_count}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-t border-gray-100 pt-2 text-xs italic leading-relaxed text-gray-500">
                {r.insight.length > 90 ? r.insight.slice(0, 90) + "…" : r.insight}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--pg-border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700">统一抽象：技能契约</h2>
          <code className="mt-3 block rounded-lg bg-gray-900 px-4 py-3 text-xs leading-relaxed text-green-300">
            {family.contract.formula}
          </code>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{family.contract.note}</p>
        </div>
        <div className="rounded-xl border border-[var(--pg-border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700">评测矩阵：按「声称的输出」选择证据</h2>
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-1.5 pr-2 font-medium">论文声称</th>
                <th className="py-1.5 font-medium">必要证据</th>
              </tr>
            </thead>
            <tbody>
              {family.matrix.map((m) => (
                <tr key={m.claim} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-3 font-semibold text-gray-800">{m.claim}</td>
                  <td className="py-1.5 text-gray-600">{m.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
