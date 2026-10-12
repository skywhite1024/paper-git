# PaperGit API 契约（v0.1）

Base URL：`http://localhost:8000`（可经 `NEXT_PUBLIC_API_URL`/`API_URL` 覆盖）。FastAPI 自动文档：`/docs`（OpenAPI）。

## 节点 / 领域树

| Method | Path | 说明 | 关键参数 |
|---|---|---|---|
| GET | `/api/nodes` | 整棵领域树（嵌套 children，`paper_count` 为子树**去重**论文数） | — |
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
| GET | `/api/stats` | 全站统计：总量/真实 vs 示例/近 7 天新论文/`newest_published`（语料截止时间）/三大领域/热点节点 |
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

## 约定与易错点

- **论文计数一律按 paper_id 去重**。一篇论文可同时挂在多个方向下，把子节点的计数相加会让祖先虚高（历史上 `ai` 曾报 22,668 而真实为 11,091）。因此父节点计数 ≤ 子节点计数之和、≥ 子节点计数最大值。见 `helpers.subtree_paper_counts`。
- `POST /api/watch` 的请求体是 `{ "node_id": "..." }`；**不存在** `POST /api/watch/{node_id}`（该路径只有 `DELETE`，误用会得到 405）。
- `GET /api/watch/digest` 在时间窗口内无新增时，会回退返回该方向近期代表工作，而不是空数组——前端文案需说明这一语义，否则用户会误以为「没有关注」。
- `recent_7d` 为 0 通常不是故障：语料按 ingest 时间截止，请对照 `newest_published` 判断。
- 索引：`papers.published` 与 `paper_node(node_id, paper_id)` 是统计与热节点查询的关键索引；`init_db` 会对既有库幂等补建（`create_all` 本身会跳过已存在的表）。

