"""离线种子数据：
1) LANDMARKS: 真实里程碑论文（人工指定节点，可被里程碑标记）
2) 演示填充: 按节点关键词生成的合成数据（is_demo=True，仅用于无网络环境演示与测试）
用法: python -m app.ingest.seed [--filler-per-node 8] [--no-filler] [--clean-demo]
"""

import argparse
import random

from sqlalchemy import delete, select

from ..database import SessionLocal
from ..models import Node, Paper
from .classifier import NodeRules, assign_nodes
from .dedupe import upsert_paper

# (title, authors, year, venue, arxiv_id, primary_cat, cats, citations, nodes)
LANDMARKS = [
    ("Attention Is All You Need", ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"], 2017, "NeurIPS", "1706.03762", "cs.CL", ["cs.CL"], 180000, ["ai.ml.dl.arch", "ai.nlp.llm"]),
    ("BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding", ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee"], 2018, "NAACL", "1810.04805", "cs.CL", ["cs.CL"], 120000, ["ai.nlp.llm"]),
    ("Language Models are Few-Shot Learners", ["Tom Brown", "Benjamin Mann", "Nick Ryder"], 2020, "NeurIPS", "2005.14165", "cs.CL", ["cs.CL"], 45000, ["ai.nlp.llm"]),
    ("Training language models to follow instructions with human feedback", ["Long Ouyang", "Jeffrey Wu", "Xu Jiang"], 2022, "NeurIPS", "2203.02155", "cs.CL", ["cs.CL"], 25000, ["ai.ml.rl.rlhf", "ai.nlp.llm"]),
    ("Direct Preference Optimization: Your Language Model is Secretly a Reward Model", ["Rafael Rafailov", "Archit Sharma", "Eric Mitchell"], 2023, "NeurIPS", "2305.18290", "cs.LG", ["cs.LG", "cs.CL"], 4000, ["ai.ml.rl.rlhf"]),
    ("Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans"], 2022, "NeurIPS", "2201.11903", "cs.CL", ["cs.CL"], 15000, ["ai.nlp.llm"]),
    ("Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus"], 2020, "NeurIPS", "2005.11401", "cs.CL", ["cs.CL"], 10000, ["ai.nlp.rag"]),
    ("LoRA: Low-Rank Adaptation of Large Language Models", ["Edward Hu", "Yelong Shen", "Phillip Wallis"], 2021, "ICLR", "2106.09685", "cs.CL", ["cs.CL", "cs.LG"], 12000, ["ai.ml.dl.eff"]),
    ("Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity", ["William Fedus", "Barret Zoph", "Noam Shazeer"], 2021, "JMLR", "2101.03961", "cs.LG", ["cs.LG"], 4500, ["ai.ml.dl.eff", "ai.nlp.llm"]),
    ("Scaling Laws for Neural Language Models", ["Jared Kaplan", "Sam McCandlish", "Tom Henighan"], 2020, "arXiv", "2001.08361", "cs.CL", ["cs.CL"], 5000, ["ai.nlp.llm"]),
    ("Training Compute-Optimal Large Language Models", ["Jordan Hoffmann", "Sebastian Borgeaud", "Arthur Mensch"], 2022, "NeurIPS", "2203.15556", "cs.CL", ["cs.CL"], 3000, ["ai.nlp.llm"]),
    ("LLaMA: Open and Efficient Foundation Language Models", ["Hugo Touvron", "Thibaut Lavril", "Gautier Izacard"], 2023, "arXiv", "2302.13971", "cs.CL", ["cs.CL"], 12000, ["ai.nlp.llm"]),
    ("GPT-4 Technical Report", ["OpenAI"], 2023, "arXiv", "2303.08774", "cs.CL", ["cs.CL"], 6000, ["ai.nlp.llm"]),
    ("Mixtral of Experts", ["Albert Q. Jiang", "Alexandre Sablayrolles", "Antoine Roux"], 2024, "arXiv", "2401.04088", "cs.CL", ["cs.CL", "cs.LG"], 2500, ["ai.nlp.llm", "ai.ml.dl.eff"]),
    ("Deep Residual Learning for Image Recognition", ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren"], 2015, "CVPR", "1512.03385", "cs.CV", ["cs.CV"], 230000, ["ai.ml.dl.arch"]),
    ("An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale", ["Alexey Dosovitskiy", "Lucas Beyer", "Alexander Kolesnikov"], 2020, "ICLR", "2010.11929", "cs.CV", ["cs.CV"], 30000, ["ai.ml.dl.arch", "ai.cv.mm"]),
    ("You Only Look Once: Unified, Real-Time Object Detection", ["Joseph Redmon", "Santosh Divvala", "Ross Girshick"], 2015, "CVPR", "1506.02640", "cs.CV", ["cs.CV"], 55000, ["ai.cv.det"]),
    ("Mask R-CNN", ["Kaiming He", "Georgia Gkioxari", "Piotr Dollar"], 2017, "ICCV", "1703.06870", "cs.CV", ["cs.CV"], 55000, ["ai.cv.det"]),
    ("Segment Anything", ["Alexander Kirillov", "Eric Mintun", "Nikhila Ravi"], 2023, "ICCV", "2304.02643", "cs.CV", ["cs.CV"], 4000, ["ai.cv.det"]),
    ("Generative Adversarial Nets", ["Ian Goodfellow", "Jean Pouget-Abadie", "Mehdi Mirza"], 2014, "NeurIPS", "1406.2661", "stat.ML", ["stat.ML", "cs.LG"], 90000, ["ai.cv.gen"]),
    ("Denoising Diffusion Probabilistic Models", ["Jonathan Ho", "Ajay Jain", "Pieter Abbeel"], 2020, "NeurIPS", "2006.11239", "cs.LG", ["cs.LG", "stat.ML"], 15000, ["ai.cv.gen"]),
    ("High-Resolution Image Synthesis with Latent Diffusion Models", ["Robin Rombach", "Andreas Blattmann", "Dominik Lorenz"], 2021, "CVPR", "2112.10752", "cs.CV", ["cs.CV"], 10000, ["ai.cv.gen"]),
    ("Learning Transferable Visual Models From Natural Language Supervision", ["Alec Radford", "Jong Wook Kim", "Chris Hallacy"], 2021, "ICML", "2103.00020", "cs.CV", ["cs.CV"], 20000, ["ai.cv.mm"]),
    ("Visual Instruction Tuning", ["Haotian Liu", "Chunyuan Li", "Qingyang Wu"], 2023, "NeurIPS", "2304.08485", "cs.CV", ["cs.CV", "cs.CL"], 5000, ["ai.cv.mm"]),
    ("NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis", ["Ben Mildenhall", "Pratul Srinivasan", "Matthew Tancik"], 2020, "ECCV", "2003.08934", "cs.CV", ["cs.CV"], 9000, ["ai.cv.3d"]),
    ("3D Gaussian Splatting for Real-Time Radiance Field Rendering", ["Bernhard Kerbl", "Georgios Kopanas", "Thomas Leimkühler"], 2023, "SIGGRAPH", "2308.04079", "cs.CV", ["cs.CV"], 3500, ["ai.cv.3d"]),
    ("A Simple Framework for Contrastive Learning of Visual Representations", ["Ting Chen", "Simon Kornblith", "Mohammad Norouzi"], 2020, "ICML", "2002.05709", "cs.CV", ["cs.CV", "cs.LG"], 20000, ["ai.ml.ssl"]),
    ("Masked Autoencoders Are Scalable Vision Learners", ["Kaiming He", "Xinlei Chen", "Saining Xie"], 2021, "CVPR", "2111.06377", "cs.CV", ["cs.CV"], 8000, ["ai.ml.ssl"]),
    ("Adam: A Method for Stochastic Optimization", ["Diederik Kingma", "Jimmy Ba"], 2014, "ICLR", "1412.6980", "cs.LG", ["cs.LG"], 180000, ["ai.ml.dl.optim"]),
    ("Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift", ["Sergey Ioffe", "Christian Szegedy"], 2015, "ICML", "1502.03167", "cs.LG", ["cs.LG"], 70000, ["ai.ml.dl.optim"]),
    ("Distilling the Knowledge in a Neural Network", ["Geoffrey Hinton", "Oriol Vinyals", "Jeff Dean"], 2015, "NeurIPS Workshop", "1503.02531", "stat.ML", ["stat.ML"], 30000, ["ai.ml.dl.eff"]),
    ("The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks", ["Jonathan Frankle", "Michael Carbin"], 2018, "ICLR", "1803.03635", "cs.LG", ["cs.LG"], 8000, ["ai.ml.dl.eff"]),
    ("LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale", ["Tim Dettmers", "Mike Lewis", "Younes Belkada"], 2022, "NeurIPS", "2208.07339", "cs.LG", ["cs.LG"], 2000, ["ai.ml.dl.eff"]),
    ("Proximal Policy Optimization Algorithms", ["John Schulman", "Filip Wolski", "Prafulla Dhariwal"], 2017, "arXiv", "1707.06347", "cs.LG", ["cs.LG"], 25000, ["ai.ml.rl.algo"]),
    ("Continuous control with deep reinforcement learning", ["Timothy Lillicrap", "Jonathan Hunt", "Alexander Pritzel"], 2015, "ICLR", "1509.02971", "cs.LG", ["cs.LG"], 20000, ["ai.ml.rl.algo"]),
    ("Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning with a Stochastic Actor", ["Tuomas Haarnoja", "Aurick Zhou", "Pieter Abbeel"], 2018, "ICML", "1801.01290", "cs.LG", ["cs.LG", "cs.AI"], 15000, ["ai.ml.rl.algo"]),
    ("Mastering Atari, Go, chess and shogi by planning with a learned model", ["Julian Schrittwieser", "Ioannis Antonoglou", "Thomas Hubert"], 2019, "Nature", "1911.08265", "cs.LG", ["cs.LG"], 3000, ["ai.ml.rl.algo"]),
    ("World Models", ["David Ha", "Jürgen Schmidhuber"], 2018, "NeurIPS", "1803.10122", "cs.LG", ["cs.LG", "cs.AI"], 4000, ["ai.ml.rl.algo"]),
    ("Semi-Supervised Classification with Graph Convolutional Networks", ["Thomas Kipf", "Max Welling"], 2016, "ICLR", "1609.02907", "cs.LG", ["cs.LG"], 30000, ["ai.ml.graph"]),
    ("Graph Attention Networks", ["Petar Veličković", "Guillem Cucurull", "Arantxa Casanova"], 2017, "ICLR", "1710.10903", "cs.LG", ["cs.LG"], 15000, ["ai.ml.graph"]),
    ("Communication-Efficient Learning of Deep Networks from Decentralized Data", ["H. Brendan McMahan", "Eider Moore", "Daniel Ramage"], 2016, "AISTATS", "1602.05629", "cs.LG", ["cs.LG"], 20000, ["ai.ml.fl"]),
    ("Constitutional AI: Harmlessness from AI Feedback", ["Yuntao Bai", "Saurav Kadavath", "Sandipan Kundu"], 2022, "arXiv", "2212.08073", "cs.CL", ["cs.CL"], 1500, ["ai.theory.align"]),
    ("Toy Models of Superposition", ["Chris Olah", "Nick Cammarata", "Chromium Lombardi"], 2022, "Anthropic", "2209.10652", "cs.LG", ["cs.LG"], 300, ["ai.theory.interp"]),
    ("Toolformer: Language Models Can Teach Themselves to Use Tools", ["Timo Schick", "Jane Dwivedi-Yu", "Roberto Dessì"], 2023, "NeurIPS", "2302.04761", "cs.CL", ["cs.CL"], 1500, ["ai.nlp.agent"]),
    ("ReAct: Synergizing Reasoning and Acting in Language Models", ["Shunyu Yao", "Jeffrey Zhao", "Dian Yu"], 2022, "ICLR", "2210.03629", "cs.CL", ["cs.CL"], 5000, ["ai.nlp.agent"]),
    ("Highly accurate protein structure prediction with AlphaFold", ["John Jumper", "Richard Evans", "Alexander Pritzel"], 2021, "Nature", None, "q-bio.BM", ["q-bio.BM"], 30000, ["ai.app"]),
    ("Highly accurate protein structure prediction for the human proteome", ["Kathryn Tunyasuvunakool", "Jonas Adler", "Zachary Wu"], 2021, "Nature", None, "q-bio.BM", [], 1500, ["ai.app"]),
    ("FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness", ["Tri Dao", "Daniel Fu", "Stefano Ermon"], 2022, "NeurIPS", "2205.14135", "cs.LG", ["cs.LG"], 2500, ["cs.mlsys", "ai.ml.dl.arch"]),
    ("Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism", ["Mohammad Shoeybi", "Mostofa Patwary", "Raul Puri"], 2019, "arXiv", "1909.08053", "cs.CL", ["cs.CL"], 3500, ["cs.mlsys"]),
    ("Efficient Memory Management for Large Language Model Serving with PagedAttention", ["Woosuk Kwon", "Zhuohan Li", "Siyuan Zhuang"], 2023, "SOSP", "2309.06180", "cs.LG", ["cs.LG", "cs.DC"], 2000, ["cs.mlsys"]),
    ("In Search of an Understandable Consensus Algorithm (Raft)", ["Diego Ongaro", "John Ousterhout"], 2013, "USENIX ATC", None, "cs.DC", ["cs.DC"], 5000, ["cs.systems.dist"]),
    ("Paxos Made Simple", ["Leslie Lamport"], 2001, "ACM SIGACT News", None, "cs.DC", [], 3000, ["cs.systems.dist"]),
    ("Bigtable: A Distributed Storage System for Structured Data", ["Fay Chang", "Jeffrey Dean", "Sanjay Ghemawat"], 2006, "OSDI", None, "cs.DB", ["cs.DB"], 10000, ["cs.systems.db"]),
    ("Spanner: Google's Globally-Distributed Database", ["James Corbett", "Jeffrey Dean", "Michael Epstein"], 2012, "OSDI", None, "cs.DB", ["cs.DB"], 5000, ["cs.systems.db"]),
    ("Large-scale cluster management at Google with Borg", ["Abhishek Verma", "Luis Pedrosa", "Manish Korupolu"], 2015, "EuroSys", None, "cs.DC", ["cs.DC"], 3000, ["cs.systems.dist"]),
    ("Learning Dexterous In-Hand Manipulation", ["OpenAI", "Marcin Andrychowicz", "Bowen Baker"], 2018, "IJRR", "1808.00177", "cs.RO", ["cs.RO", "cs.LG"], 2000, ["robotics.manip", "robotics.embodied"]),
    ("RT-1: Robotics Transformer for Real-World Control at Scale", ["Anthony Brohan", "Noah Brown", "Justice Carbajal"], 2022, "arXiv", "2212.06817", "cs.RO", ["cs.RO"], 2000, ["robotics.embodied"]),
    ("RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control", ["Anthony Brohan", "Noah Brown", "Justice Carbajal"], 2023, "arXiv", "2307.15818", "cs.RO", ["cs.RO"], 1500, ["robotics.embodied", "ai.cv.mm"]),
    ("PaLM-E: An Embodied Multimodal Language Model", ["Danny Driess", "Fei Xia", "Mehr Sajjadi"], 2023, "ICML", "2303.03378", "cs.RO", ["cs.RO", "cs.AI"], 1200, ["robotics.embodied", "ai.cv.mm"]),
    ("Do As I Can, Not As I Say: Grounding Language in Robotic Affordances", ["Michael Ahn", "Anthony Brohan", "Noah Brown"], 2022, "CoRL", "2204.01691", "cs.RO", ["cs.RO"], 1200, ["robotics.embodied"]),
    ("Diffusion Policy: Visuomotor Policy Learning via Action Diffusion", ["Cheng Chi", "Siyuan Feng", "Yilun Du"], 2023, "RSS", "2303.04137", "cs.RO", ["cs.RO"], 1500, ["robotics.embodied"]),
    ("ORB-SLAM2: an Open-Source SLAM System for Monocular, Stereo and RGB-D Cameras", ["Raul Mur-Artal", "Juan Tardos"], 2016, "IEEE T-RO", "1610.06475", "cs.RO", ["cs.RO"], 6000, ["robotics.loc"]),
]

_FIRST = ["Jia", "Wei", "Min", "Yuki", "Anna", "Lucas", "Pedro", "Sara", "Hassan", "Lena", "Ravi", "Chen", "Elena", "Omar"]
_LAST = ["Zhang", "Li", "Wang", "Tanaka", "Mueller", "Silva", "Novak", "Rossi", "Kim", "Patel", "Okafor", "Dubois"]
_TEMPLATES = [
    "{kw}: Advances and Open Challenges",
    "A Survey of {kw} Methods",
    "Improving {kw} with Scalable Training",
    "{kw} Revisited: Analysis and New Benchmarks",
    "Towards Efficient {kw} in Practice",
    "On the Theory of {kw}",
    "{kw} under Distribution Shift",
    "Rethinking {kw} for Real-World Deployment",
]
_ABSTRACT_TPL = (
    "Recent progress in {kw} has been rapid, yet important questions remain about scalability and robustness. "
    "We propose a systematic study of {kw}, introducing new techniques that improve accuracy and efficiency. "
    "Experiments on standard benchmarks demonstrate consistent gains over strong baselines. (demo filler record)"
)


def seed_landmarks(session) -> int:
    count = 0
    for title, authors, year, venue, arxiv_id, primary, cats, citations, nodes in LANDMARKS:
        row = {
            "title": title,
            "authors": authors,
            "year": year,
            "venue": venue,
            "arxiv_id": arxiv_id,
            "primary_cat": primary,
            "cats": cats,
            "citation_count": citations,
            "abstract": f"{title}. Landmark work in this research line. ({venue} {year})",
            "abs_url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None,
            "source": "seed",
        }
        paper, _ = upsert_paper(session, row)
        session.flush()
        assign_nodes(session, paper, NodeRules.load(session) if not nodes else NodeRules([]), override=nodes, milestone=True)
        count += 1
    session.commit()
    return count


def seed_filler(session, per_node: int = 8) -> int:
    rng = random.Random(42)
    nodes = list(session.scalars(select(Node)).all())
    count = 0
    for node in nodes:
        if node.is_fallback or not node.keywords:
            continue
        for i in range(per_node):
            kw = node.keywords[i % len(node.keywords)].replace("-", " ")
            template = _TEMPLATES[(node.sort + i) % len(_TEMPLATES)]
            title = template.format(kw=kw.title() if len(kw) > 3 else kw.upper())
            year = rng.randint(2015, 2026)
            row = {
                "title": f"{title} ({i})" if i else title,
                "authors": [f"{rng.choice(_FIRST)} {rng.choice(_LAST)}" for _ in range(rng.randint(1, 4))],
                "year": year,
                "venue": rng.choice(["arXiv", "NeurIPS", "ICML", "ICLR", "CVPR", "ICRA", "CoRL"]),
                "primary_cat": (node.arxiv_cats or [None])[0],
                "cats": node.arxiv_cats or [],
                "citation_count": max(0, rng.randint(0, 900) - (2026 - year) * 30),
                "abstract": _ABSTRACT_TPL.format(kw=kw),
                "source": "demo",
                "is_demo": True,
            }
            paper, _ = upsert_paper(session, row)
            session.flush()
            assign_nodes(session, paper, NodeRules([]), override=[node.id])
            count += 1
    session.commit()
    return count


def clean_demo(session) -> int:
    ids = session.scalars(select(Paper.id).where(Paper.is_demo.is_(True))).all()
    if ids:
        session.execute(delete(Paper).where(Paper.id.in_(ids)))
        session.commit()
    return len(ids)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed PaperGit database")
    parser.add_argument("--filler-per-node", type=int, default=8)
    parser.add_argument("--no-filler", action="store_true")
    parser.add_argument("--clean-demo", action="store_true")
    args = parser.parse_args()

    with SessionLocal() as session:
        if args.clean_demo:
            print(f"removed {clean_demo(session)} demo papers")
            return
        landmarks = seed_landmarks(session)
        print(f"seeded {landmarks} landmark papers")
        if not args.no_filler:
            filler = seed_filler(session, args.filler_per_node)
            print(f"seeded {filler} demo filler papers")


if __name__ == "__main__":
    main()
