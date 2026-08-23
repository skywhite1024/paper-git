from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Node, Paper, PaperNode
from .helpers import (
    aggregate_counts,
    ancestor_chain,
    build_index,
    direct_paper_counts,
    load_links,
    node_dict,
    paper_dict,
    recent_cutoff,
    subtree_ids,
)

router = APIRouter(prefix="/nodes", tags=["nodes"])


def _get_node(session: Session, node_id: str) -> Node:
    node = session.get(Node, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail=f"node '{node_id}' not found")
    return node


@router.get("", description="整棵领域树（含子树聚合计数），供前端导航")
def get_tree(db: Session = Depends(get_db)):
    index = build_index(db)
    counts = aggregate_counts(index, direct_paper_counts(db))

    def build(nid: str) -> dict:
        node = index[nid]
        children = sorted(
            [c for c in index.values() if c.parent_id == nid], key=lambda n: (n.sort, n.id)
        )
        d = node_dict(node, paper_count=counts.get(nid, 0))
        d["children"] = [build(c.id) for c in children]
        return d

    roots = sorted([n for n in index.values() if n.parent_id is None], key=lambda n: (n.sort, n.id))
    return {"roots": [build(r.id) for r in roots]}


@router.get("/{node_id}")
def get_node_detail(node_id: str, db: Session = Depends(get_db)):
    index = build_index(db)
    node = _get_node(db, node_id)
    ids = subtree_ids(index, node_id)
    counts = aggregate_counts(index, direct_paper_counts(db))

    milestones = db.scalars(
        select(Paper)
        .join(PaperNode, PaperNode.paper_id == Paper.id)
        .where(PaperNode.node_id.in_(ids), PaperNode.is_milestone.is_(True))
        .order_by(Paper.citation_count.desc())
        .limit(10)
    ).all()
    links = load_links(db, [p.id for p in milestones])

    years = db.scalars(
        select(Paper.year)
        .join(PaperNode, PaperNode.paper_id == Paper.id)
        .where(PaperNode.node_id.in_(ids), Paper.year.is_not(None))
        .distinct()
    ).all()

    children = sorted([n for n in index.values() if n.parent_id == node_id], key=lambda n: (n.sort, n.id))

    return {
        **node_dict(node, paper_count=counts.get(node_id, 0)),
        "ancestors": ancestor_chain(index, node_id),
        "children": [node_dict(c, paper_count=counts.get(c.id, 0)) for c in children],
        "stats": {
            "paper_count": counts.get(node_id, 0),
            "year_min": min(years) if years else None,
            "year_max": max(years) if years else None,
            "milestone_count": len(milestones),
        },
        "milestones": [paper_dict(p, links.get(p.id), index) for p in milestones],
    }


@router.get("/{node_id}/papers")
def get_node_papers(
    node_id: str,
    db: Session = Depends(get_db),
    sort: str = Query("new", pattern="^(new|citations|year)$"),
    year: int | None = None,
    q: str | None = None,
    milestone: bool = False,
    include_demo: bool = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    index = build_index(db)
    _get_node(db, node_id)
    ids = subtree_ids(index, node_id)

    sq = select(PaperNode.paper_id).where(PaperNode.node_id.in_(ids)).distinct().subquery()
    query = select(Paper).join(sq, Paper.id == sq.c.paper_id)
    if year is not None:
        query = query.where(Paper.year == year)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(or_(func.lower(Paper.title).like(like), func.lower(Paper.abstract).like(like)))
    if milestone:
        msq = select(PaperNode.paper_id).where(
            PaperNode.node_id.in_(ids), PaperNode.is_milestone.is_(True)
        ).subquery()
        query = query.join(msq, Paper.id == msq.c.paper_id)
    if not include_demo:
        query = query.where(Paper.is_demo.is_(False))

    if sort == "citations":
        query = query.order_by(Paper.citation_count.desc(), Paper.year.desc())
    elif sort == "year":
        query = query.order_by(Paper.year.desc(), Paper.citation_count.desc())
    else:
        query = query.order_by(Paper.published.desc().nullslast(), Paper.id.desc())

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    papers = db.scalars(query.offset((page - 1) * per_page).limit(per_page)).all()
    links = load_links(db, [p.id for p in papers])
    years_rows = db.execute(
        select(Paper.year, func.count())
        .join(PaperNode, PaperNode.paper_id == Paper.id)
        .where(PaperNode.node_id.in_(ids))
        .group_by(Paper.year)
        .order_by(Paper.year.desc())
    ).all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "years": [{"year": y, "count": c} for y, c in years_rows if y is not None],
        "items": [paper_dict(p, links.get(p.id), index) for p in papers],
    }


@router.get("/{node_id}/timeline")
def get_node_timeline(node_id: str, db: Session = Depends(get_db), per_year: int = Query(6, ge=1, le=30)):
    index = build_index(db)
    _get_node(db, node_id)
    ids = subtree_ids(index, node_id)

    papers = db.scalars(
        select(Paper)
        .join(PaperNode, PaperNode.paper_id == Paper.id)
        .where(PaperNode.node_id.in_(ids))
        .order_by(Paper.year.desc(), Paper.citation_count.desc())
        .limit(4000)
    ).all()
    links = load_links(db, [p.id for p in papers])

    by_year: dict[int, dict] = {}
    for p in papers:
        if p.year is None:
            continue
        bucket = by_year.setdefault(p.year, {"year": p.year, "count": 0, "papers": []})
        bucket["count"] += 1
        shown = bucket["papers"]
        is_ms = any(l.is_milestone for l in links.get(p.id, []))
        if len(shown) < per_year or is_ms:
            if len(shown) < per_year + 8:
                shown.append(paper_dict(p, links.get(p.id), index))
    return {"years": sorted(by_year.values(), key=lambda b: b["year"], reverse=True)}


@router.get("/{node_id}/trends")
def get_node_trends(node_id: str, db: Session = Depends(get_db)):
    index = build_index(db)
    _get_node(db, node_id)
    ids = subtree_ids(index, node_id)
    rows = db.execute(
        select(Paper.year, func.count())
        .join(PaperNode, PaperNode.paper_id == Paper.id)
        .where(PaperNode.node_id.in_(ids))
        .group_by(Paper.year)
        .order_by(Paper.year.asc())
    ).all()
    return {"node_id": node_id, "data": [{"year": y, "count": c} for y, c in rows if y is not None]}


@router.get("/{node_id}/feed")
def get_node_feed(node_id: str, db: Session = Depends(get_db), days: int = Query(30, ge=1, le=365), limit: int = Query(30, ge=1, le=100)):
    index = build_index(db)
    _get_node(db, node_id)
    ids = subtree_ids(index, node_id)
    cutoff = recent_cutoff(days)
    papers = db.scalars(
        select(Paper)
        .join(PaperNode, PaperNode.paper_id == Paper.id)
        .where(PaperNode.node_id.in_(ids), Paper.published.is_not(None), Paper.published >= cutoff)
        .order_by(Paper.published.desc())
        .limit(limit)
    ).all()
    links = load_links(db, [p.id for p in papers])
    return {"node_id": node_id, "items": [paper_dict(p, links.get(p.id), index) for p in papers]}
