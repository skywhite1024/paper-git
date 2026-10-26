# PaperGit · 个人研究资料库

围绕 **世界模型、VLA、Robot Agentic** 的本地阅读资料库。用问题驱动的阶段路线组织资料，提供论文导读、来源记录、阅读状态和个人笔记。

当前目录：43 篇论文与技术报告、16 个配套资料入口。资料最后核验于 2026-10-26。已参考用户提供的 8 份可lip文字稿，具体阅读范围见应用「资料与来源」及 [文字稿阅读记录](docs/transcript-review.md)。

## 在线访问

**[打开 PaperGit](https://skywhite1024.github.io/paper-git/)**，无需本地启动。

代码仓库：[skywhite1024/paper-git](https://github.com/skywhite1024/paper-git)。推送到 `main` 后，GitHub Actions 自动测试、静态导出并部署 GitHub Pages。线上版本的搜索、筛选和笔记都在浏览器运行，不需要后端服务。

线上与 localhost 的笔记存储独立。迁移时先在旧页面导出 JSON，再到线上「阅读记录」导入；笔记仍只保存在当前浏览器，不会随代码上传到 GitHub，也不自动跨设备同步。

本地验证与线上一致的静态产物：

```powershell
npm run build:pages
```

输出位于 `frontend/.next-pages/`，默认路径前缀为 `/paper-git`。部署工作流使用 Pages 返回的 `base_path`，包含子页面、静态资源和 404 页面校验。

## 启动

需要 Node.js **22.18+**（测试使用 Node 原生 TypeScript 支持；已在 Node 24.14.1 验证）。

```powershell
cd "G:/code/paper-git"
npm --prefix "frontend" ci
npm run dev
```

命令启动本地 Next.js，等待就绪后打开默认浏览器 **http://localhost:3000**。终端保持运行，按 Ctrl+C 停止本次启动的服务。

```powershell
npm run dev -- --no-open
npm run dev -- --help
```

不需要 Python、SQLite 服务、模型账户或 API Key。默认仅监听 127.0.0.1；3000 端口被占用时提示并退出，不结束其他进程、不自动换端口。阅读记录与浏览器来源绑定，因此请固定使用 localhost:3000。

首次安装依赖需要网络；安装后内容来自本地 JSON。应用没有自动抓取、Agent、模型调用或联网搜索功能。外部论文、代码与视频仅在点击链接时打开。开发命令禁用 Next.js 遥测。

## 怎样使用

- **研究路线**：三个方向各四个阶段，点击方法进入导读。箭头表示建议阅读顺序，不代表引用或严格的历史继承关系。
- **资料库**：按方向、类型、阅读状态、荣誉筛选；搜索名称、方法、会议或年份。
- **论文详情**：查看核心问题、入选理由、阅读边界、原始来源与后续阅读。
- **阅读记录**：标记待读、在读、已读；记笔记，导入或导出 JSON 备份。笔记输入框失焦时保存，也可点击保存。
- **资料与来源**：数据集、代码、基准、导读及收录标准。

笔记仅保存在当前浏览器的 localStorage。清理浏览器数据或更换浏览器前请导出。导入会校验格式，**保留所有同名已有记录**，只添加当前没有的记录；未收录的论文 ID 被忽略。没有云同步。不同端口和 localhost / 127.0.0.1 是不同的浏览器存储空间。

## 收录原则

1. 只收录对三个方向有直接阅读价值的资料，注明「为何收录」与「注意什么」。
2. 历史正式论文以相关重要会议为主，补充机器人领域重点 RSS、CoRL 和少量关键期刊。CCF 标签采用 **2026 目录**，不追溯冒充发表当年等级；RSS、CoRL 不硬套 CCF。
3. Oral、Spotlight、Best Paper 必须有可查证据；个人精选不是官方荣誉。详情页链接到对应依据。
4. 普通预印本限 2026 年，项目页、代码和实验证据优先；有 github.io 并不自动入选。技术报告独立分类，可早于 2026 年。
5. 当前导读基于项目、摘要和发表信息核验，不宣称逐篇完成全文精读或独立复现。
6. 可lip文字稿用于整理技术脉络与阅读问题，学术事实回查原文。合集与主题稿去重比对，不将重复内容当成多份独立证据。

所有目录内容在 [frontend/content/catalog.json](frontend/content/catalog.json) 人工维护。新增条目后加入一个对应阶段，并运行目录测试。更新 frontierYear 时，应重新审查旧预印本的发表状态，不能只改年份绕过收录门槛。

## 验证

```powershell
npm test
npm run typecheck
npm run build:check
```

测试检查目录引用、年份与分类门槛、荣誉来源、笔记备份往返、导入冲突与异常数据。生产构建使用 frontend/.next-production；开发使用 frontend/.next-local，保留旧缓存不混用。

如需运行验证后的生产版本：

```powershell
$env:NEXT_DIST_DIR = ".next-production"
npm --prefix "frontend" start
```

## 结构

```text
frontend/content/catalog.json    人工维护的论文、路线、资料
frontend/app/                    首页、资料库、阅读记录与详情
frontend/components/             路线、卡片、筛选和阅读交互
frontend/lib/                    目录访问与笔记格式
frontend/tests/                  目录与本地记录验证
scripts/dev.mjs                  单命令启动与浏览器预览
docs/                            配色、来源边界与验收记录
```

本次按个人资料库目标替换了旧 FastAPI、全领域聚合、自动抓取、技能发现六路线和 3D 拓扑。采用直接可读的二维阶段图，减少遮挡与操作成本。原有 data/papergit.db 保留，未删除、未迁移进精选目录；旧数据库不再参与应用运行。

视觉参考：[paper-figure 的 ASPIRE 架构图](https://github.com/skywhite1024/paper-figure/blob/main/output/aspire/aspire-figure-1.png)。借鉴浅色分组、蓝绿暖橙与清晰连线；界面独立实现，不复制论文插图或品牌图标。
