# 论文框架图出处

当前 128 篇工作均已收录作者原图。最初 9 张于 2026-10-26 从作者／机构官方项目、仓库或论文下载；另外 34 张于 2026-10-27 从对应原始 PDF 提取。前次扩充 33 张：32 张来自原始 PDF，UniSim 来自 arXiv 论文 HTML 的 Fig. 2 图像资源。界面以 `object-fit: contain` 完整显示，不以 AI 示意图代替论文图。

图片版权属于原作者及各自权利人；本项目的代码许可不覆盖这些第三方图片，也不主张对其拥有版权。页面图片下方提供来源链接。具体图注、三步读图与直接下载 URL 统一维护在 `frontend/content/frameworks.json`。

| 文件 | 论文／机构 | 原始来源 |
| --- | --- | --- |
| world-models.svg | World Models · David Ha, Jürgen Schmidhuber | https://worldmodels.github.io/ |
| dreamer.png | Dreamer · Google Research | https://research.google/blog/introducing-dreamer-scalable-reinforcement-learning-using-world-models/ |
| vjepa2.png | V-JEPA 2 · Meta | https://github.com/facebookresearch/vjepa2/blob/main/assets/flowchart.png |
| rt2.png | RT-2 · 项目作者 | https://robotics-transformer2.github.io/ |
| openvla.jpg | OpenVLA · 项目作者 | https://openvla.github.io/ |
| pi0.png | π0 · Physical Intelligence · 初稿 Figure 3 | https://arxiv.org/html/2410.24164v1#S2.F3 |
| saycan.png | SayCan · 项目作者 | https://say-can.github.io/ |
| voxposer.jpg | VoxPoser · 项目作者 | https://voxposer.github.io/ |
| rekep.jpg | ReKep · 项目作者 | https://rekep-robot.github.io/ |

V-JEPA 2 使用原始训练流程图，不混用 V-JEPA 2.1 图示。π0 图片来自 2024 年初稿，页面的 2025 年指正式 RSS 发表年份。

新增的 34 张 `.webp` 原文图：图号、页码和相关方法阅读范围见 [核对记录](../../../docs/framework-reading-2026-10-27.md)，PDF 下载 URL、SHA-256 及裁切坐标见 [提取记录](../../../docs/framework-extractions.json)。裁切仅移除论文周围正文，不重绘方法图。Gemini Robotics 对应作者公开的模型族总览，WorldArena 对应评测框架，图示层级在页面说明。阅读范围不等同于全文实验复核。

前次 33 项的出处、图号及方法阅读范围见 [扩充记录](../../../docs/catalog-expansion-2026-10-27.md)，原文 SHA-256、PDF 裁切坐标或 HTML 图像链接见 [新增提取记录](../../../docs/catalog-expansion-extractions.json)。MBPO 使用原文 Algorithm 2；VC-1、DROID、BridgeData V2、UMI、LIBERO、ALFRED 分别呈现评测、采集或任务流程，不冒充网络结构。

`previews/` 由 `scripts/build-figure-previews.py` 从上述原图派生，最长边受 640 × 400 限制，供常规画布浏览。原图用于阅读面板、原图弹窗与放大画布；两者都保留作者署名及来源。

2026-10-28 新增 52 张原 PDF 图。图号、物理页码和实际阅读范围见 [本轮核对记录](../../../docs/expansion-2026-10-28.md)，原 PDF URL、SHA-256 和裁剪坐标见 [本轮提取清单](../../../docs/expansion-2026-10-28-extractions.json)。没有文本层的 UniVLA、ConRFT 使用原页渲染目视阅读。

`overview/` 为最大 192 × 120 的概览图，在 32% 及以下缩放使用；`previews/` 在常规缩放使用。派生图仅缩小与编码，保持原图比例；阅读面板和高倍率画布保留原图。
