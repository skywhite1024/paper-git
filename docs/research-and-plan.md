# PaperGit —— 论文追踪与可视化网站 · 调研报告与项目规划

> 版本：v0.1（2026-08-23）
> 定位：GitHub 式体验的学术论文追踪平台，以「领域 → 子领域 → 研究路线」树状结构追踪 AI / CS / Robotics 的研究进展。

---

## 一、市场调研

### 1.1 现有方案全景

| 类别 | 代表产品 | 核心形态 | 与本项目的关系 |
|---|---|---|---|
| 引文图谱探索 | Connected Papers | 单篇种子论文 → 相似度图 | 逐篇探索，无领域树、无进展追踪 |
| 引文图谱探索 | ResearchRabbit | 多种子文献网络 + Zotero 同步 | 面向文献综述收集，非领域监控 |
| 时间线演进 | Litmaps | 时间线地图 + 邮件监测 | 最接近"进展追踪"，但免费版每月仅 5 张地图，无树状领域结构 |
| 学术搜索底座 | Semantic Scholar | 2 亿+ 论文元数据 + 免费 API | 最佳数据源之一，非可视化产品 |
| 语料地图 | Paperscape | 全 arXiv 星系图 | 宏观壮观但被动浏览，无导航树、无监测，久未维护 |
| 分类树浏览 | arXiv Category Taxonomy | 官方分类树静态页 | 只有分类描述，不聚合论文与进展 |
| SOTA/任务追踪 | Papers with Code | 任务 → 数据集 → SOTA 排行 | **已于 2025 年 7 月下线**，留下生态空缺 |
| SOTA 接替者 | CodeSOTA、PapersWithCodePlus、HF Trending Papers | 排行榜/趋势流 | 均为部分替代，无树状领域脉络 |
| 开源追踪管道 | arxiv-trends、arXiv-Pulse、DailyArXiv | 爬取+推送脚本/邮件 | 是管道不是产品，无可视化站点 |
| 中文平台 | AMiner、ReadPaper | 大图谱 + AI 阅读助手 | 重"读论文/AI 问答"，轻"分方向日常监控"；闭源、收费、数据质量受质疑 |
| 人工精选清单 | Deep-Learning-Papers-Reading-Roadmap 等 awesome 系 | Markdown 手工树 | **与本项目心智模型最接近**，但纯手工、会过时、无元数据聚合、无可视化、无时间线 |

### 1.2 关键结论

1. **存在真实空缺**：没有任何产品同时满足「树状领域结构 + 自动论文聚合 + 每条研究路线的发展脉络与最新进展 + GitHub 式浏览体验」。各竞品只占其中一角。
2. **Papers with Code 退役（2025-07）** 造成"按方向/任务看进展"这一需求无处安放，社区替代品（CodeSOTA 等）尚不成熟——本项目切入时机好。
3. **awesome-list 是最接近的形态**，它的痛点（手工维护、会过时、无聚合无可视化）正是本项目要解决的问题：把"手工清单"升级为"活的树"。
4. **竞品教训**：
   - Connected Papers / Litmaps：付费墙限制研究者的日常使用 → 本项目应自托管、开放。
   - Paperscape：只有宏观图、缺少任务导向 → 本项目以"树 + 列表 + 时间线"为主，图谱作为后期增强视图而非主视图。
   - AMiner/ReadPaper：什么都做导致定位模糊 → 本项目聚焦"进展追踪"单一场景。
   - ORKG：结构化贡献门槛太高 → 本项目的贡献机制应极简（改 YAML 提 PR）。

### 1.3 可行性判断

**可行，且差异化明确。** 依据：
- 数据层无障碍：arXiv（OAI-PMH 批量、免费）、OpenAlex（10 万请求/天免费，含引用数与 topics）、Semantic Scholar（免费 key 1 RPS，含 TLDR 与引文图）足以支撑 AI/CS/Robotics 的元数据聚合。
- 技术层无攻关点：不需要自建引文图谱数据库，聚合 + 规则分类 + 可视化均为成熟工程。
- 主要风险不在技术在运营：领域树的维护成本 → 用"taxonomy 即代码 + PR 贡献"化解；分类准确性 → 规则映射起步 + 人工修正 + 后期嵌入分类。

---

