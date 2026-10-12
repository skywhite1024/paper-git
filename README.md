# PaperGit · 论文追踪与可视化

以 GitHub 式体验追踪学术论文进展：领域树（领域 → 子领域 → 研究路线）自动聚合论文、时间线脉络、趋势与动态，覆盖 **AI / 计算机科学 / 机器人** 三大方向，可扩展至任意领域。

- 调研与产品方案：[`docs/research-and-plan.md`](docs/research-and-plan.md)
- API 契约：[`docs/api-contract.md`](docs/api-contract.md)

## 功能

- **三维知识拓扑（主页 `/`）**：以 three.js 构建的立体知识结构——路线为走廊、阶段为地层、方法为节点；确定性布局（非力导向），沿走廊推进即读出路线主流程，跨走廊高拱管为闭环回流。射线拾取悬停/单击、相机飞行定位、路线筛选、检索、`?route=&node=` 深链；阶段地层可点击展开该阶段全部工作。设计说明见 [`docs/topology3d.md`](docs/topology3d.md)。
- **提示词系统**（`frontend/lib/lexicon.ts`）：全站文案与术语统一管理，学术中性表述、双语对照、无表情符号。
- **技术路线网**（`/routes`）：闭环总览图、6 条技术路线的演进网络（泳道 DAG）、技能契约与评测矩阵；路线即代码：`routes/routes.yaml`。
- **领域树导航**：可折叠树 + 过滤 + 面包屑，任意节点看懂方向进展；论文聚合、时间线、趋势、关注 digest。
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

## 前端质量门禁

需前后端已分别运行在 `localhost:3000` / `localhost:8000`。工具用 Playwright 驱动本机 Chrome。

```bash
cd frontend
npx tsc --noEmit                     # 类型
npx next build                       # 生产构建（含 lint）
node visual-qa.mjs <前缀> both light   # 9 个页面 × 1440/390 截图，检出横向溢出与控制台报错
node visual-qa.mjs <前缀> both dark    # 同上，深色主题
node interaction-qa.mjs              # 14 项真实操作冒烟（主题持久化、即时检索、拓扑定位、
                                     # 分页筛选、关注撤销、移动端抽屉、404 恢复）
node a11y-qa.mjs                     # 结构可达性审计（唯一 h1、地标与可访问名称、
                                     # 重复 id、svg/图片替代文本、焦点可见性）
```

截图输出到 `.qa/shots/`（已 gitignore）。

> 三维画布是持续动画的 WebGL，`chrome --headless --screenshot` 抓不到帧（会得到一张全黑的
> 假阴性图）。视觉验证必须走 Playwright。

设计令牌、原语与文案约定见 [docs/design-system.md](docs/design-system.md)。

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
