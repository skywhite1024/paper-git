import frameworkData from "@/content/frameworks.json";
import routeData from "@/content/atlas-routes.json";
import { papers, tracks, type Paper } from "./catalog";
import { createAtlasLayout } from "./atlas-geometry";

export type Framework = (typeof frameworkData)[keyof typeof frameworkData];
export const frameworks: Record<string, Framework> = frameworkData;
export const assetPath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
export const islands = [
  { id: "world-models", name: "世界模型与表征", english: "WORLD MODELS", question: "从感知到想象，让未来可预测", color: "#548473" },
  { id: "vla", name: "视觉 · 语言 · 动作", english: "VISION–LANGUAGE–ACTION", question: "把看懂与听懂，变成机器人动作", color: "#b4844e" },
  { id: "robot-agentic", name: "任务规划与交互", english: "ROBOT AGENTIC", question: "把动作接成任务，让执行形成闭环", color: "#8c79a6" },
] as const;
export const atlasLayout = createAtlasLayout(tracks);
export type AtlasRelation = { from: string; to: string; kind: "reading" | "compare" | "evolution"; label: string; explanation: string; source: string };
export const relations: AtlasRelation[] = routeData.map((edge) => ({
  ...edge, kind: edge.kind as AtlasRelation["kind"],
  explanation: frameworks[edge.to].change,
  source: frameworks[edge.to].figure.source,
}));
export const orderedPapers = tracks.flatMap((track) => track.stages.flatMap((stage) => stage.papers.map((id) => papers.find((paper) => paper.id === id)!)));
export function matchPaper(paper: Paper, query: string) {
  const haystack = `${paper.name} ${paper.title} ${paper.summary} ${paper.why} ${paper.year} ${paper.venue}`.toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}
