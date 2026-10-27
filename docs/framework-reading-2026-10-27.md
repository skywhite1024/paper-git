# 框架图原文核对记录

2026-10-27 补充 34 张原文方法／系统框架图，与已有 9 张合计覆盖当前 43 篇工作。
本轮核对范围是下表列出的原文页面、方法相关段落与图注，并逐张检查裁切结果；不表示全文精读、代码复现或全部实验结论已经独立验证。FAST 的 RSS PDF 没有可提取的文本层，因此同时核对 arXiv HTML 的第 V 节。
图片仅从原文页面提取，不改写图中内容。Gemini Robotics 使用报告公开的模型族总览，WorldArena 使用评测流程图，两者均在导读中标明图示层级。
原始 PDF 的 SHA-256、页面裁切坐标和阅读页码记录在相邻的 `framework-extractions.json` 中；中间 PDF 不进入站点发布。

| 工作 | 原文图与页码 | 方法相关阅读页 | 提炼出的机制 |
| --- | --- | --- | --- |
| PlaNet | [Fig. 2 · p.4](https://arxiv.org/pdf/1811.04551.pdf#page=4) | 3, 4 | RSSM + 潜空间模型预测控制 |
| DreamerV2 | [Fig. 2 · p.3](https://arxiv.org/pdf/2010.02193.pdf#page=3) | 3 | 离散 RSSM + KL balancing + actor-critic |
| DreamerV3 | [Fig. 3 · p.3](https://arxiv.org/pdf/2301.04104#page=3) | 3 | RSSM + 稳健损失与尺度归一化 |
| TD-MPC2 | [Fig. 3 · p.3](https://arxiv.org/pdf/2310.16828#page=3) | 3 | 隐式潜空间动力学 + TD 学习 + MPC |
| DayDreamer | [Fig. 3 · p.3](https://proceedings.mlr.press/v205/wu23c/wu23c.pdf#page=3) | 3 | Dreamer + 并行数据采集与学习 |
| UniPi | [Fig. 2 · p.4](https://papers.nips.cc/paper_files/paper/2023/file/1d5b9233ad716a43be5c0d3023cb82d0-Paper-Conference.pdf#page=4) | 4 | 条件视频扩散 + 逆动力学 |
| Genie | [Fig. 3 · p.3](https://raw.githubusercontent.com/mlresearch/v235/main/assets/bruce24a/bruce24a.pdf#page=3) | 3 | Video tokenizer + latent action model + dynamics model |
| DIAMOND | [Fig. 1 · p.2](https://arxiv.org/pdf/2405.12399#page=2) | 2, 3 | 条件扩散世界模型 + 想象中的强化学习 |
| Cosmos | [Fig. 2 · p.3](https://arxiv.org/pdf/2501.03575#page=3) | 3, 5 | 连续扩散 / 离散自回归视频世界模型 |
| I-JEPA | [Fig. 3 · p.3](https://openaccess.thecvf.com/content/CVPR2023/papers/Assran_Self-Supervised_Learning_From_Images_With_a_Joint-Embedding_Predictive_Architecture_CVPR_2023_paper.pdf#page=3) | 3 | ViT 编码器 + 特征预测器 + EMA 目标编码器 |
| V-JEPA | [Fig. 3 · p.4](https://arxiv.org/pdf/2404.08471#page=4) | 4 | 视频 JEPA + 特征回归 |
| DINO-WM | [Fig. 2 · p.4](https://arxiv.org/pdf/2411.04983#page=4) | 4 | 冻结 DINOv2 + 因果动态模型 + MPC |
| LeWorldModel | [Fig. 1 · p.1](https://arxiv.org/pdf/2603.19312#page=1) | 1, 3 | 端到端 JEPA + 预测损失 + SIGReg |
| Unified World Models | [Fig. 2 · p.4](https://arxiv.org/pdf/2504.02792#page=4) | 4 | 多模态扩散 Transformer + 独立噪声时间步 |
| Cosmos Policy | [Fig. 2 · p.4](https://arxiv.org/pdf/2601.16163#page=4) | 4 | Cosmos-Predict2 + latent frame injection |
| DreamZero | [Fig. 4 · p.6](https://arxiv.org/pdf/2602.15922#page=6) | 6 | 自回归视频动作扩散 Transformer |
| LingBot-VA | [Fig. 2 · p.4](https://raw.githubusercontent.com/Robbyant/lingbot-va/main/LingBot_VA_paper.pdf#page=4) | 4 | 自回归双流 MoT + 视频动作因果建模 |
| Cosmos 3 | [Fig. 5 · p.11](https://research.nvidia.com/labs/cosmos-lab/cosmos3/technical-report.pdf#page=11) | 11 | Mixture-of-Transformers：AR reasoner + diffusion generator |
| WorldArena | [Fig. 3 · p.6](https://arxiv.org/pdf/2602.08971#page=6) | 6 | 数据引擎 / 策略评估 / 动作规划评测 |
| ACT / ALOHA | [Fig. 4 · p.4](https://arxiv.org/pdf/2304.13705#page=4) | 4, 5 | Conditional VAE + Transformer + temporal ensemble |
| Diffusion Policy | [Fig. 3 · p.3](https://arxiv.org/pdf/2303.04137v4#page=3) | 3 | 条件动作扩散 + 滚动时域控制 |
| FAST | [Fig. 4 · p.5](https://www.roboticsproceedings.org/rss21/p012.pdf#page=5) | 4, 5 | DCT + 量化 + Byte-Pair Encoding |
| Open X-Embodiment | [Fig. 3 · p.4](https://arxiv.org/pdf/2310.08864#page=4) | 4 | Open X-Embodiment 数据 + RT-1-X / RT-2-X |
| Octo | [Fig. 2 · p.3](https://arxiv.org/pdf/2405.12213#page=3) | 3 | 模块化 Transformer + 扩散动作头 |
| π0.5 | [Fig. 3 · p.4](https://www.pi.website/download/pi05.pdf#page=4) | 4, 5 | VLM + FAST 预训练 + flow matching 动作专家 |
| GR00T N1 | [Fig. 3 · p.4](https://arxiv.org/pdf/2503.14734#page=4) | 4 | Eagle-2 VLM + 具身适配 DiT / flow matching |
| π*0.6 / RECAP | [Fig. 1 · p.1](https://www.pi.website/download/pistar06.pdf#page=1) | 4 | RECAP + 价值函数 + advantage conditioning |
| π0.7 | [Fig. 2 · p.4](https://www.pi.website/download/pi07.pdf#page=4) | 4 | VLM + MEM 历史编码 + 动作专家；高层策略 / 世界模型辅助 |
| PaLM-E | [Fig. 1 · p.1](https://palm-e.github.io/assets/palm-e.pdf#page=1) | 4 | 多模态编码器 + PaLM |
| Eureka | [Fig. 2 · p.2](https://arxiv.org/pdf/2310.12931#page=2) | 3 | 代码 LLM + 奖励进化搜索 + reward reflection |
| RoboGen | [Fig. 2 · p.4](https://arxiv.org/pdf/2311.01455#page=4) | 4 | 任务提案 + 场景生成 + 监督生成 + 技能学习 |
| Hi Robot | [Fig. 2 · p.4](https://raw.githubusercontent.com/mlresearch/v267/main/assets/shi25d/shi25d.pdf#page=4) | 4 | 高层 VLM + 低层 VLA |
| Gemini Robotics | [Fig. 1 · p.2](https://arxiv.org/pdf/2503.20020#page=2) | 2 | Gemini Robotics / Robotics-ER 模型族 |
| ASPIRE | [Fig. 1 · p.2](https://research.nvidia.com/labs/gear/aspire/assets/aspire.pdf?v=20261016#page=2) | 3 | 代码代理 + 执行引擎 + 技能库 + 进化搜索 |
