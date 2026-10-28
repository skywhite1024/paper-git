# 2026-10-28 内容扩充与评审

目录由 76 项扩充为 128 项，新增 52 项正式会议工作。三条路线分别为世界模型与表征 51 项、VLA 46 项、机器人任务规划与交互 31 项；共有 168 条显式联系。所有 128 项均有作者原图、结构化输入/机制/输出、三步导图与阅读边界。

## 阅读与来源范围

新增条目逐项核对一手会议记录、原文图注、所列物理 PDF 页中的相关方法或基准段落，并目视检查裁图。不是逐页全文审查，没有复现实验，也不把论文标题、项目简介或视频转写当成方法页。UniVLA、ConRFT 的 RSS PDF 为图像页面，采用原页渲染阅读。CoRL 按会议举办年份记录，PMLR 出版可能在下一年；RoboCasa 只记录 RSS 2024 初版，不混入 RoboCasa365。

每张新增图的原 PDF、页码、裁剪矩形、原 PDF SHA-256 和阅读页范围见 [提取清单](expansion-2026-10-28-extractions.json)。图均为原页裁剪，没有生成替代框架。系统、硬件、数据集、基准图按具体类型命名；EfficientZero 明确展示一致性模块，UniVLA 明确展示潜动作学习模块。

## 路线与交互修改

- 保留三岛四分支、可自由平移缩放的圈层地图；VLA 分支改为三维空间、动作分布与效率、多任务跨本体、数据经验更新。
- 168 条联系逐条存储端点说明和一手出处；删除以目标论文 change 字段回填解释的逻辑。
- 明确方法继承、数据复用与方法对照。Open X → Octo 为数据阅读联系；DINO → DINO-WM 明示后者使用 DINOv2。
- 面板显示完整端点及箭头，入边向左；详情后续阅读只沿人工标注出边，避免任意跨分支数组跳转。
- 新增完整分支上一篇/下一篇，不受视口挂载和筛选影响；首尾禁用，不跨分支。该入口补足虚拟画布中的连续阅读，不声称 Tab 会遍历全部未挂载卡片。
- Escape 分层关闭原图、解读、索引与全屏，忽略输入法组合期间的 Escape。关闭或换篇前检查笔记保存结果，失败时保留编辑器；页面链接也在路由跳转前检查保存。
- 中等屏幕阅读面板采用自适应宽度，画布控件按实际剩余区域避让；手机阅读时将后方画布设为 inert。全屏期间隔离背景焦点，Tab 在工作区内循环，退出恢复原焦点与滚动。
- 修正 π0.5 的 CoRL 2025 正式发表类型及 MBPO 的 off-policy 表述，补注 DreamerV3 图示为 2024 arXiv v2。

## 新增论文与图示

