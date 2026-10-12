/**
 * 确定性三维布局引擎。
 * 结构隐喻：路线 = 走廊（Z 轴分层），阶段 = 地层（X 轴推进），方法 = 地层上的货架节点（Z/Y 晶格）。
 * 所有坐标由数据唯一决定（无物理模拟）：新增一条路线只是新增一条走廊，新增阶段只是沿 X 轴延伸。
 * 除坐标外还输出包围盒与包围球半径，供相机按容器宽高比自适应取景（见 fitFrame）。
 */

import { LINK_COLORS, routeColor } from "@/lib/routeColors";

export const STAGE_W = 26;
export const CORRIDOR_Z = 34;
export const CORRIDOR_WIDTH = 27;
export const ENTRANCE_X = -24;
export const PER_LINE = 5;
export const LINE_DZ = 5.2;
export const LEVEL_DY = 6.4;
export const SHELF_Y = 5.4;

export const R_HUB = 4.6;
export const R_STAGE = 3.4;
export const R_PAPER_KEY = 2.7;
export const R_PAPER = 2.05;

export const CAMERA_FOV = 50;

export type Vec3 = [number, number, number];

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
  points: Vec3[];
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
  center: Vec3;
  min: Vec3;
  max: Vec3;
  /** 包围球半径：相机取景与雾、光照尺度都由它推导。 */
  radius: number;
  /** 单位视角方向（target -> camera），配合 fitFrame 得到初始机位。 */
  viewDir: Vec3;
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

function paperLattice(routeZ: number, stageX: number, index: number): Vec3 {
  const line = index % PER_LINE;
  const level = Math.floor(index / PER_LINE);
  return [
    stageX,
    SHELF_Y + level * LEVEL_DY,
    routeZ + (line - (PER_LINE - 1) / 2) * LINE_DZ,
  ];
}

export type Frame = { dist: number; target: Vec3 };

/**
 * 取景求解：给定容器宽高比与视场，反解「沿 viewDir 观察整个包围盒」所需的机位距离与注视点。
 * 逐角点做透视反解（近侧角点最吃距离），再把投影后的画面中心平移回视口中央，
 * 否则透视会让近处走廊压在下边缘、上方留出大片空白。
 */
export function fitFrame(
  scene: Pick<SceneLayout, "center" | "min" | "max" | "viewDir" | "radius">,
  aspect: number,
  fovDeg = CAMERA_FOV,
  pad = 1.06
): Frame {
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * (Number.isFinite(aspect) && aspect > 0 ? aspect : 1);
  const v = norm(scene.viewDir) ?? [0, 0, 1];
  const xAxis: Vec3 = norm(cross([0, 1, 0], v)) ?? [1, 0, 0];
  const yAxis: Vec3 = cross(v, xAxis);
  const corners: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push([
      i & 1 ? scene.max[0] : scene.min[0],
      i & 2 ? scene.max[1] : scene.min[1],
      i & 4 ? scene.max[2] : scene.min[2],
    ]);
  }

  let target: Vec3 = [...scene.center];
  let dist = scene.radius;
  for (let pass = 0; pass < 3; pass++) {
    let need = scene.radius * 0.5;
    let nx0 = Infinity;
    let nx1 = -Infinity;
    let ny0 = Infinity;
    let ny1 = -Infinity;
    for (const c of corners) {
      const u: Vec3 = [c[0] - target[0], c[1] - target[1], c[2] - target[2]];
      const xv = dot(u, xAxis);
      const yv = dot(u, yAxis);
      const dv = dot(u, v);
      need = Math.max(need, Math.abs(xv) / tanH + dv, Math.abs(yv) / tanV + dv);
    }
    dist = need * pad;
    for (const c of corners) {
      const u: Vec3 = [c[0] - target[0], c[1] - target[1], c[2] - target[2]];
      const depth = Math.max(0.001, dist - dot(u, v));
      const nx = dot(u, xAxis) / (tanH * depth);
      const ny = dot(u, yAxis) / (tanV * depth);
      nx0 = Math.min(nx0, nx);
      nx1 = Math.max(nx1, nx);
      ny0 = Math.min(ny0, ny);
      ny1 = Math.max(ny1, ny);
    }
    const shiftX = (nx0 + nx1) / 2;
    const shiftY = (ny0 + ny1) / 2;
    target = [
      target[0] + xAxis[0] * shiftX * tanH * dist + yAxis[0] * shiftY * tanV * dist,
      target[1] + xAxis[1] * shiftX * tanH * dist + yAxis[1] * shiftY * tanV * dist,
      target[2] + xAxis[2] * shiftX * tanH * dist + yAxis[2] * shiftY * tanV * dist,
    ];
  }
  return { dist, target };
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function norm(a: Vec3): Vec3 | null {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-6 ? null : [a[0] / l, a[1] / l, a[2] / l];
}

