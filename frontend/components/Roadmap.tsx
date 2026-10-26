import Link from "next/link";
import { getPaper, type Track } from "@/lib/catalog";

export default function Roadmap({ track }: { track: Track }) {
  return <section className={`roadmap tone-${track.id}`} aria-labelledby={`track-${track.id}`}>
    <div className="roadmap-heading"><div className="track-identity"><span className="track-number">{track.number}</span><div><p className="eyebrow">{track.english}</p><h2 id={`track-${track.id}`}><Link href={`/tracks/${track.id}`}>{track.name}</Link></h2></div></div><Link className="track-link" href={`/tracks/${track.id}`}>展开路线 <span aria-hidden="true">↗</span></Link></div>
    <ol className="stage-flow">{track.stages.map((stage, index) => <li key={stage.id} className="stage-card">
      <div className="stage-index"><span>0{index + 1}</span><span>{stage.papers.length} 篇</span></div>
      <h3><Link href={`/tracks/${track.id}#${stage.id}`}>{stage.name}</Link></h3>
      <p>{stage.question}</p>
      <div className="stage-papers">{stage.papers.slice(0, 3).map((id) => <Link href={`/papers/${id}`} key={id}>{getPaper(id)?.name}</Link>)}{stage.papers.length > 3 && <Link className="more" href={`/tracks/${track.id}#${stage.id}`}>+{stage.papers.length - 3}</Link>}</div>
      {index < track.stages.length - 1 && <span className="flow-arrow" aria-hidden="true">→</span>}
    </li>)}</ol>
  </section>;
}
