from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Paper, PaperNode
from .helpers import build_index, load_links, paper_dict

router = APIRouter(tags=["papers"])


@router.get("/papers/{paper_id}")
def get_paper_detail(paper_id: int, db: Session = Depends(get_db)):
    paper = db.get(Paper, paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail=f"paper {paper_id} not found")
    index = build_index(db)
    links = db.scalars(
        select(PaperNode).where(PaperNode.paper_id == paper_id).options(selectinload(PaperNode.node))
    ).all()
    d = paper_dict(paper, links, index)
    d["abstract"] = paper.abstract

    related_ids = {l.node_id for l in links}
    related: list[Paper] = []
    if related_ids:
        subq = (
            select(PaperNode.paper_id)
            .where(PaperNode.node_id.in_(related_ids), PaperNode.paper_id != paper_id)
            .distinct()
            .subquery()
        )
        related = db.scalars(
            select(Paper)
            .join(subq, Paper.id == subq.c.paper_id)
            .order_by(Paper.citation_count.desc())
            .limit(8)
        ).all()
    rlinks = load_links(db, [p.id for p in related])
    d["related"] = [paper_dict(p, rlinks.get(p.id), index) for p in related]
    return d


class MilestoneToggle(BaseModel):
    paper_id: int
    node_id: str
    is_milestone: bool = True


@router.post("/admin/milestone", tags=["admin"])
def toggle_milestone(payload: MilestoneToggle, db: Session = Depends(get_db)):
    link = db.scalar(
        select(PaperNode).where(PaperNode.paper_id == payload.paper_id, PaperNode.node_id == payload.node_id)
    )
    if link is None:
        raise HTTPException(status_code=404, detail="paper is not attached to this node")
    link.is_milestone = payload.is_milestone
    db.commit()
    return {"paper_id": payload.paper_id, "node_id": payload.node_id, "is_milestone": link.is_milestone}