export function computeLayout(nodes: NetNode[], links: NetLink[], routesMeta: RouteMeta[]): SceneLayout {
  const corridorZ = new Map(routesMeta.map((r, i) => [r.id, (i - (routesMeta.length - 1) / 2) * CORRIDOR_Z]));
  const pos = new Map<string, Vec3>();

  const byStage = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.kind !== "paper") continue;
    const key = `${n.route}:${n.stage_idx ?? -1}`;
    const arr = byStage.get(key);
    if (arr) arr.push(n.id);
    else byStage.set(key, [n.id]);
  }

  const layoutNodes: LayoutNode[] = nodes.map((n) => {
    const z = corridorZ.get(n.route ?? "") ?? 0;
    let p: Vec3;
    let radius: number;
    if (n.kind === "hub") {
      p = [ENTRANCE_X, 7.6, z];
      radius = R_HUB;
    } else if (n.kind === "stage") {
      p = [STAGE_W * (n.stage_idx ?? 0), 5.8, z - CORRIDOR_WIDTH * 0.46];
      radius = R_STAGE;
    } else {
      const key = `${n.route}:${n.stage_idx ?? -1}`;
      const index = Math.max(0, (byStage.get(key) ?? []).indexOf(n.id));
      p = paperLattice(z, STAGE_W * (n.stage_idx ?? 0), index);
      radius = n.key ? R_PAPER_KEY : R_PAPER;
    }
    pos.set(n.id, p);
    return { ...n, x: p[0], y: p[1], z: p[2], color: routeColor(n.route ?? ""), radius };
  });

  const layoutEdges: LayoutEdge[] = [];
  for (const l of links) {
    const a = pos.get(l.source);
    const b = pos.get(l.target);
    if (!a || !b) continue;
    let points: Vec3[];
    if (l.kind === "loop") {
      points = [a, [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 13, (a[2] + b[2]) / 2], b];
    } else if (l.kind === "pipeline") {
      points = [a, [(a[0] + b[0]) / 2, 1, a[2]], b];
    } else {
      const rise = Math.max(3.6, Math.abs(a[1] - b[1]) * 0.6 + 2.4);
      points = [
        a,
        [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + rise, (a[2] + b[2]) / 2],
        b,
      ];
    }
    layoutEdges.push({ kind: l.kind, from: l.source, to: l.target, label: l.label, points, color: LINK_COLORS[l.kind] ?? "#64748b" });
  }

  const corridors: Corridor[] = routesMeta.map((r) => {
    const z = corridorZ.get(r.id) ?? 0;
    const stageNodes = nodes.filter((n) => n.kind === "stage" && n.route === r.id);
    return {
      route: r.id,
      name: r.name_zh,
      color: routeColor(r.id),
      z,
      x0: ENTRANCE_X - 4,
      x1: STAGE_W * Math.max(0, stageNodes.length - 1) + STAGE_W / 2,
      stages: stageNodes
        .sort((a, b) => (a.stage_idx ?? 0) - (b.stage_idx ?? 0))
        .map((s) => ({
          idx: s.stage_idx ?? 0,
          name: s.label,
          x: STAGE_W * (s.stage_idx ?? 0),
          anchorId: s.id,
          count: (byStage.get(`${r.id}:${s.stage_idx}`) ?? []).length,
        })),
    };
  });

  const min: Vec3 = [Infinity, 0, Infinity];
  const max: Vec3 = [-Infinity, 0, -Infinity];
  for (const n of layoutNodes) {
    min[0] = Math.min(min[0], n.x - n.radius);
    max[0] = Math.max(max[0], n.x + n.radius);
    min[1] = Math.min(min[1], n.y - n.radius);
    max[1] = Math.max(max[1], n.y + n.radius);
    min[2] = Math.min(min[2], n.z - n.radius);
    max[2] = Math.max(max[2], n.z + n.radius);
  }
  for (const e of layoutEdges) {
    for (const p of e.points) {
      min[0] = Math.min(min[0], p[0]);
      max[0] = Math.max(max[0], p[0]);
      min[1] = Math.min(min[1], p[1]);
      max[1] = Math.max(max[1], p[1]);
      min[2] = Math.min(min[2], p[2]);
      max[2] = Math.max(max[2], p[2]);
    }
  }
  for (const c of corridors) {
    min[0] = Math.min(min[0], c.x0);
    max[0] = Math.max(max[0], c.x1);
    min[2] = Math.min(min[2], c.z - CORRIDOR_WIDTH / 2);
    max[2] = Math.max(max[2], c.z + CORRIDOR_WIDTH / 2);
  }
  if (!Number.isFinite(min[0])) {
    min[0] = min[2] = -1;
    max[0] = max[2] = 1;
    max[1] = 1;
  }

  const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const half: Vec3 = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];
  const radius = Math.max(1, Math.hypot(half[0], half[1], half[2]));

  // 俯角约 35°：既保留透视，又能把沿 Z 排布的走廊在屏幕上拉开；左右对称以免画面偏置
  const raw: Vec3 = [0, 0.72, 1];
  const len = Math.hypot(...raw);
  const viewDir: Vec3 = [raw[0] / len, raw[1] / len, raw[2] / len];

  return { nodes: layoutNodes, edges: layoutEdges, corridors, center, min, max, radius, viewDir };
}