## 二、产品方案

### 2.1 概念映射（GitHub → PaperGit）

| GitHub | PaperGit | 说明 |
|---|---|---|
| 仓库 | 领域（Field） | AI / CS / Robotics |
| 目录树 | 领域树 | Field → Subfield → Track（研究路线） |
| 文件/Commit | 论文 | 新论文进入节点 = 新 commit |
| Commit Feed | 进展流 | 某节点/我关注的节点的新论文动态 |
| Release/Milestone | 关键工作 | 路线上的里程碑论文（人工标记） |
| Star/Watch | 关注节点 | Watch 后进入个人进展流与定期 digest |
| README | 节点简介 | 每个节点的领域说明、关键词、代表工作 |
| PR | 贡献 | 修改 taxonomy.yaml / 补充里程碑论文 |

### 2.2 信息架构与页面

1. **首页 / 探索**：三大领域入口卡片 + 全站最新论文流 + 热点节点。
2. **领域树页（核心）**：左侧可折叠树形导航（默认三层：领域/子领域/研究路线），右侧为选中节点详情；支持搜索定位节点、面包屑。
3. **节点页（核心页面）**，含四个标签页：
   - **概览**：简介、关键词、论文量趋势图、里程碑论文卡。
   - **论文列表**：标题/作者/年份/venue/引用数/链接，支持按年份、排序（新发表/高引用/热点）、关键词过滤、分页。
   - **时间线（脉络）**：按年份分组展示论文流，里程碑高亮；一眼看清该方向的起承转合与最新进展。
   - **动态**：该节点近期新增论文 feed。
4. **论文详情页**：完整元数据（标题、作者、年份、venue、摘要、arXiv/DOI/代码链接）、所属节点列表（一篇论文可属多个节点）、引用数趋势、相关论文（基于引文/同节点）。
5. **趋势视图**：节点或子树的年度论文数/引用量对比，发现升温/降温方向。
6. **个人关注页**：Watch 的节点聚合动态 + 每周 digest（邮件或页面）。

### 2.3 初始领域树（示例，约 60–80 节点起步）

```
AI
├── 机器学习（ML）
│   ├── 深度学习 → CNN / Transformer / 优化方法
│   ├── 强化学习 → RL 理论 / RLHF / 多智能体
│   └── 联邦学习、自监督学习 …
├── 自然语言处理（NLP）→ LLM / RAG / Agent / 评测
├── 计算机视觉（CV）→ 检测分割 / 生成模型 / 多模态
├── 语音、AI 理论（可解释性/对齐/安全）…
CS
├── 系统 → 分布式 / 数据库 / 操作系统
├── 网络、安全与密码学、理论计算机科学
├── 软件工程（含 AI4SE / SE4AI）、数据库
└── 人机交互、量子计算 …
Robotics
├── 运动规划与控制 → 腿足 / 机械臂 / MPC
├── 感知与 SLAM、操作（Manipulation）
├── 具身智能（VLA / 仿真 / 学习类方法）
└── 人形机器人、软体机器人、多机器人系统 …
```

树存于 git 仓库中的 `taxonomy.yaml`，节点含：id、名称（中英）、简介、关键词、arXiv 类别映射、父节点。**加领域 = 改一个 YAML 文件**，满足可扩展性。

### 2.4 用户体验原则

- 三秒回答三问：这个方向是什么、现在到哪了、最近有什么新进展。
- 树是导航主轴，图谱视图（D3 力导图）只作后期增强，避免重蹈 Paperscape"好看不好用"。
- 所有列表页支持"按时间线看"与"按列表看"双视图切换。

---

## 三、技术架构

### 3.1 总体架构

```
┌─────────────────────────────────────────────┐
│  前端 Next.js + TypeScript + Tailwind        │
│  (SSR 节点页利于 SEO；树组件 react-arborist)  │
└──────────────┬──────────────────────────────┘
               │ REST / tRPC
┌──────────────▼──────────────────────────────┐
│  API 服务 FastAPI (Python)                   │
│  /nodes /papers /search /trends /watch      │
└──────┬───────────────────────┬──────────────┘
       │                       │
┌──────▼───────┐        ┌──────▼───────────────────┐
│ PostgreSQL   │        │ Ingest 管道（独立服务）    │
│ papers/nodes │◄───────│ 定时任务 + 适配器模式       │
│ relations    │        │ ArxivAdapter              │
│ 全文检索 FTS  │        │ OpenAlexAdapter           │
│ (后期Meili)  │        │ S2Adapter / 未来的 XAdapter│
└──────────────┘        │ 去重(DOI/arXiv ID 归一)    │
                        │ 分类(规则:类别+关键词→节点) │
                        └──────────────────────────┘
```

