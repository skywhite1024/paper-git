import data from "@/content/catalog.json";
import routes from "@/content/atlas-routes.json";

export const catalog = data;
export const tracks = catalog.tracks;
export const papers = catalog.papers;
export type Paper = (typeof papers)[number];
export type Track = (typeof tracks)[number];
export type Stage = Track["stages"][number];
export const kindNames: Record<string, string> = { paper: "正式发表", report: "技术报告", preprint: "2026 预印本" };
export function getPaper(id: string) { return papers.find((paper) => paper.id === id); }
export function getTrack(id: string) { return tracks.find((track) => track.id === id); }
export function papersFor(ids: string[]) { return ids.flatMap((id) => { const paper = getPaper(id); return paper ? [paper] : []; }); }
export function nextPapers(paper: Paper) {
  return papersFor(routes.filter((edge) => edge.from === paper.id).map((edge) => edge.to).slice(0, 2));
}
