import snapshot from "@/content/paper-metrics.json";

export type PaperMetricsRecord = {
  github: { status: "open" | "public" | "unconfirmed" | "unavailable"; url: string | null; repo: string | null; stars: number | null; license: string | null; shared: boolean; note: string; evidence: string };
  citations: { count: number | null; url: string | null; paperId: string | null; lookupId: string | null; title: string | null; basis: string; note: string };
};

export const metricsCheckedAt = snapshot.checkedAt;
export const paperMetrics = snapshot.papers as Record<string, PaperMetricsRecord>;
export const githubStatusLabels = { open: "GitHub 开源", public: "GitHub 公开", unconfirmed: "GitHub 未确认", unavailable: "GitHub 暂不可用" };
export function formatMetricCount(count: number | null) { return count === null ? "—" : count.toLocaleString("en-US"); }
