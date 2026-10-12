"""API 层共用工具：子树计算、计数聚合、论文序列化。"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..models import Node, Paper, PaperNode


def build_index(session: Session) -> dict[str, Node]:
    return {n.id: n for n in session.scalars(select(Node)).all()}


def subtree_ids(index: dict[str, Node], root_id: str) -> list[str]:
    children_of: dict[str | None, list[str]] = {}
    for nid, node in index.items():
        children_of.setdefault(node.parent_id, []).append(nid)
    out: list[str] = []
    stack = [root_id]
    while stack:
        cur = stack.pop()
        out.append(cur)
        stack.extend(children_of.get(cur, []))
    return out


def direct_paper_sets(session: Session) -> dict[str, set[int]]:
    rows = session.execute(select(PaperNode.node_id, PaperNode.paper_id)).all()
    out: dict[str, set[int]] = {}
    for node_id, paper_id in rows:
        out.setdefault(node_id, set()).add(paper_id)
    return out


def subtree_paper_counts(session: Session, index: dict[str, Node]) -> dict[str, int]:
    """Distinct paper count per node, including its whole subtree.

    Summing the children's own counts would double-count a paper attached to two
    siblings, so the union is taken over paper ids instead.
    """
    direct = direct_paper_sets(session)
    children_of: dict[str | None, list[str]] = {}
    for nid, node in index.items():
        children_of.setdefault(node.parent_id, []).append(nid)

    memo: dict[str, set[int]] = {}

    def union(nid: str) -> set[int]:
        cached = memo.get(nid)
        if cached is not None:
            return cached
        acc = set(direct.get(nid, ()))
        for child in children_of.get(nid, []):
            acc |= union(child)
        memo[nid] = acc
        return acc

    return {nid: len(union(nid)) for nid in index}


def ancestor_chain(index: dict[str, Node], node_id: str) -> list[dict]:
    chain = []
    cur = index.get(node_id)
    while cur is not None:
        chain.append(node_dict(cur))
        cur = index.get(cur.parent_id) if cur.parent_id else None
    return list(reversed(chain))


def node_dict(node: Node, paper_count: int | None = None) -> dict:
    d = {
        "id": node.id,
        "parent_id": node.parent_id,
        "name_en": node.name_en,
        "name_zh": node.name_zh,
        "description": node.description,
        "keywords": node.keywords or [],
        "arxiv_cats": node.arxiv_cats or [],
        "level": node.level,
        "is_fallback": node.is_fallback,
    }
    if paper_count is not None:
        d["paper_count"] = paper_count
    return d


def paper_dict(paper: Paper, links: list[PaperNode] | None = None, index: dict[str, Node] | None = None) -> dict:
    links = links if links is not None else paper.links
    nodes = []
    milestone = False
    for link in links:
        if index is not None and link.node_id in index:
            n = index[link.node_id]
            nodes.append({"id": n.id, "name_zh": n.name_zh, "name_en": n.name_en})
        if link.is_milestone:
            milestone = True
    authors = paper.authors or []
    return {
        "id": paper.id,
        "title": paper.title,
        "authors": authors[:4] + (["..."] if len(authors) > 4 else []),
        "year": paper.year,
        "venue": paper.venue,
        "citation_count": paper.citation_count,
        "arxiv_id": paper.arxiv_id,
        "abs_url": paper.abs_url,
        "pdf_url": paper.pdf_url,
        "code_url": paper.code_url,
        "is_demo": paper.is_demo,
        "source": paper.source,
        "published": paper.published.isoformat() if paper.published else None,
        "is_milestone": milestone,
        "nodes": nodes,
    }


def load_links(session: Session, paper_ids: list[int]) -> dict[int, list[PaperNode]]:
    if not paper_ids:
        return {}
    links = session.scalars(
        select(PaperNode).where(PaperNode.paper_id.in_(paper_ids)).options(selectinload(PaperNode.node))
    ).all()
    out: dict[int, list[PaperNode]] = {}
    for link in links:
        out.setdefault(link.paper_id, []).append(link)
    return out


def recent_cutoff(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)
