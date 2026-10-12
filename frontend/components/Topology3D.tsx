"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CAMERA_FOV,
  CORRIDOR_WIDTH,
  STAGE_W,
  computeLayout,
  fitFrame,
  frameBoxFor,
  type Corridor,
  type FrameBox,
  type Vec3,
} from "@/lib/layout3d";
import { L } from "@/lib/lexicon";

export type TopoNode = {
  id: string;
  kind: "hub" | "stage" | "paper";
  label: string;
  name_en?: string;
  route?: string;
  stage?: string;
  stage_idx?: number;
  year?: number;
  key?: boolean;
  note?: string;
  full_title?: string;
  url?: string;
  figure_url?: string;
  stage_description?: string;
  pipeline?: string;
  insight?: string;
  item_count?: number;
};

export type TopoLink = { source: string; target: string; kind: string; label?: string };

export type TopoRouteMeta = { id: string; name_zh: string; stages: string[] };

const TEX_FONT = 40;
const DEG = Math.PI / 180;

/** 标签贴图盒的屏幕高度（CSS 像素）；贴图内字形占 1/1.5。 */
const LABEL_PX = { hub: 25, stage: 22, paper: 20, num: 19 } as const;
type LabelKind = keyof typeof LABEL_PX;

/**
 * 名牌截断上限（字符）。上限按「最长阶段名 / hub 名完整可读」设定，
 * 真正的重叠交给 renderLabels 的屏幕空间避让处理，不再靠砍字数避让。
 */
const LABEL_CAP: Record<LabelKind, number> = { hub: 26, stage: 14, paper: 14, num: 2 };

/** 屏幕避让优先级：选中 > 走廊 > 阶段 > 层号 > 关键方法。数值越小越先占位。 */
const LABEL_PRIO: Record<LabelKind, number> = { hub: 1, stage: 2, num: 3, paper: 4 };

type LabelRec = {
  sp: THREE.Sprite;
  kind: LabelKind;
  aspect: number;
  route?: string;
  nodeId?: string;
  /** 默认锚点：hub 名牌右对齐，向左延伸，避免与同走廊的阶段标签同行相撞。 */
  cx: number;
};

type Palette = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  dark: boolean;
};

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const theme = document.documentElement.getAttribute("data-theme");
  return {
    bg: v("--c-bg", "#f7f8fa"),
    fg: v("--c-fg", "#14181f"),
    muted: v("--c-muted", "#5b6472"),
    accent: v("--c-accent", "#4f46e5"),
    dark: theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches,
  };
}

/** 白字加白色半透明底板，颜色由 SpriteMaterial.color 染色，换主题不必重绘贴图。 */
function makeLabelTexture(text: string): { map: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const probe = canvas.getContext("2d")!;
  const font = `600 ${TEX_FONT}px "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif`;
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width) + Math.round(TEX_FONT * 0.7);
  const height = Math.round(TEX_FONT * 1.5);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, height * 0.3);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, width, height);
  }
  ctx.font = font;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, Math.round(TEX_FONT * 0.35), height / 2);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return { map, aspect: width / height };
}

const routeOf = (nodeId: string) =>
  nodeId.startsWith("hub:") || nodeId.startsWith("stage:") ? nodeId.split(":")[1] : nodeId.split(":")[0];

