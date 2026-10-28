# PaperGit · 个人研究资料库

围绕 **世界模型、VLA、Robot Agentic** 的个人阅读资料库。首页以浅色「研究群岛」地图组织论文，配合原始框架图、方法对照、阶段导读和个人笔记，支持本地与 GitHub Pages 访问。

当前目录：128 篇论文与技术报告、168 条阅读联系、16 个配套资料入口。资料最后核验于 2026-10-28。本轮新增 52 项正式会议工作，核对记录见 [本轮扩充与评审](docs/expansion-2026-10-28.md)。已参考用户提供的 8 份可lip文字稿，具体阅读范围见应用「资料与来源」及 [文字稿阅读记录](docs/transcript-review.md)。

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

- **研究群岛**：128 篇工作全部纳入地图，按三个方向和各自阅读阶段排布；只挂载视野及缓冲区中的卡片。浅绿、暖杏、淡紫岛屿支持无边界平移；拖拽移动、滚轮缩放、Shift + 滚轮平移，手机支持单指拖动与双指缩放。可全屏查看，通过群岛快捷入口、小地图或「全部群岛」找回位置。
- **圈层研究路线**：每座岛按研究问题划分四个分支，论文沿弧线从内向外展开；分支快捷导航可以单独放大一条路线。圈层表示阅读深度，不是统一时间轴。
- **以图为主的节点**：128 篇工作全部配有作者原图，360px 宽卡片以方法、系统或评测图为主，较小的名称、机制和年份位于图下；支持 2%–250% 缩放和不限位置的平移。初始 34 张 PDF 图的核对记录见 [原文核对记录](docs/framework-reading-2026-10-27.md)，后续两轮的 85 张图见 [首次扩充](docs/catalog-expansion-2026-10-27.md) 和 [本轮扩充](docs/expansion-2026-10-28.md)。
- **画布资源**：32% 及以下缩放使用最大 192 × 120 概览图，常规缩放使用最大 640 × 400 的 WebP 预览；放大至 110% 以上或打开论文解读时使用原图。地形与路线预计算，拖动更新按动画帧合并。资源统计见 [本轮记录](docs/atlas-resources-2026-10-28.json)，前次开发环境实测见 [性能记录](docs/atlas-performance-2026-10-27.md)。
- **论文面板**：点击节点打开可收起的浮动解读，不压缩画布。支持原图放大、三步读图、方法对照、分支上一篇／下一篇和笔记。搜索或索引可直接定位任意论文。粗实线表示方法延伸，细实线表示建议阅读，虚线表示方法对照；连线附上机制变化，不用它们冒充引用统计。
- **阶段路线**：三个方向各四个阶段，由论文面板中的阶段链接进入。
- **资料库**：按方向、类型、阅读状态、荣誉筛选；搜索名称、方法、会议或年份。
- **论文详情**：查看核心问题、入选理由、阅读边界、原始来源与后续阅读。
- **阅读记录**：标记待读、在读、已读；记笔记，导入或导出 JSON 备份。笔记输入框失焦时保存，也可点击保存；关闭解读、切换论文和标签前会检查保存结果，失败时保留草稿面板。
- **资料与来源**：数据集、代码、基准、导读及收录标准。

笔记仅保存在当前浏览器的 localStorage。清理浏览器数据或更换浏览器前请导出。导入会校验格式，**保留所有同名已有记录**，只添加当前没有的记录；未收录的论文 ID 被忽略。没有云同步。不同端口和 localhost / 127.0.0.1 是不同的浏览器存储空间。

## 收录原则

1. 只收录对三个方向有直接阅读价值的资料，注明「为何收录」与「注意什么」。
2. 历史正式论文以相关重要会议为主，补充机器人领域重点 RSS、CoRL 和少量关键期刊。CCF 标签采用 **2026 目录**，不追溯冒充发表当年等级；RSS、CoRL 不硬套 CCF。
3. Oral、Spotlight、Best Paper 必须有可查证据；个人精选不是官方荣誉。详情页链接到对应依据。
4. 普通预印本限 2026 年，项目页、代码和实验证据优先；有 github.io 并不自动入选。技术报告独立分类，可早于 2026 年。
5. 当前导读基于项目、发表信息及选定原文方法段落和图注；各篇标明实际阅读范围，不宣称逐篇完成全文精读或独立复现。
6. 可lip文字稿用于整理技术脉络与阅读问题，学术事实回查原文。合集与主题稿去重比对，不将重复内容当成多份独立证据。

所有目录内容在 [frontend/content/catalog.json](frontend/content/catalog.json) 人工维护。新增条目后加入一个对应阶段，补齐该阶段相邻节点的路线、原图及预览，并运行目录测试。圈层随分支容量增长，不再限制为三圈。更新 frontierYear 时，应重新审查旧预印本的发表状态，不能只改年份绕过收录门槛。

新增原图后，可使用 Python（Pillow、PyMuPDF）运行 `python "scripts/build-figure-previews.py"` 重新生成预览。生成文件随仓库提交，网站启动和部署不依赖 Python。

## 验证

```powershell
npm test
npm run typecheck
npm run build:check
```

测试检查目录引用、年份与分类门槛、荣誉来源、笔记备份往返、导入冲突与异常数据；画布测试验证每篇论文唯一归岛、卡片不重叠、缩放锚点不漂移，以及手机／桌面全览能包含全部论文。画布聚焦时还可用方向键移动、`+` / `-` 缩放、`Home` / `0` 返回全览。生产构建使用 frontend/.next-production；开发使用 frontend/.next-local，保留旧缓存不混用。

如需运行验证后的生产版本：

```powershell
$env:NEXT_DIST_DIR = ".next-production"
npm --prefix "frontend" start
```

## 结构

```text
frontend/content/catalog.json    人工维护的论文、路线、资料
frontend/content/frameworks.json 框架图出处、读图步骤、结构化方法对照
frontend/public/figures/         作者原图与出处说明
frontend/app/                    首页、资料库、阅读记录与详情
frontend/components/             路线、卡片、筛选和阅读交互
frontend/lib/                    目录访问与笔记格式
frontend/tests/                  目录与本地记录验证
scripts/dev.mjs                  单命令启动与浏览器预览
docs/                            配色、来源边界与验收记录
```

应用采用 Next.js 静态页面、React 与原生 SVG 群岛地图，不需要图谱引擎或 WebGL。原有 data/papergit.db 保留，未删除、未迁移进精选目录；旧数据库不再参与应用运行。

视觉参考：[paper-figure 的 ASPIRE 架构图](https://github.com/skywhite1024/paper-figure/blob/main/output/aspire/aspire-figure-1.png) 的浅色学术配色，以及用户选定的「2D-07 研究群岛地图」样例。地图、等高线与界面独立实现；论文图来自各自官方项目／论文，出处见 [框架图说明](frontend/public/figures/README.md)。
