"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PaperCard from "@/components/PaperCard";
import type { NodeDTO, PaperDTO } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Digest = {
  user: string;
  days: number;
  sections: { node: NodeDTO; items: PaperDTO[] }[];
};

export default function WatchlistPage() {
  const [data, setData] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/watch/digest?days=14`);
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(`加载失败：${e instanceof Error ? e.message : e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unwatch = async (nodeId: string) => {
    await fetch(`${API_BASE}/api/watch/${nodeId}`, { method: "DELETE" });
    load();
  };

  if (loading && !data) return <p className="p-6 text-sm text-gray-500">加载中…</p>;
  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">我的关注</h1>
      <p className="mt-1 text-sm text-gray-600">关注的节点近 14 天进展汇总（也可运行增量 ingest 后刷新）。</p>

      {data!.sections.length === 0 && (
        <div className="mt-6 rounded-xl border border-[var(--pg-border)] bg-white p-10 text-center text-sm text-gray-500">
          还没有关注任何方向。去
          <Link href="/nodes/ai" className="mx-1 text-blue-600 hover:underline">
            领域树
          </Link>
          里逛逛，点击节点页右上角的 ☆ 关注。
        </div>
      )}

      <div className="mt-6 space-y-6">
        {data!.sections.map((s) => (
          <section key={s.node.id}>
            <div className="mb-2 flex items-center gap-2">
              <Link href={`/nodes/${s.node.id}`} className="text-lg font-semibold text-blue-700 hover:underline">
                {s.node.name_zh}
              </Link>
              <span className="text-xs text-gray-400">{s.node.name_en}</span>
              <button
                onClick={() => unwatch(s.node.id)}
                className="ml-auto rounded border border-[var(--pg-border)] bg-white px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                取消关注
              </button>
            </div>
            <div className="space-y-2">
              {s.items.map((p) => (
                <PaperCard key={p.id} paper={p} />
              ))}
              {s.items.length === 0 && <p className="text-sm text-gray-400">该方向暂无进展记录</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
