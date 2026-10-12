"use client";

/**
 * 阶段/路线原理示意小图：按路线类型渲染自绘 SVG 流程（无版权风险，可随处嵌入）。
 * 配色取自主题令牌，切换 data-theme 时随 CSS 变量自动重绘。
 */

import { L } from "@/lib/lexicon";

const DIAGRAMS: Record<string, string[]> = {
  usd: ["采样 z", "策略 π", "环境", "判别 q", "技能库"],
  demo: ["轨迹输入", "边界发现", "技能表示", "可执行控制"],
  guided: ["语义先验", "区域约束", "主动反馈", "验证获取", "技能库"],
  taskgen: ["任务提议", "场景编译", "静态检查", "执行求解", "课程更新"],
  datax: ["少量示范", "变换/重定向", "几何筛选", "大规模轨迹", "策略学习"],
  compose: ["几何约束", "技能连接", "编排监控", "失败恢复", "契约治理"],
};

const LOOP_ROUTES = new Set(["usd", "guided", "taskgen", "compose"]);

function Flow({ steps, loop }: { steps: string[]; loop?: boolean }) {
  const n = steps.length;
  const boxW = Math.min(56, Math.floor(196 / n) - 10);
  const gap = (196 - n * boxW) / (n - 1);
  return (
    <svg viewBox="0 0 220 84" className="h-full w-full">
      <defs>
        <marker id="sd-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--c-subtle)" />
        </marker>
      </defs>
      {steps.map((s, i) => {
        const x = 12 + i * (boxW + gap);
        return (
          <g key={s}>
            <rect x={x} y={26} width={boxW} height={30} rx={5} fill="var(--c-accent-soft)" stroke="var(--c-accent)" strokeOpacity={0.45} />
            <text x={x + boxW / 2} y={40} fontSize={8} textAnchor="middle" fill="var(--c-accent)">
              {s.length > 7 ? s.slice(0, 6) + "…" : s}
            </text>
            <text x={x + boxW / 2} y={51} fontSize={7} textAnchor="middle" fill="var(--c-subtle)">
              {L.hud.stepOf(i + 1)}
            </text>
            {i < n - 1 && (
              <line
                x1={x + boxW + 1}
                y1={41}
                x2={x + boxW + gap - 3}
                y2={41}
                stroke="var(--c-subtle)"
                strokeWidth={1.2}
                markerEnd="url(#sd-arrow)"
              />
            )}
          </g>
        );
      })}
      {loop && (
        <>
          <path
            d="M 20 62 L 200 62"
            stroke="var(--c-ok)"
            strokeWidth={1.2}
            strokeDasharray="4 3"
            fill="none"
            markerEnd="url(#sd-arrow)"
          />
          <text x={110} y={76} fontSize={7.5} fill="var(--c-ok)" textAnchor="middle">
            {L.hud.loopNote}
          </text>
        </>
      )}
    </svg>
  );
}

export default function StageDiagram({
  route,
  caption,
  height = 84,
}: {
  route: string;
  caption?: string;
  height?: number;
}) {
  const steps = DIAGRAMS[route] ?? DIAGRAMS.usd;
  const label = L.hud.diagramOf(caption ?? route);
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className="w-full rounded-lg border border-line bg-bg p-1"
      style={{ height }}
    >
      <Flow steps={steps} loop={LOOP_ROUTES.has(route)} />
    </div>
  );
}
