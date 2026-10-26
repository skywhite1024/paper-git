import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaper, getTrack, kindNames, nextPapers, papers } from "@/lib/catalog";
import { PaperBadges } from "@/components/PaperCard";
import ReadingEditor from "@/components/ReadingEditor";
export function generateStaticParams() { return papers.map(({ id }) => ({ id })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { return { title: getPaper((await params).id)?.name ?? "资料详情" }; }
export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const paper = getPaper((await params).id);
  if (!paper) notFound();
  const track = getTrack(paper.track)!;
  const stage = track.stages.find((item) => item.papers.includes(paper.id))!;
  const next = nextPapers(paper);
  const links = paper.links.filter((link, index, all) => all.findIndex((other) => other.url === link.url) === index);
  return <div className={`tone-${paper.track}`}>
    <Link className="back-link" href={`/tracks/${track.id}#${stage.id}`}>← {track.name} / {stage.name}</Link>
    <header className="paper-hero"><p className="eyebrow">{kindNames[paper.kind]} / {track.english}</p><h1>{paper.name}</h1><p className="full-title">{paper.title}</p><PaperBadges paper={paper} /><div className="button-row">{links.map((link, i) => <a key={link.url} className={`button ${i === 0 ? "primary" : ""}`} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div></header>
    <div className="paper-detail-grid"><div>
      <section className="detail-section"><p className="eyebrow">THE IDEA</p><h2>它在解决什么</h2><p className="lead">{paper.summary}</p></section>
      <section className="detail-section"><p className="eyebrow">WHY READ IT</p><h2>为什么放在这条路线</h2><p>{paper.why}</p><div className="route-context"><span>当前阶段</span><Link href={`/tracks/${track.id}#${stage.id}`}>{stage.name} ↗</Link><p>{stage.question}</p></div></section>
      <section className="detail-section caveat"><p className="eyebrow">READ WITH A QUESTION</p><h2>读的时候，留意什么</h2><p>{paper.watchFor}</p></section>
      <ReadingEditor id={paper.id} />
    </div><aside className="paper-aside">
      <section className="evidence-card"><p className="eyebrow">SOURCE NOTES</p><h2>来源与收录记录</h2><dl><dt>资料性质</dt><dd>{kindNames[paper.kind]}</dd><dt>发表 / 版本</dt><dd>{paper.venue} · {paper.year}</dd><dt>核验日期</dt><dd>{paper.checkedAt}</dd></dl><p className="small-copy">{paper.reviewScope}</p>{paper.ccf && <p className="small-copy">CCF {paper.ccf} 采用 2026 目录评级。</p>}{["RSS", "CoRL"].includes(paper.venue) && <p className="small-copy">按机器人领域重点会议收录，未赋予 CCF 等级。</p>}<ul className="source-links">{paper.evidence.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}{paper.distinction && <li><a href={paper.distinction.url} target="_blank" rel="noreferrer">{paper.distinction.label} 标记依据 ↗</a></li>}</ul><Link className="text-link" href="/sources">查看收录标准 →</Link></section>
      {next.length > 0 && <section className="next-card"><p className="eyebrow">KEEP READING</p><h2>接下来可以读</h2>{next.map((item) => <Link key={item.id} href={`/papers/${item.id}`}><strong>{item.name} ↗</strong><span>{item.summary}</span></Link>)}</section>}
    </aside></div>
  </div>;
}
