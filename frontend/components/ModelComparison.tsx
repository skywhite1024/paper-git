import Link from "next/link";

export default function ModelComparison() {
  return <section className="model-comparison" aria-labelledby="comparison-title">
    <div className="section-heading"><div><p className="eyebrow">READ THE INPUTS & OUTPUTS</p><h2 id="comparison-title">WM、VLA、WAM，分别在预测什么？</h2></div><Link className="text-link" href="/sources#transcripts">文字稿如何影响路线 →</Link></div>
    <div className="model-grid">
      <article className="model-card tone-world-models"><span className="eyebrow">WORLD MODEL</span><h3>预测行动的后果</h3><div className="model-equation"><span>观测 / 状态 + 条件</span><b aria-hidden="true">↓</b><strong>未来状态 / 表征 / 画面</strong></div><p>用于控制时，通常需要动作条件；世界模型并不一定生成视频。</p><Link href="/papers/dino-wm">DINO-WM ↗</Link></article>
      <article className="model-card tone-vla"><span className="eyebrow">VISION–LANGUAGE–ACTION</span><h3>把理解变成动作</h3><div className="model-equation"><span>观测 + 语言（可含本体状态）</span><b aria-hidden="true">↓</b><strong>可执行动作 / 动作块</strong></div><p>A 指动作输出。动作可离散编码，也可由连续生成模型给出。</p><Link href="/papers/pi0">π0 ↗</Link></article>
      <article className="model-card tone-robot-agentic"><span className="eyebrow">WORLD ACTION MODEL</span><h3>联合预测世界与动作</h3><div className="model-equation"><span>观测 + 任务 + 历史</span><b aria-hidden="true">↓</b><strong>未来观测与动作的联合建模</strong></div><p>比较训练目标、推理时输出和真实观测纠偏，不能只看模型底座。</p><Link href="/papers/dreamzero">DreamZero ↗</Link></article>
    </div>
    <p className="comparison-caption">用于阅读比较的简化框架，三类能力可以在同一系统中组合。下一步都要回到环境：执行 → 观察 → 更新。</p>
  </section>;
}
