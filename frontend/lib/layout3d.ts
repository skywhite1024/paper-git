/**
 * 确定性三维布局引擎。
 * 结构隐喻：路线 = 走廊（Z 轴分层），阶段 = 地层（X 轴推进），方法 = 地层上的货架节点（Z/Y 晶格）。
 * 所有坐标由数据唯一决定（无物理模拟），保证每次渲染一致、可扩展到任意多路线族：
 * 新增一条路线只是新增一条走廊，新增阶段只是沿 X 轴延伸。
 */

import { LINK_COLORS, routeColor } from "@/lib/routeColors";

export const STAGE_W = 30;
export const CORRIDOR_Z = 58;
export const ENTRANCE_X = -26;
export const PER_LINE = 5;
export const LINE_DZ = 7.2;
export const LEVEL_DY = 8.5;

export type LayoutNode = {
  id: string;
  kind: "hub" | "stage" | "paper";
  label: string;
  route?: string;
  stage?: string;
  stage_idx?: number;
  year?: number;
  key?: boolean;
  x: number;
  y: number;
  z: number;
  color: string;
  radius: number;
};

export type LayoutEdge = {
  kind: string;
  from: string;
  to: string;
  label?: string;
  points: [number, number, number][];
  color: string;
};

export type Corridor = {
  route: string;
  name: string;
  color: string;
  z: number;
  x0: number;
  x1: number;
  stages: { idx: number; name: string; x: number; anchorId: string; count: number }[];
};

export type SceneLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  corridors: Corridor[];
  center: [number, number, number];
  initialCamera: [number, number, number];
};

type NetNode = {
  id: string;
  kind: "hub" | "stage" | "paper";
  label: string;
  route?: string;
  stage?: string;
  stage_idx?: number;
  year?: number;
  key?: boolean;
};

type NetLink = { source: string; target: string; kind: string; label?: string };

type RouteMeta = { id: string; name_zh: string; stages: string[] };

function paperLattice(routeZ: number, stageX: number, index: number): { x: number; y: number; z: number } {
  const line = index % PER_LINE;
  const level = Math.floor(index / PER_LINE);
  const z = routeZ + (line - (PER_LINE - 1) / 2) * LINE_DZ;
  const y = 4.2 + level * LEVEL_DY;
  return { x: stageX, y, z };
}

export function computeLayout(nodes: NetNode[], links: NetLink[], routesMeta: RouteMeta[]): SceneLayout {
  const corridorZ = new Map(routesMeta.map((r, i) => [r.id, (i - (routesMeta.length - 1) / 2) * CORRIDOR_Z]));
  const pos = new Map<string, [number, number, number]>();

  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    const z = corridorZ.get(n.route ?? "") ?? 0;
    if (n.kind === "hub") {
      const p: [number, number, number] = [ENTRANCE_X, 9, z];
      pos.set(n.id, p);
      return { ...n, x: p[0], y: p[1], z: p[2], color: routeColor(n.route ?? ""), radius: 3.2 };
    }
    if (n.kind === "stage") {
      const x = STAGE_W * (n.stage_idx ?? 0);
      const p: [number, number, number] = [x, 6.4, z - 21];
      pos.set(n.id, p);
      return { ...n, x: p[0], y: p[1], z: p[2], color: routeColor(n.route ?? ""), radius: 2.4 };
    }
    const stageX = STAGE_W * (n.stage_idx ?? 0);
    const stageKey = `${n.route}:${n.stage_idx}`;
    const siblings = nodes.filter((m) => m.kind === "paper" && m.route === n.route && m.stage_idx === n.stage_idx);
    const index = siblings.findIndex((m) => m.id === n.id);
    const { x, y, z: pz } = paperLattice(z, stageX, Math.max(0, index));
    const p: [number, number, number] = [x, y, pz];
    pos.set(n.id, p);
    return {
      ...n,
      x: p[0],
      y: p[1],
      z: p[2],
      color: routeColor(n.route ?? ""),
      radius: (n as NetNode & { key?: boolean }).key ? 1.75 : 1.1,
    };
  });

  const layoutEdges: LayoutEdge[] = links.map((l) => {
    const a = pos.get(l.source);
    const b = pos.get(l.target);
    const kind = l.kind;
    let points: [number, number, number][];
    if (!a || !b) {
      points = [
        [0, 0, 0],
        [0, 1, 0],
      ];
    } else if (kind === "loop") {
      const mid: [number, number, number] = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 42, (a[2] + b[2]) / 2];
      points = [a, mid, b];
    } else if (kind === "pipeline") {
      points = [a, [(a[0] + b[0]) / 2, 1.1, a[2]], b];
    } else {
      const rise = Math.max(4.5, Math.abs(a[1] - b[1]) * 0.6 + 3);
      const mid: [number, number, number] = [
        (a[0] + b[0]) / 2 + (a[0] === b[0] ? (a[2] === b[2] ? 5 : 0) : 0),
        Math.max(a[1], b[1]) + rise,
        (a[2] + b[2]) / 2,
      ];
      points = [a, mid, b];
    }
    return { kind, from: l.source, to: l.target, label: l.label, points, color: LINK_COLORS[kind] ?? "#64748b" };
  });

  const corridors: Corridor[] = routesMeta.map((r) => {
    const z = corridorZ.get(r.id)!;
    const stageNodes = nodes.filter((n) => n.kind === "stage" && n.route === r.id);
    const stages = stageNodes
      .sort((a, b) => (a.stage_idx ?? 0) - (b.stage_idx ?? 0))
      .map((s) => ({
        idx: s.stage_idx ?? 0,
        name: s.label,
        x: STAGE_W * (s.stage_idx ?? 0),
        anchorId: s.id,
        count: nodes.filter((m) => m.kind === "paper" && m.route === r.id && m.stage_idx === s.stage_idx).length,
      }));
    return {
      route: r.id,
      name: r.name_zh,
      color: routeColor(r.id),
      z,
      x0: ENTRANCE_X - 4,
      x1: STAGE_W * Math.max(0, stages.length - 1) + STAGE_W / 2,
      stages,
    };
  });

  const maxStageCount = Math.max(...routesMeta.map((r) => r.stages.length), 1);
  const center: [number, number, number] = [
    (ENTRANCE_X + STAGE_W * (maxStageCount - 1)) / 2,
    6,
    0,
  ];
  const initialCamera: [number, number, number] = [center[0] - 88, 96, 190];

  return { nodes: layoutNodes, edges: layoutEdges, corridors, center, initialCamera };
}