export default function Topology3D({
  nodes,
  links,
  routesMeta,
  selectedId,
  onSelect,
  activeRoutes,
  focusToken,
  resetToken,
  onUnavailable,
}: {
  nodes: TopoNode[];
  links: TopoLink[];
  routesMeta: TopoRouteMeta[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeRoutes: Set<string>;
  focusToken: { id: string; nonce: number } | null;
  resetToken: number;
  onUnavailable: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; sub: string } | null>(null);
  const [cursorIdx, setCursorIdx] = useState(-1);

  const layout = useMemo(() => computeLayout(nodes, links, routesMeta), [nodes, links, routesMeta]);

  const order = useMemo(() => {
    const rank = new Map(routesMeta.map((r, i) => [r.id, i]));
    const kindRank = { hub: 0, stage: 1, paper: 2 } as const;
    return [...nodes].sort(
      (a, b) =>
        (rank.get(a.route ?? "") ?? 99) - (rank.get(b.route ?? "") ?? 99) ||
        kindRank[a.kind] - kindRank[b.kind] ||
        (a.stage_idx ?? -1) - (b.stage_idx ?? -1) ||
        a.label.localeCompare(b.label)
    );
  }, [nodes, routesMeta]);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const n of nodes) m.set(n.id, new Set());
    for (const l of links) {
      m.get(l.source)?.add(l.target);
      m.get(l.target)?.add(l.source);
    }
    return m;
  }, [nodes, links]);

  const live = useRef({ layout, nodes, adjacency, onSelect, activeRoutes, selectedId, focusToken });
  live.current = { layout, nodes, adjacency, onSelect, activeRoutes, selectedId, focusToken };

  const engineRef = useRef<{
    flyTo: (id: string, immediate?: boolean) => void;
    resetView: () => void;
    setDim: (routes: Set<string>, animate?: boolean) => void;
    setSelected: (id: string | null) => void;
    setCursor: (id: string | null) => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      onUnavailable();
      return;
    }
    if (!renderer.getContext()) {
      onUnavailable();
      return;
    }

    const L0 = live.current.layout;
    let pal = readPalette();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(pal.bg);
    scene.fog = new THREE.Fog(new THREE.Color(pal.bg), 1, 10);

    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.5, 6000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f9aab, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.05);
    sun.position.set(40, 110, 80);
    scene.add(sun);

    const nodeMeshes = new Map<string, THREE.Mesh>();
    const routeGroups = new Map<string, THREE.Group>();
    const crossEdges: { mesh: THREE.Mesh; from: string; to: string }[] = [];
    const edgesOfNode = new Map<string, THREE.Mesh[]>();
    const labels: LabelRec[] = [];
    const fgMaterials: THREE.SpriteMaterial[] = [];

    const addLabel = (
      parent: THREE.Object3D,
      raw: string,
      kind: LabelKind,
      at: [number, number, number],
      tint: THREE.Color,
      rec: Partial<LabelRec> = {}
    ) => {
      const cap = LABEL_CAP[kind];
      const text = raw.length > cap ? `${raw.slice(0, cap - 1)}…` : raw;
      const { map, aspect } = makeLabelTexture(text);
      const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, color: tint });
      const sp = new THREE.Sprite(mat);
      sp.position.set(at[0], at[1], at[2]);
      sp.renderOrder = 3;
      parent.add(sp);
      labels.push({ sp, kind, aspect, cx: kind === "hub" ? 1 : 0.5, ...rec });
      if (kind === "hub" || kind === "stage" || kind === "paper") fgMaterials.push(mat);
    };

    const buildCorridor = (c: Corridor) => {
      const group = new THREE.Group();
      routeGroups.set(c.route, group);
      scene.add(group);
      const color = new THREE.Color(c.color);
      const w = Math.max(1, c.x1 - c.x0);

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(w, CORRIDOR_WIDTH),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set((c.x0 + c.x1) / 2, 0, c.z);
      group.add(floor);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, CORRIDOR_WIDTH)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
      );
      outline.rotation.x = -Math.PI / 2;
      outline.position.set(floor.position.x, 0.08, c.z);
      group.add(outline);

      for (const s of c.stages) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(STAGE_W * 0.82, 0.2, CORRIDOR_WIDTH * 0.84),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 })
        );
        slab.position.set(s.x, 0.12, c.z);
        group.add(slab);
        addLabel(group, String(s.idx + 1), "num", [s.x - STAGE_W * 0.42, 1.9, c.z + CORRIDOR_WIDTH * 0.44], color, {
          route: c.route,
        });
      }

      // 走廊名牌与 hub 标签同位，只保留 hub 标签，避免重复文字
    };
    for (const c of L0.corridors) buildCorridor(c);

    for (const n of L0.nodes) {
      const group = routeGroups.get(n.route ?? "") ?? scene;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(n.color),
        emissive: new THREE.Color(n.color),
        emissiveIntensity: pal.dark ? 0.42 : 0.24,
        roughness: 0.52,
        metalness: 0.04,
        transparent: true,
        opacity: 1,
      });
      mat.userData.base = n.kind === "paper" ? (pal.dark ? 0.36 : 0.2) : pal.dark ? 0.5 : 0.28;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(n.radius, 22, 16), mat);
      mesh.position.set(n.x, n.y, n.z);
      mesh.userData.nodeId = n.id;
      group.add(mesh);
      nodeMeshes.set(n.id, mesh);

      const kind: LabelKind | null = n.kind === "hub" ? "hub" : n.kind === "stage" ? "stage" : n.key ? "paper" : null;
      if (kind) {
        // 阶段标签上下分层，避免同走廊 6 条标签挤在一行
        const stagger = n.kind === "stage" && (n.stage_idx ?? 0) % 2 === 1 ? 13.6 : 0;
        const lift = (n.kind === "hub" ? 9 : n.kind === "stage" ? 6.6 : 4.6) + stagger;
        addLabel(group, n.label, kind, [n.x, n.y + lift, n.z], new THREE.Color(pal.fg), {
          route: n.route,
          nodeId: n.id,
        });
      }
    }

    for (const e of L0.edges) {
      if (e.points.length < 3) continue;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...e.points[0]),
        new THREE.Vector3(...e.points[1]),
        new THREE.Vector3(...e.points[2])
      );
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(e.color),
        transparent: true,
        opacity: e.kind === "pipeline" ? 0.45 : e.kind === "loop" ? 0.7 : 0.85,
      });
      mat.userData.base = mat.opacity;
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, e.kind === "pipeline" ? 0.14 : e.kind === "loop" ? 0.3 : 0.2, 8, false),
        mat
      );
      mesh.userData.edgeKind = e.kind;
      const r1 = routeOf(e.from);
      const r2 = routeOf(e.to);
      if (r1 === r2 && routeGroups.has(r1)) routeGroups.get(r1)!.add(mesh);
      else {
        scene.add(mesh);
        crossEdges.push({ mesh, from: e.from, to: e.to });
      }
      for (const id of [e.from, e.to]) {
        const arr = edgesOfNode.get(id);
        if (arr) arr.push(mesh);
        else edgesOfNode.set(id, [mesh]);
      }
    }

    const makeHalo = (tint: string) => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(1.16, 1.36, 48),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(tint),
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
          depthTest: false,
        })
      );
      m.renderOrder = 6;
      m.visible = false;
      scene.add(m);
      return m;
    };
    const selHalo = makeHalo(pal.accent);
    const curHalo = makeHalo(pal.muted);

    let userMoved = false;
    let lastSize = { w: 0, h: 0 };
    let hovered: string | null = null;
    // 取景盒：默认全场景，筛选出部分走廊后收缩到可见走廊的包围盒（见 setDim）
    let box: FrameBox = L0;
    let fit = L0.radius;
    let home: Vec3 = [...L0.center];
    const applyFrame = (aspect: number) => {
      const f = fitFrame(box, aspect);
      fit = f.dist;
      home = f.target;
    };
    applyFrame(1);
    controls.addEventListener("start", () => {
      userMoved = true;
    });

    const measure = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      return w > 0 && h > 0 ? { w, h } : null;
    };

    const applyScale = (w: number, h: number) => {
      lastSize = { w, h };
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      applyFrame(camera.aspect);
      const fog = scene.fog as THREE.Fog;
      fog.near = fit * 1.15;
      fog.far = fit * 3.2;
      controls.minDistance = L0.radius * 0.06;
      controls.maxDistance = fit * 3.6;
    };

    const homePos = (): [number, number, number] => [
      home[0] + L0.viewDir[0] * fit,
      home[1] + L0.viewDir[1] * fit,
      home[2] + L0.viewDir[2] * fit,
    ];

    const fly = { active: false, camGoal: new THREE.Vector3(), targetGoal: new THREE.Vector3() };

    function frameHome(animated: boolean) {
      const size = measure();
      if (!size) return;
      applyScale(size.w, size.h);
      const goal = homePos();
      if (animated) {
        fly.targetGoal.set(...home);
        fly.camGoal.set(...goal);
        fly.active = true;
      } else {
        camera.position.set(...goal);
        controls.target.set(...home);
        fly.active = false;
        controls.update();
      }
    }

    function flyToNode(id: string, immediate = false) {
      const n = L0.nodes.find((m) => m.id === id);
      if (!n) return false;
      const dir = new THREE.Vector3().copy(camera.position).sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(...L0.viewDir);
      dir.normalize();
      const dist = Math.min(fit, Math.max(n.radius * 16, box.radius * 0.5));
      fly.targetGoal.set(n.x, n.y, n.z);
      fly.camGoal.set(n.x + dir.x * dist, n.y + dir.y * dist, n.z + dir.z * dist);
      if (immediate) {
        camera.position.copy(fly.camGoal);
        controls.target.copy(fly.targetGoal);
        fly.active = false;
        controls.update();
      } else fly.active = true;
      return true;
    }

    /** 走廊显隐变化后重算取景：可见节点铺满画布，名牌间距随之拉开。 */
    function refitToActive(active: Set<string>, animate = true) {
      const next = frameBoxFor(L0, active);
      const changed = next !== box;
      box = next;
      const sel = live.current.selectedId;
      const selNode = sel ? L0.nodes.find((m) => m.id === sel) : null;
      const keepNode = selNode && active.has(selNode.route ?? "") ? selNode.id : null;
      if (keepNode) flyToNode(keepNode, !animate);
      else frameHome(changed && animate);
      if (changed) userMoved = false;
    }

    function applySelected(id: string | null) {
      const near = id ? live.current.adjacency.get(id) : undefined;
      for (const [nid, mesh] of nodeMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const base = mat.userData.base as number;
        if (nid === id) mat.emissiveIntensity = 1;
        else if (nid === hovered) mat.emissiveIntensity = base + 0.3;
        else if (near?.has(nid)) mat.emissiveIntensity = base + 0.22;
        else mat.emissiveIntensity = base;
        mesh.scale.setScalar(nid === id ? 1.4 : nid === hovered ? 1.16 : 1);
        mat.opacity = id && nid !== id && !near?.has(nid) ? 0.45 : 1;
      }
      const node = id ? L0.nodes.find((m) => m.id === id) : null;
      if (node) {
        selHalo.position.set(node.x, node.y, node.z);
        selHalo.scale.setScalar(node.radius * 1.35);
        selHalo.visible = true;
      } else selHalo.visible = false;

      const hot = id ? new Set(edgesOfNode.get(id)) : undefined;
      for (const arr of edgesOfNode.values()) {
        for (const mesh of arr) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = !id ? (mat.userData.base as number) : hot?.has(mesh) ? 0.95 : 0.16;
        }
      }
    }

    function applyPalette() {
      pal = readPalette();
      (scene.background as THREE.Color).set(pal.bg);
      (scene.fog as THREE.Fog).color.set(pal.bg);
      const fg = new THREE.Color(pal.fg);
      for (const mat of fgMaterials) mat.color.copy(fg);
      (selHalo.material as THREE.MeshBasicMaterial).color.set(pal.accent);
      (curHalo.material as THREE.MeshBasicMaterial).color.set(pal.muted);
      for (const mesh of nodeMeshes.values()) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const n = L0.nodes.find((m) => m.id === mesh.userData.nodeId);
        mat.userData.base = n?.kind === "paper" ? (pal.dark ? 0.36 : 0.2) : pal.dark ? 0.5 : 0.28;
      }
      applySelected(live.current.selectedId);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const pick = (event: PointerEvent): TopoNode | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = [...nodeMeshes.values()].filter((m) => m.parent?.visible !== false && m.visible);
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) return null;
      const id = hits[0].object.userData.nodeId as string;
      return live.current.nodes.find((n) => n.id === id) ?? null;
    };

    const kindLabel = (kind: TopoNode["kind"]) =>
      kind === "hub" ? L.hud.hub : kind === "stage" ? L.hud.stage : L.hud.paper;

    const onPointerMove = (event: PointerEvent) => {
      const hit = pick(event);
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      if (!hit) {
        if (hovered) {
          hovered = null;
          applySelected(live.current.selectedId);
        }
        setTooltip(null);
        return;
      }
      if (hovered !== hit.id) {
        hovered = hit.id;
        applySelected(live.current.selectedId);
      }
      const rect = renderer.domElement.getBoundingClientRect();
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        label: hit.label,
        sub: `${kindLabel(hit.kind)}${hit.year ? ` · ${hit.year}` : ""}`,
      });
    };

    let downAt = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
      const hit = pick(e);
      live.current.onSelect(hit ? hit.id : null);
    };
    const onDblClick = () => {
      userMoved = false;
      frameHome(true);
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("dblclick", onDblClick);

    engineRef.current = {
      flyTo(id, immediate = false) {
        if (flyToNode(id, immediate)) userMoved = true;
      },
      resetView() {
        userMoved = false;
        frameHome(true);
      },
      setDim(active: Set<string>, animate = true) {
        for (const [route, group] of routeGroups) group.visible = active.has(route);
        for (const ce of crossEdges) ce.mesh.visible = active.has(routeOf(ce.from)) && active.has(routeOf(ce.to));
        refitToActive(active, animate);
      },
      setSelected(id) {
        applySelected(id);
      },
      setCursor(id) {
        const n = id ? L0.nodes.find((m) => m.id === id) : null;
        if (!n) {
          curHalo.visible = false;
          return;
        }
        curHalo.position.set(n.x, n.y, n.z);
        curHalo.scale.setScalar(n.radius * 1.7);
        curHalo.visible = true;
      },
    };

    const tmpWorld = new THREE.Vector3();
    const tmpView = new THREE.Vector3();

    type LabelSlot = { rec: LabelRec; rank: number; depth: number; l: number; r: number; b: number; t: number };
    const slots: LabelSlot[] = [];
    const kept: LabelSlot[] = [];

    /**
     * 名牌绘制：恒定像素尺寸 + 屏幕空间避让。
     * 先按层级与距离排序（选中 > 走廊 > 阶段 > 层号 > 关键方法，近者优先），
     * 再贪心丢弃与已放置名牌相交的候选——重叠改为「隐藏」而不是「叠字」，
     * 完整名单始终可以在右侧详情面板与列表视图里读到。
     */
    const renderLabels = (w: number, h: number) => {
      const tanV = Math.tan((camera.fov * DEG) / 2);
      const tanH = tanV * camera.aspect;
      const zoom = camera.position.distanceTo(controls.target);
      const narrow = w < 760;
      const solo = live.current.activeRoutes.size === 1;
      const sel = live.current.selectedId;
      // 逐级揭示：默认只看到走廊名，推进后依次出现阶段名与关键方法名
      const stageTier = solo || zoom < fit * 0.85;
      const paperTier = zoom < fit * 0.55;
      slots.length = 0;
      kept.length = 0;
      for (const rec of labels) {
        // 隐藏走廊的名牌不参与避让：它们不可见，却会投影到可见走廊上方抢走位置
        if (rec.route && !live.current.activeRoutes.has(rec.route)) {
          rec.sp.visible = false;
          continue;
        }
        const pinned = sel !== null && rec.nodeId === sel;
        const show =
          pinned ||
          rec.kind === "hub"
            ? true
            : rec.kind === "num"
              ? stageTier && !narrow
              : rec.kind === "stage"
                ? stageTier
                : paperTier;
        if (!show) {
          rec.sp.visible = false;
          continue;
        }
        rec.sp.getWorldPosition(tmpWorld);
        tmpView.copy(tmpWorld).applyMatrix4(camera.matrixWorldInverse);
        if (tmpView.z > -0.5) {
          rec.sp.visible = false;
          continue;
        }
        // 用视深（而非欧氏距离）换算恒定像素尺寸：否则偏心名牌的实际绘制会比避让矩形大 20% 左右
        const d = Math.max(0.001, -tmpView.z);
        const wpp = (2 * tanV * d) / h;
        const px = LABEL_PX[rec.kind] * (narrow ? 0.82 : 1);
        rec.sp.scale.set(px * rec.aspect * wpp, px * wpp, 1);
        // 标签恒定像素尺寸后，再把锚点收进画布内，避免长标签在边缘被裁切
        tmpWorld.project(camera);
        const hw = rec.sp.scale.x / (2 * tanH * d);
        const hh = rec.sp.scale.y / (2 * tanV * d);
        const room = 0.97;
        const W = 2 * hw;
        const H = 2 * hh;
        const cx = Math.min(Math.max(rec.cx, 1 - (room - tmpWorld.x) / W), (room + tmpWorld.x) / W);
        const cy = Math.min(Math.max(0.5, 1 - (room - tmpWorld.y) / H), (room + tmpWorld.y) / H);
        const ax = Math.min(1, Math.max(0, cx));
        const ay = Math.min(1, Math.max(0, cy));
        rec.sp.center.set(ax, ay);
        slots.push({
          rec,
          rank: (pinned ? 0 : 100) + LABEL_PRIO[rec.kind],
          depth: -tmpView.z,
          l: ((tmpWorld.x - W * ax + 1) / 2) * w,
          r: ((tmpWorld.x + W * (1 - ax) + 1) / 2) * w,
          b: ((1 - (tmpWorld.y - H * ay)) / 2) * h,
          t: ((1 - (tmpWorld.y + H * (1 - ay))) / 2) * h,
        });
      }
      slots.sort((a, b) => a.rank - b.rank || a.depth - b.depth);
      const PAD = 2;
      for (const s of slots) {
        let clash = false;
        for (const k of kept) {
          if (s.l < k.r + PAD && s.r > k.l - PAD && s.t < k.b + PAD && s.b > k.t - PAD) {
            clash = true;
            break;
          }
        }
        if (clash) {
          s.rec.sp.visible = false;
          continue;
        }
        kept.push(s);
        s.rec.sp.visible = true;
      }
    };

    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const size = measure();
      if (!size) return;
      if (fly.active) {
        camera.position.lerp(fly.camGoal, 0.08);
        controls.target.lerp(fly.targetGoal, 0.09);
        if (camera.position.distanceTo(fly.camGoal) < L0.radius * 0.005) fly.active = false;
      }
      controls.update();
      const t = (performance.now() - startedAt) / 1000;
      for (const [id, mesh] of nodeMeshes) if (id.startsWith("hub:")) mesh.rotation.y = t * 0.3;
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      if (selHalo.visible) selHalo.quaternion.copy(camera.quaternion);
      if (curHalo.visible) curHalo.quaternion.copy(camera.quaternion);
      renderLabels(size.w, size.h);
      renderer.render(scene, camera);
    };

    frameHome(false);
    engineRef.current.setDim(live.current.activeRoutes, false);
    applySelected(live.current.selectedId);
    const deepLink = live.current.focusToken?.id ?? live.current.selectedId;
    if (deepLink) engineRef.current.flyTo(deepLink, true);
    tick();

    const ro = new ResizeObserver(() => {
      const size = measure();
      if (!size || (size.w === lastSize.w && size.h === lastSize.h)) return;
      lastSize = size;
      applyScale(size.w, size.h);
      if (!userMoved) {
        camera.position.set(...homePos());
        controls.target.set(...home);
        fly.active = false;
      }
      controls.update();
    });
    ro.observe(container);

    const mo = new MutationObserver(applyPalette);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDblClick);
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setDim(activeRoutes);
  }, [activeRoutes]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (focusToken) engineRef.current?.flyTo(focusToken.id);
  }, [focusToken]);

  useEffect(() => {
    if (resetToken > 0) engineRef.current?.resetView();
  }, [resetToken]);

  const scoped = useMemo(() => {
    const inView = order.filter((n) => activeRoutes.has(n.route ?? ""));
    return inView.length ? inView : order;
  }, [order, activeRoutes]);

  useEffect(() => {
    const node = cursorIdx >= 0 ? scoped[cursorIdx] : null;
    engineRef.current?.setCursor(node?.id ?? null);
  }, [cursorIdx, scoped]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") return;
    const count = scoped.length;
    if (!count) return;
    const go = (delta: number) => {
      e.preventDefault();
      setCursorIdx((prev) => (prev < 0 ? (delta > 0 ? 0 : count - 1) : (prev + delta + count) % count));
    };
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowDown") go(5);
    else if (e.key === "ArrowUp") go(-5);
    else if (e.key === "Home") go(-count);
    else if (e.key === "End") go(count);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const node = scoped[cursorIdx];
      if (node) {
        onSelect(node.id);
        engineRef.current?.flyTo(node.id);
      }
    } else if (e.key === "Escape") {
      setCursorIdx(-1);
      onSelect(null);
    }
  };

  const cursorNode = cursorIdx >= 0 ? scoped[cursorIdx] : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="img"
      aria-label={L.topology.sceneAria(routesMeta.length, nodes.length)}
      onKeyDown={onKeyDown}
      className="relative h-full w-full"
    >
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 max-w-[260px] rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 shadow-pop"
          style={{ left: tooltip.x + 14, top: tooltip.y + 12 }}
        >
          <div className="text-xs font-semibold leading-snug text-fg">{tooltip.label}</div>
          <div className="mt-0.5 text-[11px] text-subtle">{tooltip.sub}</div>
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {cursorNode ? `${L.topology.cursorPrefix}${cursorNode.label}` : ""}
      </div>
      {cursorNode && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 max-w-[calc(100%-24px)] -translate-x-1/2 truncate rounded-full border border-line bg-surface/95 px-3 py-1 text-[11px] text-muted shadow-pop">
          {L.topology.cursorPrefix}
          <span className="font-semibold text-fg">{cursorNode.label}</span> · {L.topology.cursorPick}
        </div>
      )}
    </div>
  );
}