| 论文 | 正式发表 | 原图与阅读页 |
| --- | --- | --- |
| E2C | [NeurIPS 2015](https://papers.nips.cc/paper_files/paper/2015/hash/a1afc58c6ca9540d057299ec3016d726-Abstract.html) | [Fig. 1 · p.3](https://papers.nips.cc/paper_files/paper/2015/file/a1afc58c6ca9540d057299ec3016d726-Paper.pdf#page=3)；相关段落 p.3、4 |
| SOLAR | [ICML 2019](https://proceedings.mlr.press/v97/zhang19m.html) | [Fig. 2 · p.3](https://proceedings.mlr.press/v97/zhang19m/zhang19m.pdf#page=3)；相关段落 p.3、4、5 |
| SLAC | [NeurIPS 2020](https://papers.nips.cc/paper_files/paper/2020/hash/08058bf500242562c0d031ff830ad094-Abstract.html) | [Fig. 1 · p.4](https://papers.nips.cc/paper_files/paper/2020/file/08058bf500242562c0d031ff830ad094-Paper.pdf#page=4)；相关段落 p.4、5 |
| DreamerPro | [ICML 2022](https://proceedings.mlr.press/v162/deng22a.html) | [Fig. 1 · p.3](https://proceedings.mlr.press/v162/deng22a/deng22a.pdf#page=3)；相关段落 p.3、4 |
| EfficientZero | [NeurIPS 2021](https://papers.nips.cc/paper_files/paper/2021/hash/d5eca8dc3820cad9fe56a3bafda65ca1-Abstract.html) | [Fig. 2 · p.5](https://papers.nips.cc/paper_files/paper/2021/file/d5eca8dc3820cad9fe56a3bafda65ca1-Paper.pdf#page=5)；相关段落 p.4、5、6 |
| EfficientZero V2 | [ICML 2024](https://proceedings.mlr.press/v235/wang24at.html) | [Fig. 2 · p.3](https://raw.githubusercontent.com/mlresearch/v235/main/assets/wang24at/wang24at.pdf#page=3)；相关段落 p.3、4、5 |
| Diffuser | [ICML 2022](https://proceedings.mlr.press/v162/janner22a.html) | [Fig. 2 · p.2](https://proceedings.mlr.press/v162/janner22a/janner22a.pdf#page=2)；相关段落 p.2、3、4 |
| Decision Diffuser | [ICLR 2023](https://anuragajay.github.io/decision-diffuser/) | [Fig. 3 · p.4](https://arxiv.org/pdf/2211.15657.pdf#page=4)；相关段落 p.3、4、5 |
| Diffusion Forcing | [NeurIPS 2024](https://papers.nips.cc/paper_files/paper/2024/hash/2aee1c4159e48407d68fe16ae8e6e49e-Abstract-Conference.html) | [Fig. 2 · p.3](https://papers.nips.cc/paper_files/paper/2024/file/2aee1c4159e48407d68fe16ae8e6e49e-Paper-Conference.pdf#page=3)；相关段落 p.3、4、5 |
| DINO | [ICCV 2021](https://openaccess.thecvf.com/content/ICCV2021/html/Caron_Emerging_Properties_in_Self-Supervised_Vision_Transformers_ICCV_2021_paper.html) | [Fig. 2 · p.2](https://openaccess.thecvf.com/content/ICCV2021/papers/Caron_Emerging_Properties_in_Self-Supervised_Vision_Transformers_ICCV_2021_paper.pdf#page=2)；相关段落 p.2、3、4 |
| MAE | [CVPR 2022](https://openaccess.thecvf.com/content/CVPR2022/html/He_Masked_Autoencoders_Are_Scalable_Vision_Learners_CVPR_2022_paper.html) | [Fig. 1 · p.1](https://openaccess.thecvf.com/content/CVPR2022/papers/He_Masked_Autoencoders_Are_Scalable_Vision_Learners_CVPR_2022_paper.pdf#page=1)；相关段落 p.1、3 |
| DynaMo | [NeurIPS 2024](https://papers.nips.cc/paper_files/paper/2024/hash/3b8db54b629e00537b59cbc6612026d7-Abstract-Conference.html) | [Fig. 3 · p.4](https://papers.nips.cc/paper_files/paper/2024/file/3b8db54b629e00537b59cbc6612026d7-Paper-Conference.pdf#page=4)；相关段落 p.3、4、5 |
| VPP | [ICML 2025](https://proceedings.mlr.press/v267/hu25g.html) | [Fig. 2 · p.4](https://raw.githubusercontent.com/mlresearch/v267/main/assets/hu25g/hu25g.pdf#page=4)；相关段落 p.3、4 |
| Real-world MAE | [CoRL 2022](https://proceedings.mlr.press/v205/radosavovic23a.html) | [Fig. 1 · p.2](https://proceedings.mlr.press/v205/radosavovic23a/radosavovic23a.pdf#page=2)；相关段落 p.2、3 |
| STORM | [NeurIPS 2023](https://papers.nips.cc/paper_files/paper/2023/hash/5647763d4245b23e6a1cb0a8947b38c9-Abstract-Conference.html) | [Fig. 2 · p.4](https://papers.nips.cc/paper_files/paper/2023/file/5647763d4245b23e6a1cb0a8947b38c9-Paper-Conference.pdf#page=4)；相关段落 p.3、4、5 |
| TWM | [ICLR 2023](https://openreview.net/forum?id=TdBaDGCpjly) | [Fig. 1 · p.1](https://arxiv.org/pdf/2303.07109#page=1)；相关段落 p.1、3、4 |
| IBC | [CoRL 2021](https://proceedings.mlr.press/v164/florence22a.html) | [Fig. 1 · p.2](https://proceedings.mlr.press/v164/florence22a/florence22a.pdf#page=2)；相关段落 p.2、6 |
| BeT | [NeurIPS 2022](https://papers.nips.cc/paper_files/paper/2022/hash/90d17e882adbdda42349db6f50123817-Abstract-Conference.html) | [Fig. 3 · p.4](https://papers.nips.cc/paper_files/paper/2022/file/90d17e882adbdda42349db6f50123817-Paper-Conference.pdf#page=4)；相关段落 p.4、5 |
| VQ-BeT | [ICML 2024](https://proceedings.mlr.press/v235/lee24y.html) | [Fig. 2 · p.4](https://raw.githubusercontent.com/mlresearch/v235/main/assets/lee24y/lee24y.pdf#page=4)；相关段落 p.3、4 |
| 3D Diffuser Actor | [CoRL 2024](https://proceedings.mlr.press/v270/ke25a.html) | [Fig. 1 · p.4](https://raw.githubusercontent.com/mlresearch/v270/main/assets/ke25a/ke25a.pdf#page=4)；相关段落 p.3、4 |
| EquiBot | [CoRL 2024](https://proceedings.mlr.press/v270/yang25a.html) | [Fig. 2 · p.3](https://raw.githubusercontent.com/mlresearch/v270/main/assets/yang25a/yang25a.pdf#page=3)；相关段落 p.3、4 |
| Equivariant DP | [CoRL 2024](https://proceedings.mlr.press/v270/wang25a.html) | [Fig. 3 · p.5](https://raw.githubusercontent.com/mlresearch/v270/main/assets/wang25a/wang25a.pdf#page=5)；相关段落 p.3、4、5 |
| HPT | [NeurIPS 2024](https://papers.nips.cc/paper_files/paper/2024/hash/e0f393e7980a24fd12fa6f15adfa25fb-Abstract-Conference.html) | [Fig. 2 · p.3](https://papers.nips.cc/paper_files/paper/2024/file/e0f393e7980a24fd12fa6f15adfa25fb-Paper-Conference.pdf#page=3)；相关段落 p.3、4、5 |
| CrossFormer | [CoRL 2024](https://proceedings.mlr.press/v270/doshi25a.html) | [Fig. 2 · p.4](https://raw.githubusercontent.com/mlresearch/v270/main/assets/doshi25a/doshi25a.pdf#page=4)；相关段落 p.3、4 |
| RoboMamba | [NeurIPS 2024](https://papers.nips.cc/paper_files/paper/2024/hash/46a126492ea6fb87410e55a58df2e189-Abstract-Conference.html) | [Fig. 2 · p.5](https://papers.nips.cc/paper_files/paper/2024/file/46a126492ea6fb87410e55a58df2e189-Paper-Conference.pdf#page=5)；相关段落 p.4、5 |
| ROBOTURK | [CoRL 2018](https://proceedings.mlr.press/v87/mandlekar18a.html) | [Fig. 2 · p.3](https://proceedings.mlr.press/v87/mandlekar18a/mandlekar18a.pdf#page=3)；相关段落 p.2、3 |
| RoboNet | [CoRL 2019](https://proceedings.mlr.press/v100/dasari20a.html) | [Fig. 1 · p.2](https://proceedings.mlr.press/v100/dasari20a/dasari20a.pdf#page=2)；相关段落 p.3、4 |
| robomimic | [CoRL 2021](https://proceedings.mlr.press/v164/mandlekar22a.html) | [Fig. 1 · p.2](https://proceedings.mlr.press/v164/mandlekar22a/mandlekar22a.pdf#page=2)；相关段落 p.2、3、4 |
| MimicGen | [CoRL 2023](https://proceedings.mlr.press/v229/mandlekar23a.html) | [Fig. 2 · p.3](https://proceedings.mlr.press/v229/mandlekar23a/mandlekar23a.pdf#page=3)；相关段落 p.3、4 |
| MimicPlay | [CoRL 2023](https://proceedings.mlr.press/v229/wang23a.html) | [Fig. 2 · p.4](https://proceedings.mlr.press/v229/wang23a/wang23a.pdf#page=4)；相关段落 p.3、4 |
| Mobile ALOHA | [CoRL 2024](https://proceedings.mlr.press/v270/fu25b.html) | [Fig. 2 · p.3](https://raw.githubusercontent.com/mlresearch/v270/main/assets/fu25b/fu25b.pdf#page=3)；相关段落 p.3、4、5 |
| BEHAVIOR | [CoRL 2021](https://proceedings.mlr.press/v164/srivastava22a.html) | [Fig. 1 · p.2](https://proceedings.mlr.press/v164/srivastava22a/srivastava22a.pdf#page=2)；相关段落 p.2、4 |
| BEHAVIOR-1K | [CoRL 2022](https://proceedings.mlr.press/v205/li23a.html) | [Fig. 2 · p.4](https://proceedings.mlr.press/v205/li23a/li23a.pdf#page=4)；相关段落 p.3、4 |
| LEO | [ICML 2024](https://proceedings.mlr.press/v235/huang24ae.html) | [Fig. 1 · p.2](https://raw.githubusercontent.com/mlresearch/v235/main/assets/huang24ae/huang24ae.pdf#page=2)；相关段落 p.2、4 |
| RoboBrain | [CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/html/Ji_RoboBrain_A_Unified_Brain_Model_for_Robotic_Manipulation_from_Abstract_CVPR_2025_paper.html) | [Fig. 4 · p.5](https://openaccess.thecvf.com/content/CVPR2025/papers/Ji_RoboBrain_A_Unified_Brain_Model_for_Robotic_Manipulation_from_Abstract_CVPR_2025_paper.pdf#page=5)；相关段落 p.4、5 |
| HomeRobot | [CoRL 2023](https://proceedings.mlr.press/v229/yenamandra23a.html) | [Fig. 4 · p.6](https://proceedings.mlr.press/v229/yenamandra23a/yenamandra23a.pdf#page=6)；相关段落 p.3、6、7 |
| SayTap | [CoRL 2023](https://proceedings.mlr.press/v229/tang23a.html) | [Fig. 2 · p.4](https://proceedings.mlr.press/v229/tang23a/tang23a.pdf#page=4)；相关段落 p.3、4、5 |
| EmbodiedGPT | [NeurIPS 2023](https://papers.nips.cc/paper_files/paper/2023/hash/4ec43957eda1126ad4887995d05fae3b-Abstract-Conference.html) | [Fig. 2 · p.4](https://papers.nips.cc/paper_files/paper/2023/file/4ec43957eda1126ad4887995d05fae3b-Paper-Conference.pdf#page=4)；相关段落 p.4、5 |
| OpenEQA | [CVPR 2024](https://openaccess.thecvf.com/content/CVPR2024/html/Majumdar_OpenEQA_Embodied_Question_Answering_in_the_Era_of_Foundation_Models_CVPR_2024_paper.html) | [Fig. 4 · p.6](https://openaccess.thecvf.com/content/CVPR2024/papers/Majumdar_OpenEQA_Embodied_Question_Answering_in_the_Era_of_Foundation_Models_CVPR_2024_paper.pdf#page=6)；相关段落 p.3、4、6 |
| ManiSkill2 | [ICLR 2023](https://arxiv.org/abs/2302.04659) | [Fig. 2 · p.6](https://arxiv.org/pdf/2302.04659#page=6)；相关段落 p.3、5、6 |
| MOKA | [RSS 2024](https://www.roboticsproceedings.org/rss20/p062.html) | [Fig. 2 · p.3](https://www.roboticsproceedings.org/rss20/p062.pdf#page=3)；相关段落 p.3、4 |
| RoboCasa | [RSS 2024](https://www.roboticsproceedings.org/rss20/p050.html) | [Fig. 1 · p.1](https://www.roboticsproceedings.org/rss20/p050.pdf#page=1)；相关段落 p.1、3、5 |
| Act3D | [CoRL 2023](https://proceedings.mlr.press/v229/gervet23a.html) | [Fig. 1 · p.2](https://proceedings.mlr.press/v229/gervet23a/gervet23a.pdf#page=2)；相关段落 p.2、3、4 |
| CoT-VLA | [CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/html/Zhao_CoT-VLA_Visual_Chain-of-Thought_Reasoning_for_Vision-Language-Action_Models_CVPR_2025_paper.html) | [Fig. 2 · p.3](https://openaccess.thecvf.com/content/CVPR2025/papers/Zhao_CoT-VLA_Visual_Chain-of-Thought_Reasoning_for_Vision-Language-Action_Models_CVPR_2025_paper.pdf#page=3)；相关段落 p.3、4 |
| DexVLA | [CoRL 2025](https://proceedings.mlr.press/v305/wen25b.html) | [Fig. 2 · p.3](https://raw.githubusercontent.com/mlresearch/v305/main/assets/wen25b/wen25b.pdf#page=3)；相关段落 p.3、5 |
| GraspVLA | [CoRL 2025](https://proceedings.mlr.press/v305/deng25a.html) | [Fig. 3 · p.5](https://raw.githubusercontent.com/mlresearch/v305/main/assets/deng25a/deng25a.pdf#page=5)；相关段落 p.4、5 |
| FLARE | [CoRL 2025](https://proceedings.mlr.press/v305/zheng25a.html) | [Fig. 2 · p.3](https://raw.githubusercontent.com/mlresearch/v305/main/assets/zheng25a/zheng25a.pdf#page=3)；相关段落 p.3、4 |
| DreamGen | [CoRL 2025](https://proceedings.mlr.press/v305/jang25a.html) | [Fig. 2 · p.2](https://raw.githubusercontent.com/mlresearch/v305/main/assets/jang25a/jang25a.pdf#page=2)；相关段落 p.2、4 |
| DiWA | [CoRL 2025](https://proceedings.mlr.press/v305/chandra25a.html) | [Fig. 2 · p.4](https://raw.githubusercontent.com/mlresearch/v305/main/assets/chandra25a/chandra25a.pdf#page=4)；相关段落 p.4、5 |
| RoboPoint | [CoRL 2024](https://proceedings.mlr.press/v270/yuan25c.html) | [Fig. 2 · p.4](https://raw.githubusercontent.com/mlresearch/v270/main/assets/yuan25c/yuan25c.pdf#page=4)；相关段落 p.3、4 |
| UniVLA | [RSS 2025](https://www.roboticsproceedings.org/rss21/p014.html) | [Fig. 2 · p.4](https://www.roboticsproceedings.org/rss21/p014.pdf#page=4)；相关段落 p.3、4、5 |
| ConRFT | [RSS 2025](https://www.roboticsproceedings.org/rss21/p019.html) | [Fig. 1 · p.3](https://www.roboticsproceedings.org/rss21/p019.pdf#page=3)；相关段落 p.3、4 |

## 资源优化

三级资源不改变卡片节点与比例：32% 及以下使用最大 192×120 概览图，32%–110% 使用最大 640×400 预览，110% 以上与解读面板使用原图。保留视口外节点裁剪、240 屏幕像素预加载区、分层 memo、连线预计算与动画帧合并。

128 张概览共 388,172 bytes，普通预览 2,862,640 bytes，原图 12,205,482 bytes。全览资源比同批普通预览少 86.4%，比原图少 96.8%。图片尺寸和像素总量逐文件检查，详见 [资源记录](atlas-resources-2026-10-28.json)。概览解码像素由普通预览的 22,057,162 降至 1,998,552，约减少 90.9%；RGBA 像素预算由约 88.2 MB 降至 8.0 MB。这些是资源与解码像素预算，不等同于 FPS。

## 验证与相互评审

自动检查覆盖目录引用、来源、原图/三级资源、所有分支相邻路线、卡片不重叠、缩放锚点、手机/桌面全览，以及 20→21、27→28、35→36 的新圈层边界。另做浏览器交互和 Pages 导出检查。

三个独立评审对话分别审查论文证据、路线语义、画布交互，并互相复核对方发现；具体发现、修正和新版验证结果在完成后补充于下表。

| 评审 | 已确认发现 | 修正与复核 |
| --- | --- | --- |
| 论文证据 | π0.5 发表类型过时；MBPO off-policy 误写离线 | 已修正；新增八项 2025 工作原文及哈希由独立评审交叉核验 |
| 路线关系 | 40 条旧边解释回退错误；详情推荐跨分支；入边方向不清；Open X→Octo 分类不当 | 已补专用解释与来源；改人工出边；显示完整方向；数据复用改 reading |
| 画布交互 | Tab 跳过未挂载论文；Escape 范围窄；笔记保存失败风险 | 新增完整分支导航；统一 Escape；保存布尔结果阻止失败时卸载 |

路线复审通过：128 篇唯一归岛，116 对分支相邻节点全部有前向边；补充 DreamerV2→DreamerPro 方法延伸，FLARE→π0 改用 FLARE 原文来源后，共 168 条。浏览器实测从 Dreamer 连续至第 19 篇 TD-MPC2，再回到第 1 篇 E2C，首尾禁用、编号和定位正确。

主流程浏览器检查：全览挂载 128 张概览图；近景只挂载附近节点（所测 ConRFT 视野为 7 张）；解读使用原图，未发现加载失败。通过新增论文搜索、跨视口前后篇、筛选清除、原图弹窗及 Escape 逐层关闭检查，控制台无 error。

论文证据复审：独立核验重点八项和另抽样十二项的标题、会议、方法说明与原图，未发现可确认的学术内容错误；全部 52 张裁图按提取坐标独立渲染比对通过。未声称逐篇全文深审或逐条验证所有学术关系。复审发现 FLARE 路线的手拼 PDF 地址 404，已改为实际原文链接并验证 HTTP 200。

主流程已复测全屏 Shift+Tab 仍留在工作区，Escape 退出后焦点恢复全屏按钮。独立交互复测已确认 800 / 1024 / 1440 宽度所测控件无遮挡、全屏连续 80 次 Tab 保持工作区内，退出恢复焦点、滚动和外部交互；手机关闭解读恢复画布焦点。存储失败链接拦截终审通过：完整导读、详情箭头和主导航均阻止跳转并保留草稿；恢复存储后保存并跳转，详情页读到同一笔记。手机三级图片、128 张概览图和 19 篇完整分支遍历通过，未捕获脚本异常。三个评审对话均完成针对性复审和交叉核验，没有未解决的阻塞项。

本地最终验证：16/16 测试、TypeScript 检查、Pages 静态构建通过；校验 135 个页面、404 和 4,466 个站内链接/资源引用。由 [main 分支部署工作流](https://github.com/skywhite1024/paper-git/actions/workflows/pages.yml) 发布，线上入口为 [PaperGit](https://skywhite1024.github.io/paper-git/)。对应提交的工作流保留构建与部署结果。

非阻塞后续建议：详情页推荐可进一步展示关系类型与路线标签。此次保留已验证的人工出边推荐行为。
