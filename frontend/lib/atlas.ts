import frameworkData from "@/content/frameworks.json";
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
export type AtlasRelation = { from: string; to: string; kind: "reading" | "compare"; label: string; explanation: string };
export const relations: AtlasRelation[] = [
  { from: "world-models", to: "dreamer", kind: "reading", label: "从建模到策略学习", explanation: "先理解潜空间与动态记忆，再看 Dreamer 如何在想象轨迹上优化行为。这是建议阅读顺序。" },
  { from: "dreamer", to: "vjepa2", kind: "compare", label: "想象策略 / 表征预测", explanation: "对照奖励驱动的想象策略学习，与视频预训练后接动作条件规划的路线，不表示直接继承。" },
  { from: "rt2", to: "openvla", kind: "reading", label: "走向开放 VLA", explanation: "从动作 token 的表示方式，读到开放模型、机器人数据与适配方法。" },
  { from: "openvla", to: "pi0", kind: "compare", label: "离散 token / 连续动作", explanation: "对照离散动作 token 与 flow matching 连续动作块，观察动作表示和生成机制。" },
  { from: "saycan", to: "voxposer", kind: "reading", label: "技能选择 → 空间规划", explanation: "从已有技能的可执行性评分，转向用三维价值图表达任务和运动条件。" },
  { from: "voxposer", to: "rekep", kind: "compare", label: "价值图 / 关键点约束", explanation: "对照稠密空间价值图与关键点关系约束，理解两种连接语义与优化的方法。" },
  { from: "dreamer", to: "pi0", kind: "compare", label: "两种策略学习路径", explanation: "Dreamer 在学习到的动态模型中优化行为；π0 从机器人数据学习连续动作生成。这是方法对照。" },
  { from: "openvla", to: "saycan", kind: "compare", label: "直接动作 / 高层技能", explanation: "OpenVLA 从观测与语言直接预测动作；SayCan 在技能库上进行任务相关性与可执行性选择。" },
];
export const orderedPapers = tracks.flatMap((track) => track.stages.flatMap((stage) => stage.papers.map((id) => papers.find((paper) => paper.id === id)!)));
export function matchPaper(paper: Paper, query: string) {
  const haystack = `${paper.name} ${paper.title} ${paper.summary} ${paper.why} ${paper.year} ${paper.venue}`.toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}
