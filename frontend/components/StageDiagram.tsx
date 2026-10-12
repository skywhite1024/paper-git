"use client";

/**
 * 阶段/路线原理示意小图：按路线类型渲染自绘流程（无版权风险，可随处嵌入）。
 *
 * 排版策略（纯 CSS，随容器宽度自适应，无需测量节点）：
 *  - 宽容器：单行横向流程链，块与块之间给出方向箭头；
 *  - 窄容器（侧栏 / HUD，约 300px）：流程链自动折行成 2-3 行，编号与箭头保留，
 *    顺序仍然可读；名称过长时在块内省略，完整文字由 title 与可访问列表暴露。
 * 不再使用等比缩放的 SVG 文字：那种做法在 300px 容器里会把字压到 6px 以下，完全不可读。
 * 配色全部走主题令牌，深浅色均由 CSS 变量驱动，切换 data-theme 时自动重绘。
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

/** 供 title / aria 使用的完整流程文字，缩略时不丢信息。 */
function fullFlow(steps: string[], loop: boolean) {
  return steps.map((s, i) => `${L.hud.stepOf(i + 1)} ${s}`).join(" → ") + (loop ? " → ↺" : "");
}

export default function StageDiagram({
  route,
  caption,
  height = 92,
}: {
  route: string;
  caption?: string;
  /** 期望高度，作为 min-height 使用：内容需要更多行时允许自然增高，避免文字被裁切。 */
  height?: number;
}) {
  const steps = DIAGRAMS[route] ?? DIAGRAMS.usd;
  const loop = LOOP_ROUTES.has(route);
  const label = L.hud.diagramOf(caption ?? route);

  return (
    <div
      role="group"
      aria-label={label}
      title={`${label}：${fullFlow(steps, loop)}`}
      className="w-full rounded-lg border border-line bg-bg px-2 py-2"
      style={{ minHeight: height }}
    >
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex min-w-0 max-w-full items-center gap-1">
            <span
              title={`${L.hud.stepOf(i + 1)} ${s}`}
              className="flex min-w-0 max-w-full items-center gap-1 rounded-md border border-line bg-surface py-[3px] pl-1 pr-1.5"
            >
              <span
                aria-hidden
                className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full bg-accent-soft text-[9px] font-semibold leading-none tabular-nums text-accent"
              >
                {i + 1}
              </span>
              <span className="truncate text-[11px] font-medium leading-4 text-fg">{s}</span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="shrink-0 text-[11px] leading-4 text-subtle">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      {loop && (
        <p className="mt-1.5 flex items-center gap-1 border-t border-dashed border-line pt-1.5 text-[11px] leading-4 text-ok">
          <span aria-hidden className="text-[12px]">
            ↺
          </span>
          <span className="min-w-0 truncate">{L.hud.loopNote}</span>
        </p>
      )}
    </div>
  );
}
