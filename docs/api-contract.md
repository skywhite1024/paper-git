# PaperGit API 契约（v0.1）

Base URL：`http://localhost:8000`（可经 `NEXT_PUBLIC_API_URL`/`API_URL` 覆盖）。FastAPI 自动文档：`/docs`（OpenAPI）。

## 节点 / 领域树

| Method | Path | 说明 | 关键参数 |
|---|---|---|---|
| GET | `/api/nodes` | 整棵领域树（嵌套 children，含子树聚合计数 paper_count） | — |
| GET | `/api/nodes/{id}` | 节点详情：简介、关键词、面包屑 ancestors、子方向、stats（总数/年份跨度/里程碑数）、milestones | — |
| GET | `/api/nodes/{id}/papers` | 节点（含子树）论文列表 | `sort=new|citations|year`、`year`、`q`（标题/摘要）、`milestone=true`、`page`、`per_page≤100` |
| GET | `/api/nodes/{id}/timeline` | 按年份分组的论文流（里程碑高亮） | `per_year`（每组展示数，默认 6） |
| GET | `/api/nodes/{id}/trends` | 年度论文量趋势 `[{year,count}]` | — |
| GET | `/api/nodes/{id}/feed` | 节点近期动态（按 published 过滤） | `days`、`limit` |

## 论文

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/papers/{id}` | 论文详情：元数据、abstract、所属 nodes、related（同方向高引用 8 篇） |

## 搜索 / 统计 / 动态

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/search?q=` | 论文（标题/摘要匹配）+ 研究方向（名称/关键词匹配） |
| GET | `/api/stats` | 全站统计：总量/真实 vs 示例/近 7 天新论文/三大领域/热点节点 |
| GET | `/api/feed` | 全站最新论文流（`days`、`limit`） |
| GET | `/api/health` | 健康检查 |

## 关注（Watch）· 单用户模式，`X-User` 头区分用户（默认 local）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/watch` | 已关注节点列表 |
| POST | `/api/watch` | `{ "node_id": "ai.nlp.llm" }` |
| DELETE | `/api/watch/{node_id}` | 取消关注 |
| GET | `/api/watch/digest` | 每个关注节点近 N 天进展汇总（`days=14`） |

## 技术路线网（Routes）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/routes` | 路线族总览：闭环 loop（nodes+edges）、技能契约 contract、评测矩阵 matrix、全部路线摘要 |
| GET | `/api/routes/{id}` | 单条路线：stages（含 items）、edges（演进关系）、pipeline/objective/insight |

路线 id：`usd` / `demo` / `guided` / `taskgen` / `datax` / `compose`（定义于 `routes/routes.yaml`）。
Item 字段：`label, year?, full_title?, note?, url?, key?`；Edge 字段：`from, to, relation(evolve/enable/compare), label?`。

## 管理（MVP 无鉴权）

| Method | Path | 说明 |
|---|---|---|
| POST | `/api/admin/milestone` | `{ paper_id, node_id, is_milestone }` 切换里程碑标记 |

## 数据结构

Paper：`id, title, authors[], year, venue, citation_count, arxiv_id, abs_url, pdf_url, code_url, published, is_milestone, is_demo, source, nodes[]`
Node：`id, parent_id, name_zh, name_en, description, keywords[], arxiv_cats[], level, paper_count?, children?`
