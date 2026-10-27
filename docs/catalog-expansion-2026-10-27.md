# 顶会工作与路线扩充 · 2026-10-27

新增 33 项正式会议工作：世界模型与表征 10 项、视觉语言动作 13 项、具身任务与规划 10 项。目录从 43 项扩至 76 项，地图从 40 条联系扩至 89 条。三座岛分别为 32、25、19 项；12 个分支都有连续的建议阅读顺序。

## 收录与核验

这里的“精选”是针对路线完整性的编辑判断，不是引用量排行榜，也不自动表示获奖。会议记录优先使用 PMLR、NeurIPS、CVF；部分 RSS / ICRA 用出版者 DOI 元数据及作者项目页交叉核对。ICLR 条目核对论文首页或作者会议标识。RSS 索引此次返回验证页，未把该页面当作发表证据。

按会议举办年份记录：SimPLe 为 ICLR 2020，IRIS 为 ICLR 2023，VC-1 为 NeurIPS 2023，RDT-1B 为 ICLR 2025。PMLR 出版年份可能晚于 CoRL 举办年份。未将期刊论文 CALVIN 误列为 CoRL。新增条目未额外授予未经逐项核验的 Oral / Spotlight / Best Paper 标签。CCF 分类沿用 2026 目录；ICCV A 类在目录镜像第 57 页复核。

## 图示与阅读边界

32 项从对应 PDF 裁取，UniSim 使用 arXiv HTML 原文的 Fig. 2。图示逐张检查，保留原始内容与比例。阅读覆盖下表列出的图注和相关方法段落，不代表全文精读、完整实验复核或独立复现。部分页仅阅读与当前图示直接相关的段落。

MBPO 使用原文 Algorithm 2，明确是算法流程。VC-1 / CortexBench 是评测流程；DROID / UMI 是采集与教学系统；BridgeData V2 是数据概览；LIBERO / ALFRED 是任务生成与标注。它们不被描述为新网络架构。

