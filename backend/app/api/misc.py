from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Node, Paper, PaperNode
from .helpers import (
    build_index,
    load_links,
    node_dict,
    paper_dict,
    recent_cutoff,
    subtree_paper_counts,
)

router = APIRouter(tags=["misc"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    index = build_index(db)
    counts = subtree_paper_counts(db, index)
    total = db.scalar(select(func.count()).select_from(Paper)) or 0
    demo = db.scalar(select(func.count()).select_from(Paper).where(Paper.is_demo.is_(True))) or 0
    real = total - demo
    cutoff7 = recent_cutoff(7)
    recent = (
        db.scalar(
            select(func.count()).select_from(Paper).where(Paper.published.is_not(None), Paper.published >= cutoff7)
        )
        or 0
    )
    roots = sorted([n for n in index.values() if n.parent_id is None], key=lambda n: (n.sort, n.id))

    cutoff30 = recent_cutoff(30)
    hot_rows = db.execute(
        select(PaperNode.node_id, func.count())
        .join(Paper, Paper.id == PaperNode.paper_id)
        .where(Paper.published.is_not(None), Paper.published >= cutoff30)
        .group_by(PaperNode.node_id)
        .order_by(func.count().desc())
        .limit(20)
    ).all()
    hot_ids = {nid for nid, _ in hot_rows}
    if not hot_ids:
        hot_ids = set(sorted(counts, key=lambda k: counts[k], reverse=True)[:10])
    hot = [
        node_dict(index[nid], paper_count=counts.get(nid, 0))
        for nid in hot_ids
        if nid in index and not index[nid].is_fallback
    ]
    hot.sort(key=lambda n: -n["paper_count"])
    newest = db.scalar(select(func.max(Paper.published)))
    return {
        "paper_total": total,
        "paper_real": real,
        "paper_demo": demo,
        "node_total": len(index),
        "recent_7d": recent,
        "newest_published": newest.isoformat() if newest else None,
        "domains": [node_dict(r, paper_count=counts.get(r.id, 0)) for r in roots],
        "hot_nodes": hot[:8],
    }


@router.get("/feed")
def get_global_feed(db: Session = Depends(get_db), days: int = Query(14, ge=1, le=120), limit: int = Query(30, ge=1, le=100)):
    cutoff = recent_cutoff(days)
    papers = db.scalars(
        select(Paper)
        .where(Paper.published.is_not(None), Paper.published >= cutoff)
        .order_by(Paper.published.desc())
        .limit(limit)
    ).all()
    if not papers:
        papers = db.scalars(select(Paper).order_by(Paper.created_at.desc()).limit(limit)).all()
    index = build_index(db)
    links = load_links(db, [p.id for p in papers])
    return {"items": [paper_dict(p, links.get(p.id), index) for p in papers]}


@router.get("/search")
def search(q: str = Query(min_length=2), db: Session = Depends(get_db), limit: int = Query(30, ge=1, le=100)):
    like = f"%{q.lower()}%"
    papers = db.scalars(
        select(Paper)
        .where(or_(func.lower(Paper.title).like(like), func.lower(Paper.abstract).like(like)))
        .order_by(Paper.citation_count.desc(), Paper.year.desc())
        .limit(limit)
    ).all()
    index = build_index(db)
    links = load_links(db, [p.id for p in papers])

    ql = q.lower()
    matched_nodes = [
        n
        for n in index.values()
        if ql in n.name_en.lower() or ql in n.name_zh.lower() or any(ql in k.lower() for k in (n.keywords or []))
    ]
    return {
        "query": q,
        "papers": [paper_dict(p, links.get(p.id), index) for p in papers],
        "nodes": [node_dict(n) for n in matched_nodes[:10]],
    }
