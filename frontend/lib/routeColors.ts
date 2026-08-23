export const ROUTE_COLORS: Record<string, string> = {
  usd: "#2563eb",
  demo: "#7c3aed",
  guided: "#d97706",
  taskgen: "#059669",
  datax: "#dc2626",
  compose: "#0d9488",
};

export const ROUTE_NAMES: Record<string, string> = {
  usd: "在线无监督技能发现",
  demo: "从示范与轨迹发现技能",
  guided: "引导式与 Agentic 技能发现",
  taskgen: "自动任务、场景与课程生成",
  datax: "技能数据扩展与部署",
  compose: "组合、运行时、验证与治理",
};

export function routeColor(route: string): string {
  return ROUTE_COLORS[route] ?? "#475569";
}

export const LINK_COLORS: Record<string, string> = {
  evolve: "#0969da",
  enable: "#1a7f37",
  compare: "#bf8700",
  loop: "#9333ea",
};
