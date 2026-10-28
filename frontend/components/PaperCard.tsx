import Link from "next/link";
import { getTrack, kindNames, type Paper } from "@/lib/catalog";
import PaperMetrics from "./PaperMetrics";

export function PaperBadges({ paper }: { paper: Paper }) {
  return <div className="badges"><span className={`badge ${paper.kind}`}>{paper.venue} · {paper.year}</span>{paper.distinction && <span className="badge honor">{paper.distinction.label}</span>}{paper.ccf && <span className="badge">CCF {paper.ccf}</span>}</div>;
}

export default function PaperCard({ paper }: { paper: Paper }) {
  return <article className={`paper-card tone-${paper.track}`}>
    <div className="paper-kicker"><span>{getTrack(paper.track)?.name}</span><span>{kindNames[paper.kind]}</span></div>
    <h3><Link href={`/papers/${paper.id}`}>{paper.name}<span aria-hidden="true">↗</span></Link></h3>
    <p className="paper-title">{paper.title}</p>
    <PaperBadges paper={paper} />
    <PaperMetrics id={paper.id} />
    <p className="paper-summary">{paper.summary}</p>
    <Link className="text-link" href={`/papers/${paper.id}`}>阅读导引 <span aria-hidden="true">→</span></Link>
  </article>;
}
