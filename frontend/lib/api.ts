export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiGet<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type NodeDTO = {
  id: string;
  parent_id: string | null;
  name_en: string;
  name_zh: string;
  description: string;
  keywords: string[];
  arxiv_cats: string[];
  level: number;
  is_fallback?: boolean;
  paper_count?: number;
  children?: NodeDTO[];
};

export type PaperDTO = {
  id: number;
  title: string;
  authors: string[];
  year: number;
  venue: string | null;
  citation_count: number;
  arxiv_id: string | null;
  abs_url: string | null;
  pdf_url: string | null;
  code_url: string | null;
  is_demo: boolean;
  source: string;
  published: string | null;
  is_milestone: boolean;
  nodes: { id: string; name_zh: string; name_en: string }[];
  abstract?: string;
  related?: PaperDTO[];
};

export type NodeDetailDTO = NodeDTO & {
  ancestors: NodeDTO[];
  children: NodeDTO[];
  stats: { paper_count: number; year_min: number | null; year_max: number | null; milestone_count: number };
  milestones: PaperDTO[];
};

export type PapersResponse = {
  total: number;
  page: number;
  per_page: number;
  years: { year: number; count: number }[];
  items: PaperDTO[];
};

export type TimelineResponse = { years: { year: number; count: number; papers: PaperDTO[] }[] };

export type TreeResponse = { roots: NodeDTO[] };

export type StatsDTO = {
  paper_total: number;
  paper_real: number;
  paper_demo: number;
  node_total: number;
  recent_7d: number;
  domains: NodeDTO[];
  hot_nodes: NodeDTO[];
};