### 3.2 技术选型与理由

| 层 | 选型 | 理由 |
|---|---|---|
| 前端 | Next.js 14 + TypeScript + Tailwind | SSR/SSG 利于节点页 SEO 与首屏；生态成熟 |
| 树组件 | react-arborist（或 Ant Design Tree） | 虚拟滚动支持大树 |
| 图表 | ECharts（时间线/趋势）+ D3（后期图谱） | ECharts 中文文档好、覆盖 90% 需求 |
| API | FastAPI（Python） | 与数据管道同语言，团队一种语言维护两端 |
| 主库 | PostgreSQL + JSONB | 结构化查询 + 灵活元数据；MVP 用内置 FTS 搜索，后期平滑换 Meilisearch |
| 管道 | APScheduler/Celery + 适配器模式 | **数据源即插件**：新增数据源 = 新增一个 Adapter 类 |
| 配置 | taxonomy.yaml 入库（git） | 树即代码：版本化、可 PR、可回滚 |
| 部署 | Docker Compose（web + api + db + ingest） | 单机可跑，后期可拆 |

### 3.3 核心数据模型（简）

- `node`：id, parent_id, name_zh, name_en, description, keywords[], arxiv_cats[], level
- `paper`：id, title, abstract, authors[], year, venue, arxiv_id, doi, citation_count, links (pdf/code/project), created_at, source
- `paper_node`：paper_id ↔ node_id（多对多，含 assign_reason: rule/manual/milestone）
- `watch`：user_id ↔ node_id（后期）

### 3.4 分类策略（关键决策）

1. **MVP 用规则**：arXiv category 映射 + 节点关键词命中（标题/摘要）打分 → 自动挂载到节点，保留 assign_reason 便于人审。
2. **人工修正**：管理界面支持把论文挪到正确节点，修正数据回流为规则库的测试集。
3. **后期升级**：用 embedding（如 bge/gte）+ 小样本分类器辅助归类，新路线冷启动时用 LLM 批量初审。

### 3.5 更新机制

- 每日增量：arXiv OAI-PMH 拉昨日新论文 → 去重 → 分类挂载 → 生成节点动态。
- 每周回填：OpenAlex 批量更新引用数（100K/天额度充裕）、venue 补全。
- 所有外部响应落盘缓存，遵守各源 rate limit，页脚标注数据来源。

---

## 四、数据来源建议

| 优先级 | 来源 | 用途 | 限制/备注 |
|---|---|---|---|
| P0 | arXiv API + OAI-PMH | CS/AI/Robotics 元数据主源、每日增量 | 建议 1 请求/3 秒；批量走 OAI-PMH |
| P0 | OpenAlex | 引用数、venue、作者机构、官方 topics | 免费 10 万请求/天，最慷慨 |
| P1 | Semantic Scholar API | TLDR 摘要、引文关系、相关论文 | 免费 key 1 RPS，批量接口 500 篇/次 |
| P1 | HF Trending Papers / alphaXiv | 热度信号（点赞/讨论数） | 社区热度参考 |
| P2 | Papers with Code 存档（HF datasets / TIB） | 代码链接、数据集、SOTA 数字 | 已下线，仅静态存档可参考 |
| P2 | dblp、会议官网 proceedings | NeurIPS/ICML/ICLR/CoRL 等正式发表信息 | 补全 venue 与正式版 |
| P2 | GitHub API | 代码仓库 star 数作为"工程影响力"信号 | 与 arXiv id 对接 |

---

## 五、MVP 范围（6–8 周可上线）

### Phase 0 · 设计（1 周）
- taxonomy.yaml schema 定稿；三大领域两层到三层、约 60–80 节点。
- 数据模型与 API 契约定稿。

