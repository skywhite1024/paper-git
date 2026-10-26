import Link from "next/link";
import { notFound } from "next/navigation";
export const dynamicParams = false;
import { getTrack, papersFor, tracks } from "@/lib/catalog";
import PaperCard from "@/components/PaperCard";
export function generateStaticParams() { return tracks.map(({ id }) => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { return { title: getTrack((await params).id)?.name ?? "研究路线" }; }
export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const track = getTrack((await params).id);
  if (!track) notFound();
  return <div className={`tone-${track.id}`}><Link className="back-link" href="/">← 全部研究路线</Link><div className="page-intro track-intro"><p className="eyebrow">{track.number} / {track.english}</p><h1>{track.name}</h1><p>{track.description}</p><div className="stage-jumps">{track.stages.map((stage, i) => <a href={`#${stage.id}`} key={stage.id}><span>0{i + 1}</span>{stage.name}</a>)}</div></div>
    <p className="flow-note">以下是建议阅读顺序。阶段之间有交叉，不代表严格的年代演进或论文引用关系。</p>
    {track.stages.map((stage, i) => <section className="track-stage" key={stage.id} id={stage.id}><div className="stage-detail-heading"><span className="stage-number">0{i + 1}</span><div><p className="eyebrow">{stage.question}</p><h2>{stage.name}</h2><p>{stage.guide}</p></div></div><div className="paper-grid">{papersFor(stage.papers).map((paper) => <PaperCard key={paper.id} paper={paper} />)}</div></section>)}
  </div>;
}
