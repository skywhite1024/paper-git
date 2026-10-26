export type Point = { x: number; y: number };
export type Camera = Point & { zoom: number };
export type Bounds = Point & { width: number; height: number };
export const MIN_ZOOM = .05;
export const MAX_ZOOM = 2.5;
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 230;

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

type LayoutTrack = { id: string; stages: { id: string; name: string; papers: string[] }[] };
export function createAtlasLayout(tracks: LayoutTrack[]) {
  const origins = [{ x: 120, y: 120 }, { x: 2120, y: 160 }, { x: 2070, y: 1840 }];
  const territories = tracks.map((track, index) => ({
    id: track.id, ...origins[index], width: 1720,
    height: Math.max(...track.stages.map((stage) => stage.papers.length)) * 270 + 400,
  }));
  const stages = tracks.flatMap((track, index) => track.stages.map((stage, column) => ({
    id: stage.id, name: stage.name, track: track.id, count: stage.papers.length,
    x: territories[index].x + 120 + column * 370, y: territories[index].y + 225,
  })));
  const points = tracks.flatMap((track, index) => track.stages.flatMap((stage, column) => stage.papers.map((id, row) => ({
    id, track: track.id, stage: stage.id,
    x: territories[index].x + 120 + column * 370, y: territories[index].y + 290 + row * 270,
  }))));
  const bounds = { x: 0, y: 0, width: Math.max(...territories.map((island) => island.x + island.width)) + 100, height: Math.max(...territories.map((island) => island.y + island.height)) + 100 };
  return { territories, stages, points, bounds };
}

export function islandPath({ x, y, width: w, height: h }: Bounds) {
  return `M${x + w * .15} ${y + 25} C${x + w * .36} ${y - 30} ${x + w * .7} ${y + 40} ${x + w * .85} ${y + 12} Q${x + w + 35} ${y + h * .08} ${x + w - 12} ${y + h * .3} C${x + w + 40} ${y + h * .55} ${x + w - 20} ${y + h * .75} ${x + w - 12} ${y + h * .88} Q${x + w * .92} ${y + h + 40} ${x + w * .68} ${y + h - 8} C${x + w * .42} ${y + h + 35} ${x + w * .18} ${y + h - 10} ${x + w * .12} ${y + h - 25} Q${x - 38} ${y + h * .88} ${x + 8} ${y + h * .66} C${x - 40} ${y + h * .43} ${x + 14} ${y + h * .28} ${x + 3} ${y + h * .16} Q${x + 10} ${y + 45} ${x + w * .15} ${y + 25}Z`;
}
