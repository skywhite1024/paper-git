"use client";

import { useRef, useState } from "react";
import { assetPath, frameworks } from "@/lib/atlas";
import type { Paper } from "@/lib/catalog";

export default function FrameworkFigure({ paper }: { paper: Paper }) {
  const framework = frameworks[paper.id];
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  if (!framework) return <div className="atlas-figure-empty"><span className="eyebrow">CONTINUE IN THE PAPER</span><h3>从原文继续探索框架</h3><p>这篇资料的框架图尚未收录，可以先阅读下方导读，或前往作者提供的论文与项目。</p><a href={paper.links[0].url} target="_blank" rel="noreferrer">打开原始资料 ↗</a></div>;
  const { figure } = framework;
  const src = assetPath(`/figures/${figure.file}`);
  return <figure className="atlas-framework">
    <div className="atlas-figure-heading"><span>关键框架 <small>FRAMEWORK</small></span><button onClick={() => dialog.current?.showModal()} disabled={failed} aria-label={`放大 ${paper.name} 框架图`}>⤢ 放大</button></div>
    {failed ? <div className="atlas-figure-empty"><p>图片暂时无法加载。</p><a href={figure.url} target="_blank" rel="noreferrer">查看作者原图 ↗</a></div> : <button className="atlas-figure-image" onClick={() => dialog.current?.showModal()} aria-label={`查看 ${paper.name} 完整框架图`}><img src={src} alt={`${figure.title}：${figure.caption}`} onError={() => setFailed(true)} /></button>}
    <figcaption><span>{figure.title}</span><a href={figure.source} target="_blank" rel="noreferrer">{figure.credit} ↗</a></figcaption>
    <p className="atlas-figure-caption">{figure.caption}</p>
    <ol className="atlas-figure-steps">{framework.steps.map((step, i) => <li key={step}><span>0{i + 1}</span>{step}</li>)}</ol>
    <dialog ref={dialog} className="atlas-lightbox" aria-label={`${paper.name} 框架原图`} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="atlas-lightbox-head"><div><strong>{paper.name}</strong><span>{figure.title}</span></div><button autoFocus onClick={() => dialog.current?.close()} aria-label="关闭框架图">关闭 ×</button></div>
      <div className="atlas-lightbox-body"><img src={src} alt={figure.title} /></div><p>{figure.caption} <a href={figure.source} target="_blank" rel="noreferrer">来源 ↗</a> · <a href={src} target="_blank" rel="noreferrer">打开完整图片 ↗</a></p>
    </dialog>
  </figure>;
}
