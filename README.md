# PaperGit · 论文追踪与可视化

以 GitHub 式体验追踪学术论文进展：领域树（领域 → 子领域 → 研究路线）自动聚合论文、时间线脉络、趋势与动态，覆盖 **AI / 计算机科学 / 机器人** 三大方向，可扩展至任意领域。

- 调研与产品方案：[`docs/research-and-plan.md`](docs/research-and-plan.md)
- API 契约：[`docs/api-contract.md`](docs/api-contract.md)

## 功能

- **技术路线网**（`/routes`）：以「机器人技能发现与获取」为首个路线族——闭环总览图（能力来源→技能归纳→组合部署→技能库回流）、6 条技术路线（在线无监督技能发现 / 示范轨迹分解 / 引导式与 Agentic / 自动任务生成 / 数据扩展 / 组合与治理）、126 个方法节点、28 条演进边（VIC→DIAYN→…→METRA 式脉络）、技能契约与评测矩阵。路线即代码：`routes/routes.yaml`。
- **领域树导航**：左侧可折叠树 + 节点过滤 + 面包屑，任意节点一页看懂"方向是什么 / 到哪了 / 最近有什么新进展"。
- **论文聚合**：标题 / 作者 / 年份 / venue / 引用 / arXiv 链接，支持关键词筛选、年份过滤、排序与分页。
- **时间线脉络**：按年份分组的论文流，里程碑工作 ⭐ 高亮。
- **趋势可视化**：ECharts 年度论文量趋势，发现升温/降温方向。
- **进展追踪**：Watch 节点 → 「我的关注」14 天 digest；节点「动态」页展示近期新增。
- **数据管道**：arXiv 全量/增量采集 + OpenAlex 引用回填 + 规则分类（可升级嵌入分类）。

## 快速开始（本机开发，无需 Docker）

```bash
# 1. 后端（Python 3.10+）
python -m venv .venv
.venv/Scripts/python -m pip install -e "backend[dev]"   # Windows；Linux/Mac 用 .venv/bin/python
cd backend && ../.venv/Scripts/python -m app.ingest.runner --per-category 300   # 拉取真实 arXiv 数据
# 无网络时可用种子数据：../.venv/Scripts/python -m app.ingest.seed
../.venv/Scripts/python -m uvicorn app.main:app --port 8000     # API → http://localhost:8000/docs

# 2. 前端（Node 18+）
cd ../frontend && npm install
npm run dev        # → http://localhost:3000
```

## Docker Compose（Postgres + API + Web + 一次性 ingest）

```bash
docker compose up -d --build            # 起 db / api(:8000) / web(:3000)
docker compose run --rm ingest          # 首次数据抓取（arXiv，约 10-20 分钟）
# 增量更新：docker compose run --rm ingest python -m app.ingest.runner --incremental
```

## 维护领域树（taxonomy 即代码）

领域树完全由 [`taxonomy/taxonomy.yaml`](taxonomy/taxonomy.yaml) 定义（当前 67 节点）。
**新增领域/子领域/研究路线 = 编辑 YAML + 重跑 `python -m app.taxonomy_loader`**，无需改代码。
每个节点配置 `keywords`（标题/摘要命中用于自动分类）与 `arxiv_cats`（分类映射），欢迎提 PR 扩展。

## Ingest 常用命令

```bash
python -m app.ingest.runner                          # 全量：30 个 arXiv 分类 × 每类 900 篇
python -m app.ingest.runner --categories cs.RO,cs.AI # 指定分类
python -m app.ingest.runner --incremental --days 3   # 增量（定时任务用）
python -m app.ingest.runner --backfill-citations     # OpenAlex 回填引用数/venue
python -m app.ingest.seed                            # 离线演示数据（61 篇里程碑 + 合成填充）
python -m app.ingest.enrich_routes                   # 为 routes.yaml 方法节点检索 arXiv 链接
python -m pytest                                     # 后端测试（backend/ 下）
```

## 目录结构

```
taxonomy/taxonomy.yaml   领域树定义（即代码）
routes/routes.yaml       技术路线族定义（即代码：路线/阶段/方法节点/演进边/闭环/契约/矩阵）
backend/                 FastAPI：API + ingest 管道 + 测试
  app/api/               nodes/papers/search/watch 路由
  app/ingest/            arXiv & OpenAlex 适配器、去重、规则分类、CLI
frontend/                Next.js 15（App Router）+ Tailwind v4 + ECharts
docs/                    调研报告、API 契约
docker-compose.yml       db(Postgres) + api + web + ingest(tools profile)
```

## 数据来源与致谢

[arXiv](https://arxiv.org)（Atom API，遵守 ~1 请求/3 秒限速）· [OpenAlex](https://openalex.org)（引用数与 venue 回填）。元数据仅用于研究与展示。
