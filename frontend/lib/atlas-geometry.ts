export type Point = { x: number; y: number };
export type Camera = Point & { zoom: number };
export type Bounds = Point & { width: number; height: number };
export const MIN_ZOOM = .02;
export const MAX_ZOOM = 2.5;
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 260;

// Keep the world point underneath the cursor fixed during zooming.
export function zoomAt(camera: Camera, zoom: number, anchor: Point): Camera {
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const ratio = next / camera.zoom;
  return { x: anchor.x - (anchor.x - camera.x) * ratio, y: anchor.y - (anchor.y - camera.y) * ratio, zoom: next };
}

export function fitBounds(bounds: Bounds, viewport: { width: number; height: number }, padding = 60): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(1, (viewport.width - padding * 2) / bounds.width, (viewport.height - padding * 2) / bounds.height));
  return { zoom, x: (viewport.width - bounds.width * zoom) / 2 - bounds.x * zoom, y: (viewport.height - bounds.height * zoom) / 2 - bounds.y * zoom };
}

type LayoutTrack = { id: string; stages: { id: string; name: string; question?: string; papers: string[] }[] };
function ringRadii(index: number) { return { rx: 800 + index * 550, ry: 600 + index * 410 }; }
function ringCount(count: number) {
  let rings = 0, capacity = 0;
  while (capacity < count) { capacity += rings + 2; rings++; }
  return Math.max(1, rings);
}

export function viewportBounds(camera: Camera, viewport: { width: number; height: number }, overscan = 240): Bounds {
  return { x: (-camera.x - overscan) / camera.zoom, y: (-camera.y - overscan) / camera.zoom, width: (viewport.width + overscan * 2) / camera.zoom, height: (viewport.height + overscan * 2) / camera.zoom };
}
export function intersects(a: Bounds, b: Bounds) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

export function orbitPoint(center: Point, rx: number, ry: number, angle: number): Point {
  // Node and browser trig implementations can differ in the last decimal places.
  return { x: Math.round((center.x + rx * Math.cos(angle)) * 1000) / 1000, y: Math.round((center.y + ry * Math.sin(angle)) * 1000) / 1000 };
}

export function createAtlasLayout(tracks: LayoutTrack[]) {
  const dimensions = tracks.map((track) => {
    const count = Math.max(...track.stages.map((stage) => stage.papers.length));
    const rings = ringCount(count);
    const outer = ringRadii(rings - 1);
    const width = outer.rx * 2 + 600, height = outer.ry * 2 + 540;
    return { id: track.id, width, height, rings };
  });
  const origins = [{ x: 120, y: 160 }, { x: dimensions[0].width + 380, y: 120 }, { x: dimensions[0].width + 380, y: dimensions[1].height + 400 }];
  const territories = dimensions.map((area, index) => ({ ...area, ...origins[index], center: { x: origins[index].x + area.width / 2, y: origins[index].y + area.height / 2 } }));
  const stages = tracks.flatMap((track, index) => track.stages.map((stage, sector) => {
    const angle = (-135 + sector * 90) * Math.PI / 180;
    const center = territories[index].center;
    return { id: stage.id, name: stage.name, question: stage.question, track: track.id, count: stage.papers.length, sector,
      ...orbitPoint(center, 440, 325, angle), center,
    };
  }));
  const points = tracks.flatMap((track, index) => track.stages.flatMap((stage, sector) => {
    let offset = 0;
    return Array.from({ length: territories[index].rings }, (_, ring) => ring).flatMap((ring) => {
      const { rx, ry } = ringRadii(ring);
      const ids = stage.papers.slice(offset, offset + ring + 2);
      const start = offset; offset += ids.length;
      return ids.map((id, step) => {
        // Alternate arc direction to continue outward without crossing another branch.
        const position = ring % 2 ? ids.length - 1 - step : step;
        const angle = (-180 + sector * 90 + (ids.length === 1 ? 45 : 15 + position * 60 / (ids.length - 1))) * Math.PI / 180;
        const point = orbitPoint(territories[index].center, rx, ry, angle);
        return { id, track: track.id, stage: stage.id, ring, sector, angle, order: start + step + 1,
          x: point.x - CARD_WIDTH / 2, y: point.y - CARD_HEIGHT / 2 };
      });
    });
  }));
  const rings = territories.flatMap((area) => Array.from({ length: area.rings }, (_, index) => ({ ...ringRadii(index), ...area.center, track: area.id, index })));
  const bounds = { x: 0, y: 0, width: Math.max(...territories.map((island) => island.x + island.width)) + 100, height: Math.max(...territories.map((island) => island.y + island.height)) + 100 };
  return { territories, stages, points, rings, bounds };
}

type RoutePoint = Point & { ring: number; angle: number; stage: string; track: string };
export function routeGeometry(from: RoutePoint, to: RoutePoint, center: Point) {
  const a = { x: from.x + CARD_WIDTH / 2, y: from.y + CARD_HEIGHT / 2 };
  const b = { x: to.x + CARD_WIDTH / 2, y: to.y + CARD_HEIGHT / 2 };
  if (from.track === to.track && from.stage === to.stage && from.ring === to.ring) {
    const { rx, ry } = ringRadii(from.ring);
    const boundary = (start: number, end: number, card: Point) => {
      let low = 0, high = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2, p = orbitPoint(center, rx, ry, start + (end - start) * mid);
        if (Math.abs(p.x - card.x) < CARD_WIDTH / 2 + 10 && Math.abs(p.y - card.y) < CARD_HEIGHT / 2 + 10) low = mid; else high = mid;
      }
      return orbitPoint(center, rx, ry, start + (end - start) * high);
    };
    const start = boundary(from.angle, to.angle, a), end = boundary(to.angle, from.angle, b);
    return { d: `M${start.x} ${start.y} A${rx} ${ry} 0 0 ${to.angle > from.angle ? 1 : 0} ${end.x} ${end.y}`, label: orbitPoint(center, rx, ry, (from.angle + to.angle) / 2) };
  }
  const dx = b.x - a.x, dy = b.y - a.y;
  const inset = Math.min((CARD_WIDTH / 2 + 12) / Math.max(Math.abs(dx), .001), (CARD_HEIGHT / 2 + 12) / Math.max(Math.abs(dy), .001));
  const start = { x: a.x + dx * inset, y: a.y + dy * inset };
  const end = { x: b.x - dx * inset, y: b.y - dy * inset };
  const bend = from.track === to.track && from.stage === to.stage ? .08 : .14;
  return { d: `M${start.x} ${start.y} C${start.x + dx * .3 - dy * bend} ${start.y + dy * .3 + dx * bend} ${end.x - dx * .3 - dy * bend} ${end.y - dy * .3 + dx * bend} ${end.x} ${end.y}`, label: { x: (a.x + b.x) / 2 - dy * bend * .75, y: (a.y + b.y) / 2 + dx * bend * .75 } };
}

export function islandPath({ x, y, width: w, height: h }: Bounds) {
  return `M${x + w * .5} ${y} C${x + w * .75} ${y - 25} ${x + w * .98} ${y + h * .18} ${x + w} ${y + h * .43} C${x + w * 1.04} ${y + h * .72} ${x + w * .75} ${y + h * 1.04} ${x + w * .48} ${y + h} C${x + w * .21} ${y + h * 1.06} ${x - w * .03} ${y + h * .75} ${x} ${y + h * .47} C${x - w * .02} ${y + h * .2} ${x + w * .25} ${y + 15} ${x + w * .5} ${y}Z`;
}
