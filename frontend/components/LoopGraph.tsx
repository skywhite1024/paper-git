"use client";

import { useRouter } from "next/navigation";
import type { LoopEdge, LoopNode } from "@/lib/api";

const NODE_W = 128;
const NODE_H = 46;

const POS: Record<string, { x: number; y: number }> = {
  A: { x: 10, y: 230 },
  B: { x: 165, y: 230 },
  B1: { x: 320, y: 60 },
  B2: { x: 320, y: 138 },
  B3: { x: 320, y: 216 },
  B4: { x: 320, y: 294 },
  C: { x: 490, y: 90 },
  E: { x: 490, y: 294 },
  D: { x: 490, y: 192 },
  F: { x: 650, y: 192 },
  G: { x: 790, y: 100 },
  H: { x: 790, y: 192 },
  I: { x: 790, y: 284 },
};

const KIND_STYLE: Record<string, string> = {
  input: "#eef2f6",
  hub: "#fde68a",
  route: "#dbeafe",
  data: "#dcfce7",
  process: "#f3e8ff",
  artifact: "#ffe4e6",
};

function edgePath(from: LoopNode, to: LoopNode, feedback: boolean) {
  const a = POS[from.id];
  const b = POS[to.id];
  const x1 = a.x + NODE_W / 2;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x + NODE_W / 2;
  const y2 = b.y + NODE_H / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (feedback) {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1 + 140}, ${mx} ${y2 + 140}, ${x2} ${y2}`;
  }
  const bend = Math.max(24, Math.min(Math.abs(dx) * 0.45, 60)) * (dx >= 0 ? 1 : -1);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

export default function LoopGraph({ nodes, edges }: { nodes: LoopNode[]; edges: LoopEdge[] }) {
  const router = useRouter();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--pg-border)] bg-white p-2">
      <svg width={940} height={470} className="mx-auto block">
        <defs>
          <marker id="loop-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#6b7280" />
          </marker>
          <marker id="loop-arrow-fb" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#9333ea" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const from = byId.get(e.from);
          const to = byId.get(e.to);
          if (!from || !to) return null;
          const feedback = e.kind === "feedback";
          return (
            <g key={i}>
              <path
                d={edgePath(from, to, feedback)}
                fill="none"
                stroke={feedback ? "#9333ea" : "#94a3b8"}
                strokeWidth={feedback ? 2 : 1.5}
                strokeDasharray={feedback ? "6 4" : undefined}
                markerEnd={feedback ? "url(#loop-arrow-fb)" : "url(#loop-arrow)"}
                opacity={0.85}
              />
              {e.label && (
                <text
                  x={(POS[e.from].x + POS[e.to].x) / 2 + NODE_W / 2}
                  y={(POS[e.from].y + POS[e.to].y) / 2 - 6}
                  fontSize={10}
                  fill="#64748b"
                  textAnchor="middle"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = POS[n.id];
          const fill = KIND_STYLE[n.kind] ?? "#f1f5f9";
          const isRoute = n.kind === "route";
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              onClick={isRoute && n.route ? () => router.push(`/routes/${n.route}`) : undefined}
              style={{ cursor: isRoute && n.route ? "pointer" : "default" }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={fill}
                stroke={isRoute ? "#2563eb" : "#cbd5e1"}
                strokeWidth={isRoute ? 1.8 : 1}
              />
              <text
                x={NODE_W / 2}
                y={n.label.length > 14 ? 20 : 28}
                fontSize={11}
                fill="#1f2328"
                textAnchor="middle"
                fontWeight={isRoute ? 600 : 400}
              >
                {n.label.length > 16 ? n.label.slice(0, 15) + "…" : n.label}
              </text>
              {n.label.length > 14 && (
                <text x={NODE_W / 2} y={35} fontSize={10} fill="#475569" textAnchor="middle">
                  {n.label.slice(15, 30)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
