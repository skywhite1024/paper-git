import { formatMetricCount, githubStatusLabels, metricsCheckedAt, paperMetrics } from "@/lib/paper-metrics";

export default function PaperMetrics({ id, links = true, showDate = false }: { id: string; links?: boolean; showDate?: boolean }) {
  const metric = paperMetrics[id];
  if (!metric) return null;
  const { github, citations } = metric;
  const repositoryNote = `${github.repo ?? "未核实到官方 GitHub 实现"}${github.license ? ` · ${github.license}` : ""}${github.shared ? " · Stars 为共享仓库总数" : ""}。${github.status === "public" ? "标准开源代码许可未确认；请核对仓库许可。" : ""}${github.note} 核验：${metricsCheckedAt}`;
  const citationNote = citations.count === null ? `${citations.note} 未知不表示零引用。核验：${metricsCheckedAt}` : `Semantic Scholar · ${citations.basis} · ${citations.title}。${citations.note} 统计：${metricsCheckedAt}`;
  function item(text: string, title: string, url: string | null, className?: string) {
    return links && url ? <a className={className} href={url} target="_blank" rel="noreferrer" title={title}>{text}</a> : <span className={className} title={title}>{text}</span>;
  }
  return <div className="paper-metrics-block">
    <div className="paper-metrics" aria-label="代码开放状态、仓库 Stars 与论文引用数">
      {item(githubStatusLabels[github.status], repositoryNote, github.url, `metrics-github ${github.status}`)}
      {item(`Stars ${formatMetricCount(github.stars)}${github.shared ? "（共享）" : ""}`, repositoryNote, github.repo ? `https://github.com/${github.repo}/stargazers` : null)}
      {item(`引用 ${formatMetricCount(citations.count)}`, citationNote, citations.url)}
    </div>
    {showDate && <p className="paper-metrics-date">快照 {metricsCheckedAt} · 引用：Semantic Scholar{citations.count !== null ? ` / ${citations.basis}` : " / 暂无可核实记录"} · <a href={github.evidence} target="_blank" rel="noreferrer">代码核验依据 ↗</a></p>}
  </div>;
}
