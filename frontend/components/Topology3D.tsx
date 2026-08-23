"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { computeLayout, STAGE_W, type Corridor } from "@/lib/layout3d";

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

const BG = 0x0a0f1c;

function makeTextSprite(text: string, opts: { size?: number; color?: string; bg?: string } = {}) {
  const size = opts.size ?? 42;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `${size}px "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width) + 28;
  canvas.height = Math.ceil(size * 1.5);
  const c2 = canvas.getContext("2d")!;
  c2.font = font;
  if (opts.bg) {
    c2.fillStyle = opts.bg;
    if (typeof c2.roundRect === "function") {
      c2.beginPath();
      c2.roundRect(0, 0, canvas.width, canvas.height, 10);
      c2.fill();
    } else {
      c2.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  c2.fillStyle = opts.color ?? "#e2e8f0";
  c2.textBaseline = "middle";
  c2.fillText(text, 14, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const scale = 0.135;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}

export default function Topology3D({
  nodes,
  links,
  routesMeta,
  selectedId,
  onSelect,
  activeRoutes,
  focusToken,
  resetToken,
}: {
  nodes: TopoNode[];
  links: TopoLink[];
  routesMeta: TopoRouteMeta[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeRoutes: Set<string>;
  focusToken: { id: string; nonce: number } | null;
  resetToken: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; sub: string } | null>(null);

  const layout = useMemo(() => computeLayout(nodes, links, routesMeta), [nodes, links, routesMeta]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const engineRef = useRef<{
    nodeMeshes: Map<string, THREE.Mesh>;
    routeGroups: Map<string, THREE.Group>;
    loopEdges: { mesh: THREE.Mesh; from: string; to: string }[];
    flyTo: (id: string) => void;
    resetView: () => void;
    setDim: (routes: Set<string>) => void;
    setSelected: (id: string | null) => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 190, 640);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.1, 2000);
    const L = layoutRef.current;
    camera.position.set(...L.initialCamera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 620;
    controls.minDistance = 18;
    controls.target.set(...L.center);

    scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x0b1220, 1.05));
    const dir = new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(80, 150, 60);
    scene.add(dir);

    const nodeMeshes = new Map<string, THREE.Mesh>();
    const routeGroups = new Map<string, THREE.Group>();
    const loopEdges: { mesh: THREE.Mesh; from: string; to: string }[] = [];

    const buildStatic = () => {
      const world = new THREE.Group();
      const current = layoutRef.current;

      for (const c of current.corridors) {
        buildCorridor(world, c);
      }

      // 节点
      for (const n of current.nodes) {
        const geo = new THREE.SphereGeometry(n.radius, 20, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(n.color),
          emissive: new THREE.Color(n.color),
          emissiveIntensity: n.kind === "paper" ? 0.42 : 0.62,
          roughness: 0.45,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(n.x, n.y, n.z);
        mesh.userData.nodeId = n.id;
        (mesh.userData as { baseScale: number }).baseScale = 1;
        world.add(mesh);
        nodeMeshes.set(n.id, mesh);
        routeGroups.get(n.route ?? "")?.add(mesh);

        const needLabel = n.kind === "hub" || n.kind === "stage" || n.key;
        if (needLabel) {
          const sprite = makeTextSprite(n.label, {
            size: n.kind === "hub" ? 46 : n.kind === "stage" ? 36 : 30,
            color: n.kind === "hub" ? "#f8fafc" : n.kind === "stage" ? "#cbd5e1" : n.color,
          });
          sprite.position.set(n.x, n.y + (n.kind === "hub" ? 9.5 : n.kind === "stage" ? 7 : 3.4), n.z);
          if (n.kind === "paper" && !n.key) continue;
          world.add(sprite);
          routeGroups.get(n.route ?? "")?.add(sprite);
        }
      }

      // 连边
      for (const e of current.edges) {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(...e.points[0]),
          new THREE.Vector3(...e.points[1]),
          new THREE.Vector3(...e.points[2]),
        );
        const radius = e.kind === "pipeline" ? 0.16 : e.kind === "loop" ? 0.34 : 0.24;
        const geo = new THREE.TubeGeometry(curve, 28, radius, 8, false);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(e.color),
          transparent: true,
          opacity: e.kind === "pipeline" ? 0.4 : e.kind === "loop" ? 0.62 : 0.8,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.edge = e;
        world.add(mesh);
        const fromRoute = e.from.split(":")[0] === "hub" || e.from.startsWith("stage:") ? e.from.split(":")[1] : e.from.split(":")[0];
        const toRoute = e.to.split(":")[0] === "hub" || e.to.startsWith("stage:") ? e.to.split(":")[1] : e.to.split(":")[0];
        if (e.kind === "loop" || fromRoute !== toRoute) {
          loopEdges.push({ mesh, from: e.from, to: e.to });
        } else {
          routeGroups.get(fromRoute)?.add(mesh);
        }
      }

      scene.add(world);
    };

    const buildCorridor = (world: THREE.Group, c: Corridor) => {
      const group = new THREE.Group();
      routeGroups.set(c.route, group);

      // 走廊地面
      const w = c.x1 - c.x0;
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(w, CORRIDOR_WIDTH),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(c.color), transparent: true, opacity: 0.05 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set((c.x0 + c.x1) / 2, 0.05, c.z);
      group.add(floor);

      // 地面边线
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, CORRIDOR_WIDTH)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(c.color), transparent: true, opacity: 0.4 }),
      );
      edge.rotation.x = -Math.PI / 2;
      edge.position.copy(floor.position);
      edge.position.y = 0.1;
      group.add(edge);

      // 阶段地层（薄板）与编号
      for (const s of c.stages) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(STAGE_W * 0.8, 0.24, CORRIDOR_WIDTH * 0.8),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(c.color), transparent: true, opacity: 0.1 }),
        );
        slab.position.set(s.x, 0.14, c.z);
        group.add(slab);
        const num = makeTextSprite(`${s.idx + 1}`, { size: 30, color: c.color });
        num.position.set(s.x - STAGE_W * 0.42, 2.2, c.z - CORRIDOR_WIDTH * 0.48);
        num.scale.multiplyScalar(0.7);
        group.add(num);
      }

      // 路线名牌（入口）
      const board = makeTextSprite(c.name, { size: 44, color: "#f8fafc", bg: hexA(c.color, 0.32) });
      board.position.set(c.x0 - 2, 15.5, c.z);
      group.add(board);

      world.add(group);
    };

    buildStatic();

    // ---- 交互 ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredId: string | null = null;

    const pick = (event: PointerEvent): TopoNode | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = [...nodeMeshes.values()].filter((m) => m.visible && m.parent?.visible !== false);
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) return null;
      const id = hits[0].object.userData.nodeId as string;
      return nodesRef.current.find((n) => n.id === id) ?? null;
    };

    const nodesRef: { current: TopoNode[] } = { current: nodes };

    const onPointerMove = (event: PointerEvent) => {
      const hit = pick(event);
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      if (hit) {
        hoveredId = hit.id;
        const rect = renderer.domElement.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          label: hit.label,
          sub: hit.kind === "paper" ? `${hit.stage ?? ""}${hit.year ? ` · ${hit.year}` : ""}` : hit.kind === "stage" ? "阶段地层" : "路线走廊",
        });
      } else {
        hoveredId = null;
        setTooltip(null);
      }
    };

    let downPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
      const hit = pick(e);
      selectRef.current(hit ? hit.id : null);
    };
    const onDblClick = () => engine.resetView();

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("dblclick", onDblClick);

    // ---- 相机飞行 ----
    const fly = { active: false, camGoal: new THREE.Vector3(), targetGoal: new THREE.Vector3() };
    const engine = {
      nodeMeshes,
      routeGroups,
      loopEdges,
      flyTo(id: string) {
        const n = layoutRef.current.nodes.find((m) => m.id === id);
        if (!n) return;
        fly.targetGoal.set(n.x, n.y, n.z);
        fly.camGoal.set(n.x - 26, n.y + 22, n.z + 46);
        fly.active = true;
      },
      resetView() {
        const L2 = layoutRef.current;
        fly.targetGoal.set(...L2.center);
        fly.camGoal.set(...L2.initialCamera);
        fly.active = true;
      },
      setDim(active: Set<string>) {
        for (const [route, group] of routeGroups) {
          group.visible = active.has(route);
        }
        for (const le of loopEdges) {
          const r1 = le.from.startsWith("hub:") || le.from.startsWith("stage:") ? le.from.split(":")[1] : le.from.split(":")[0];
          const r2 = le.to.startsWith("hub:") || le.to.startsWith("stage:") ? le.to.split(":")[1] : le.to.split(":")[0];
          le.mesh.visible = active.has(r1) && active.has(r2);
        }
      },
      setSelected(id: string | null) {
        for (const [nid, mesh] of nodeMeshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const isSel = nid === id;
          const isNeighbor = false;
          mat.emissiveIntensity = isSel ? 1.15 : nid === hoveredId ? 0.8 : mat.userData.baseIntensity ?? 0.42;
          const s = isSel ? 1.5 : 1;
          mesh.scale.setScalar(s);
          void isNeighbor;
        }
      },
    };
    engineRef.current = engine;
    for (const mesh of nodeMeshes.values()) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const n = layoutRef.current.nodes.find((m) => m.id === mesh.userData.nodeId);
      mat.userData.baseIntensity = n && n.kind !== "paper" ? 0.62 : 0.42;
    }

    // ---- 渲染循环 ----
    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const t = clock.getElapsedTime();
      if (fly.active) {
        camera.position.lerp(fly.camGoal, 0.06);
        controls.target.lerp(fly.targetGoal, 0.08);
        if (camera.position.distanceTo(fly.camGoal) < 0.6) fly.active = false;
      }
      // 关键节点轻微呼吸
      for (const [nid, mesh] of nodeMeshes) {
        const n = layoutRef.current.nodes.find((m) => m.id === nid);
        if (n?.key) {
          mesh.rotation.y = t * 0.4;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDblClick);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      container.removeChild(renderer.domElement);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setDim(activeRoutes);
  }, [activeRoutes, layout]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedId);
  }, [selectedId, layout]);

  useEffect(() => {
    if (focusToken) engineRef.current?.flyTo(focusToken.id);
  }, [focusToken]);

  useEffect(() => {
    if (resetToken > 0) engineRef.current?.resetView();
  }, [resetToken]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-xs text-slate-100 shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y + 10 }}
        >
          <div className="font-semibold">{tooltip.label}</div>
          {tooltip.sub && <div className="text-[10px] text-slate-400">{tooltip.sub}</div>}
        </div>
      )}
    </div>
  );
}

const CORRIDOR_WIDTH = 46;

function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** WebGL 初始化失败时给出可读提示，而非空白页面。 */
export class Topology3DBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-slate-200">三维场景初始化失败</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              当前环境可能不支持 WebGL。请使用支持硬件加速的现代浏览器访问；路线分析视图（技术路线页）不受影响。
            </p>
            <p className="mt-2 text-[10px] text-slate-600">{String(this.state.error?.message ?? "")}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
