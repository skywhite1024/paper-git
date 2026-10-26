import Link from "next/link";
import { catalog, papers, tracks } from "@/lib/catalog";
import Roadmap from "@/components/Roadmap";
import PaperCard from "@/components/PaperCard";
import ModelComparison from "@/components/ModelComparison";

export default function Home() {
  const frontier = papers.filter((paper) => paper.kind === "preprint");
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow"><span className="tiny-star" aria-hidden="true">✳</span> A PERSONAL ATLAS OF EMBODIED INTELLIGENCE</p>
        <h1>把论文，<br />读成自己的<span className="title-accent">研究脉络。</span></h1>
        <p className="hero-description">世界如何预测，动作如何学习，任务如何闭环。<br className="desktop-break" />沿着三个问题，连接经典方法与正在发生的新研究。</p>
        <div className="button-row"><a className="button primary" href="#roadmaps">从路线开始 <span aria-hidden="true">↓</span></a><Link className="button subtle" href="/library">浏览全部资料 <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="concept-map" aria-label="三条路线通过预测、行动和反馈相互联系">
        <p className="map-label">ONE QUESTION, THREE PERSPECTIVES</p>
        <div className="concept-node concept-world"><span>01 / PREDICT</span><strong>世界模型</strong><small>如果这样做，会发生什么？</small></div>
        <div className="concept-connector" aria-hidden="true">↓ <span>预测与规划</span></div>
        <div className="concept-pair"><div className="concept-node concept-vla"><span>02 / ACT</span><strong>VLA</strong><small>让理解变成动作</small></div><span className="pair-arrow" aria-hidden="true">⇄</span><div className="concept-node concept-agent"><span>03 / REASON</span><strong>Robot Agentic</strong><small>把动作接成任务</small></div></div>
        <div className="feedback-line"><span aria-hidden="true">↳</span> 环境反馈，让下一次行动更好 <span aria-hidden="true">↰</span></div>
        <span className="map-caption">研究问题的联系 · 非论文引用图</span>
      </div>
    </section>
    <div className="collection-strip"><div><strong>03</strong><span>聚焦的研究主线</span></div><div><strong>{String(papers.length).padStart(2, "0")}</strong><span>精选论文与报告</span></div><div><strong>{String(catalog.resources.length).padStart(2, "0")}</strong><span>配套资料入口</span></div><Link href="/sources">为什么收录这些资料？ <span aria-hidden="true">↗</span></Link></div>
    <section id="roadmaps" className="roadmaps-section"><div className="section-heading"><div><p className="eyebrow">FOLLOW A QUESTION</p><h2>三条路线，一张阅读地图</h2></div><span className="flow-note">按问题分阶段 · 箭头表示建议阅读顺序</span></div>{tracks.map((track) => <Roadmap key={track.id} track={track} />)}</section>
    <section className="bridges-section"><div className="section-heading"><div><p className="eyebrow">WHERE IDEAS MEET</p><h2>在路线交汇处，继续提问</h2></div></div><div className="bridge-grid">{catalog.bridges.map((bridge, i) => <article className="bridge-card" key={bridge.title}><span className="bridge-index">0{i + 1}</span><h3>{bridge.title}</h3><p>{bridge.description}</p><div className="stage-papers">{bridge.papers.map((id) => <Link key={id} href={`/papers/${id}`}>{papers.find((paper) => paper.id === id)?.name} ↗</Link>)}</div></article>)}</div></section>
    <ModelComparison />
    <section><div className="section-heading"><div><p className="eyebrow">FRONTIER WATCH / 2026</p><h2>前沿观察，带着问题读</h2></div><Link className="text-link" href="/library">全部资料 →</Link></div><p className="section-description">以下按预印本收录，有项目证据，也保留尚待验证的问题。</p><div className="paper-grid">{frontier.map((paper) => <PaperCard key={paper.id} paper={paper} />)}</div></section>
  </>;
}