| 工作 | 发表 | 图示 | 方法阅读范围 | 发表依据 |
| --- | --- | --- | --- | --- |
| PETS | NeurIPS 2018 | [Fig. 1](https://arxiv.org/pdf/1805.12114#page=2) | PDF p.2, 3, 4 | [来源](https://papers.nips.cc/paper_files/paper/2018/hash/3de568f8597b94bda53149c7d7f5958c-Abstract.html) |
| MBPO | NeurIPS 2019 | [Algorithm 2](https://arxiv.org/pdf/1906.08253#page=6) | PDF p.5, 6 | [来源](https://papers.nips.cc/paper_files/paper/2019/hash/5faf461eff3099671ad63c6f3f094f7f-Abstract.html) |
| SimPLe | ICLR 2020 | [Fig. 2](https://arxiv.org/pdf/1903.00374#page=4) | PDF p.3, 4 | [来源](https://arxiv.org/abs/1903.00374) |
| TD-MPC | ICML 2022 | [Fig. 2](https://arxiv.org/pdf/2203.04955#page=4) | PDF p.3, 4 | [来源](https://proceedings.mlr.press/v162/hansen22a.html) |
| IRIS | ICLR 2023 | [Fig. 1](https://arxiv.org/pdf/2209.00588#page=2) | PDF p.2, 3 | [来源](https://arxiv.org/abs/2209.00588) |
| UniSim | ICLR 2024 | [Fig. 2](https://arxiv.org/html/2310.06114v2#S2.F2) | HTML §2.1, §2.2, §4.1, §4.2 | [来源](https://universal-simulator.github.io/unisim/) |
| RoboDreamer | ICML 2024 | [Fig. 3](https://arxiv.org/pdf/2404.12377#page=3) | PDF p.3, 4 | [来源](https://proceedings.mlr.press/v235/zhou24f.html) |
| R3M | CoRL 2022 | [Fig. 2](https://arxiv.org/pdf/2203.12601#page=4) | PDF p.3, 4 | [来源](https://proceedings.mlr.press/v205/nair23a.html) |
| VIP | ICLR 2023 | [Fig. 1](https://arxiv.org/pdf/2210.00030#page=2) | PDF p.3, 4 | [来源](https://sites.google.com/view/vip-rl) |
| VC-1 / CortexBench | NeurIPS 2023 | [Fig. 2](https://arxiv.org/pdf/2303.18240#page=4) | PDF p.3, 4, 7 | [来源](https://papers.nips.cc/paper_files/paper/2023/hash/022ca1bed6b574b962c48a2856eb207b-Abstract-Conference.html) |
| Transporter Networks | CoRL 2020 | [Fig. 3](https://arxiv.org/pdf/2010.14406#page=4) | PDF p.4 | [来源](https://proceedings.mlr.press/v155/zeng21a.html) |
| PerAct | CoRL 2022 | [Fig. 2](https://peract.github.io/paper/peract_corl2022.pdf#page=4) | PDF p.4 | [来源](https://proceedings.mlr.press/v205/shridhar23a.html) |
| RVT | CoRL 2023 | [Fig. 2](https://d1qx31qr3h6wln.cloudfront.net/publications/RVT_Arxiv_2023.pdf#page=3) | PDF p.3, 4 | [来源](https://proceedings.mlr.press/v229/goyal23a.html) |
| RVT-2 | RSS 2024 | [Fig. 2](https://arxiv.org/pdf/2406.08545#page=4) | PDF p.4 | [来源](https://robotic-view-transformer-2.github.io/) |
| DP3 | RSS 2024 | [Fig. 2](https://arxiv.org/pdf/2403.03954#page=4) | PDF p.4 | [来源](https://doi.org/10.15607/rss.2024.xx.067) |
| RT-1 | RSS 2023 | [Fig. 3](https://robotics-transformer1.github.io/assets/rt1.pdf#page=6) | PDF p.5, 6 | [来源](https://doi.org/10.15607/rss.2023.xix.025) |
| VIMA | ICML 2023 | [Fig. 3](https://arxiv.org/pdf/2210.03094#page=4) | PDF p.4 | [来源](https://proceedings.mlr.press/v202/jiang23b.html) |
| SpatialVLA | RSS 2025 | [Fig. 2](https://arxiv.org/pdf/2501.15830#page=3) | PDF p.3, 4 | [来源](https://doi.org/10.15607/rss.2025.xxi.011) |
| RDT-1B | ICLR 2025 | [Fig. 3](https://arxiv.org/pdf/2410.07864#page=4) | PDF p.4, 5 | [来源](https://arxiv.org/abs/2410.07864) |
| OpenVLA-OFT | RSS 2025 | [Fig. 2](https://arxiv.org/pdf/2502.19645#page=3) | PDF p.3, 4 | [来源](https://doi.org/10.15607/rss.2025.xxi.017) |
| BridgeData V2 | CoRL 2023 | [Fig. 1](https://arxiv.org/pdf/2308.12952#page=1) | PDF p.1, 3 | [来源](https://proceedings.mlr.press/v229/walke23a.html) |
| DROID | RSS 2024 | [Fig. 2](https://arxiv.org/pdf/2403.12945#page=4) | PDF p.4 | [来源](https://doi.org/10.15607/rss.2024.xx.120) |
| UMI | RSS 2024 | [Fig. 2](https://arxiv.org/pdf/2402.10329#page=2) | PDF p.2, 3, 4 | [来源](https://umi-gripper.github.io/) |
| CLIPort | CoRL 2021 | [Fig. 2](https://arxiv.org/pdf/2109.12098.pdf#page=4) | PDF p.4 | [来源](https://proceedings.mlr.press/v164/shridhar22a.html) |
| LM-Nav | CoRL 2022 | [Fig. 3](https://arxiv.org/pdf/2207.04429#page=4) | PDF p.4 | [来源](https://proceedings.mlr.press/v205/shah23b.html) |
| Code as Policies | ICRA 2023 | [Fig. 1](https://arxiv.org/pdf/2209.07753#page=1) | PDF p.1, 3 | [来源](https://doi.org/10.1109/icra48891.2023.10160591) |
| ProgPrompt | ICRA 2023 | [Fig. 2](https://arxiv.org/pdf/2209.11302#page=2) | PDF p.2, 3, 4 | [来源](https://doi.org/10.1109/ICRA48891.2023.10161317) |
| SayPlan | CoRL 2023 | [Fig. 1](https://proceedings.mlr.press/v229/rana23a/rana23a.pdf#page=2) | PDF p.2, 3, 4 | [来源](https://proceedings.mlr.press/v229/rana23a.html) |
| Inner Monologue | CoRL 2022 | [Fig. 1](https://arxiv.org/pdf/2207.05608#page=2) | PDF p.2, 3 | [来源](https://proceedings.mlr.press/v205/huang23c.html) |
| LLM-Planner | ICCV 2023 | [Fig. 2](https://arxiv.org/pdf/2212.04088.pdf#page=4) | PDF p.4 | [来源](https://openaccess.thecvf.com/content/ICCV2023/html/Song_LLM-Planner_Few-Shot_Grounded_Planning_for_Embodied_Agents_with_Large_Language_ICCV_2023_paper.html) |
| RT-H | RSS 2024 | [Fig. 2](https://arxiv.org/pdf/2403.01823.pdf#page=4) | PDF p.4 | [来源](https://doi.org/10.15607/rss.2024.xx.049) |
| LIBERO | NeurIPS 2023 | [Fig. 2](https://arxiv.org/pdf/2306.03310#page=4) | PDF p.4 | [来源](https://papers.nips.cc/paper_files/paper/2023/hash/8c3c666820ea055a77726d66fc7d447f-Abstract-Datasets_and_Benchmarks.html) |
| ALFRED | CVPR 2020 | [Fig. 2](https://openaccess.thecvf.com/content_CVPR_2020/papers/Shridhar_ALFRED_A_Benchmark_for_Interpreting_Grounded_Instructions_for_Everyday_Tasks_CVPR_2020_paper.pdf#page=3) | PDF p.3 | [来源](https://openaccess.thecvf.com/content_CVPR_2020/papers/Shridhar_ALFRED_A_Benchmark_for_Interpreting_Grounded_Instructions_for_Everyday_Tasks_CVPR_2020_paper.pdf) |

裁切坐标、下载地址与源文件 SHA-256 见 [提取清单](catalog-expansion-extractions.json)。UniSim 的哈希对应原文 PNG，其他哈希对应 PDF。图片版权属于原作者；详见 [图片出处说明](../frontend/public/figures/README.md)。

## 路线含义

新增联系按三种意义分别标注：方法延伸用于有明确方法继承的关系（例如 RVT → RVT-2、OpenVLA → OFT、Transporter → CLIPort）；方法对照用于输入、表示、动作接口或评测目标不同的工作；阅读路径用于补足概念、数据或任务背景。跨岛联系按需显示。圈层是阅读次序和深度，不是统一时间轴，也不是论文引用图。

为新增连线编写了逐条解释和原文链接；所有相邻节点必须有联系，并由测试检查。数据与基准仍保留在论文目录中，方便从具体方法跳回其任务和训练数据。