### Phase 1 · 数据管道（2 周）
- ArxivAdapter（OAI-PMH 全量 + 每日增量）+ 去重 + 规则分类挂载。
- OpenAlexAdapter（引用数回填）。
- 交付物：`ingest` CLI 可一键跑通，入库 ≥ 2 万篇论文。

### Phase 2 · 网站（2–3 周）
- 首页（领域入口 + 最新流）、领域树页（树导航 + 面包屑）、节点页（概览/论文列表/时间线三标签）、论文详情页、全站搜索（Postgres FTS）。
- 交付物：Docker Compose 一键起全站，三大领域可日常浏览。

### Phase 3 · 追踪闭环（1–2 周）
- Watch 节点 + 个人动态聚合页；里程碑论文标记（管理端人工打标）。
- 每周 digest 页面（邮件可选）。

### 明确不做（MVP 排除）
- PDF 全文阅读/解析、笔记与批注、用户社区评论、推荐系统、移动 App、引文全图可视化、自动写作综述。
- 这些全部留作后期模块，架构上预留接口（如 paper 详情页的"相关论文"数据结构）。

### 成功标准（MVP 验收）
- 树上任意研究路线节点可 3 秒内看懂"发展脉络 + 最新 5 篇进展"。
- 新 arXiv 论文从发布到出现在站点 ≤ 24 小时。
- 新增一个领域只需改 taxonomy.yaml + 少量关键词规则，无需改代码。

---

## 六、风险与对策

| 风险 | 对策 |
|---|---|
| 分类不准（arXiv 类别粒度粗） | 规则可调 + 人审界面 + assign_reason 溯源；预留嵌入分类升级路径 |
| taxonomy 人工维护成本 | 树即代码、PR 贡献流、每节点有 owner 概念（后期） |
| 数据源限流/失效 | 多源冗余（arXiv+OpenAlex 互备）、全量缓存、适配器隔离故障 |
| 做成"又一个 Connected Papers" | 坚守差异化：树导航 + 路线脉络 + 日常追踪，图谱只作辅助视图 |
| 引用数据滞后（新论文无引用） | 热度信号引入 HF/alphaXiv/社交指标作为补充排序 |

---

## 附：主要参考来源

- [Connected Papers](https://www.connectedpapers.com/) / [ResearchRabbit](https://www.researchrabbit.ai/) / [Litmaps](https://litmaps.com/)（对比见 [effortlessacademic 2025 对比文](https://effortlessacademic.com/litmaps-vs-researchrabbit-vs-connected-papers-the-best-literature-review-tool-in-2025/)、[HKUST 对比表](https://libguides.hkust.edu.hk/citation-chaining/citation-mapping-tools-comparison)）
- [Semantic Scholar API](https://www.semanticscholar.org/product/api)（限速 1 RPS/key）
- [OpenAlex 认证与限速](https://help.openalex.org/api/authentication/)（10 万请求/天）
- [arXiv API 手册](https://info.arxiv.org/help/api/user-manual.html)（OAI-PMH 批量）
- [arXiv Category Taxonomy](https://arxiv.org/category_taxonomy) / [arxiv_categories 数据集](https://huggingface.co/datasets/TimSchopf/arxiv_categories)
- [Paperscape](https://paperscape.org/) / [ArXiv Data Map](https://lmcinnes.github.io/datamapplot_examples/arXiv/)
- Papers with Code 退役与替代：[TIB 博客](https://blog.tib.eu/2025/10/02/papers-with-code-went-offline-the-knowledge-doesnt-have-to/)、[CodeSOTA](https://www.codesota.com/papers-with-code)、[HF Trending Papers](https://huggingface.co/papers/trending)、[社区替代清单 issue](https://github.com/paperswithcode/paperswithcode-data/issues/122)
- 开源管道参考：[arxiv-trends](https://github.com/DerwenAI/arxiv-trends)、[arXiv-Pulse](https://github.com/kYangLi/arXiv-Pulse)、[awesome-arxiv](https://github.com/artnitolog/awesome-arxiv)
- 树状精选清单范式：[Deep-Learning-Papers-Reading-Roadmap](https://github.com/floodsung/Deep-Learning-Papers-Reading-Roadmap)
- 中文平台：[AMiner](https://www.aminer.cn/)、[ReadPaper](https://pay.readpaper.com/)
