"""规则分类器：arXiv 分类映射 + 关键词打分，把论文挂载到领域树节点。

打分规则（可调）：
  主分类命中节点 arxiv_cats   +3
  次分类命中                 +2
  关键词命中标题             +2/个（上限 6）
  关键词命中摘要             +0.5/个（上限 2）
挂载阈值 >= ASSIGN_THRESHOLD，最多挂 TOP_K 个节点；
无节点达标时按主分类回退到根节点（fallback roots）。
"""

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Node, Paper, PaperNode

ASSIGN_THRESHOLD = 3.0
TOP_K = 3
TITLE_KEYWORD_CAP = 6.0
ABSTRACT_KEYWORD_CAP = 2.0

AI_CATS = {"cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.SD", "cs.NE", "cs.MA", "cs.IR", "stat.ML", "eess.AS"}
ROBOTICS_CATS = {"cs.RO", "cs.SY", "eess.SY"}


def fallback_node_for_cat(primary_cat: str | None) -> str | None:
    if not primary_cat:
        return None
    if primary_cat in AI_CATS:
        return "ai"
    if primary_cat in ROBOTICS_CATS:
        return "robotics"
    if primary_cat.startswith(("cs.", "math.", "stat.", "quant-", "q-")) or primary_cat == "cs":
        return "cs"
    return None


@dataclass
class NodeRules:
    nodes: list[Node] = field(default_factory=list)

    @classmethod
    def load(cls, session: Session) -> "NodeRules":
        return cls(nodes=list(session.scalars(select(Node)).all()))

    def score_paper(self, paper: Paper) -> list[tuple[str, float]]:
        title = (paper.title or "").lower()
        abstract = (paper.abstract or "").lower()
        primary = paper.primary_cat
        cats = set(paper.cats or [])

        scored: list[tuple[str, float]] = []
        for node in self.nodes:
            if node.is_fallback:
                continue
            score = 0.0
            if primary and primary in (node.arxiv_cats or []):
                score += 3.0
            elif cats & set(node.arxiv_cats or []):
                score += 2.0
            title_bonus = 0.0
            abstract_bonus = 0.0
            for kw in node.keywords or []:
                k = kw.lower()
                if k in title:
                    title_bonus += 2.0
                elif k in abstract:
                    abstract_bonus += 0.5
            score += min(title_bonus, TITLE_KEYWORD_CAP) + min(abstract_bonus, ABSTRACT_KEYWORD_CAP)
            if score >= ASSIGN_THRESHOLD:
                scored.append((node.id, round(score, 2)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:TOP_K]


def assign_nodes(
    session: Session,
    paper: Paper,
    rules: NodeRules,
    override: list[str] | None = None,
    milestone: bool = False,
) -> list[str]:
    """把论文挂载到节点（含 override 显式指定 / 规则打分 / fallback）。"""
    targets: list[tuple[str, str, float]] = []
    if override:
        targets = [(nid, "manual", 99.0) for nid in override]
    else:
        scored = rules.score_paper(paper)
        if scored:
            targets = [(nid, "rule", sc) for nid, sc in scored]
        else:
            fb = fallback_node_for_cat(paper.primary_cat)
            if fb:
                targets = [(fb, "fallback", 0.0)]

    existing = {link.node_id for link in paper.links}
    for node_id, reason, score in targets:
        if node_id in existing:
            continue
        link = PaperNode(paper_id=paper.id, node_id=node_id, assign_reason=reason, score=score)
        if milestone:
            link.is_milestone = True
        session.add(link)
    return [t[0] for t in targets]
