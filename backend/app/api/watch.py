from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Node, Paper, PaperNode, Watch
from .helpers import build_index, load_links, node_dict, paper_dict, recent_cutoff

router = APIRouter(prefix="/watch", tags=["watch"])


def _user(x_user: str | None = Header(default=None)) -> str:
    return x_user or "local"


def _watched_nodes(session: Session, user: str) -> list[Node]:
    node_ids = session.scalars(select(Watch.node_id).where(Watch.user == user)).all()
    nodes = [session.get(Node, nid) for nid in node_ids]
    return [n for n in nodes if n is not None]


@router.get("")
def list_watch(db: Session = Depends(get_db), user: str = Depends(_user)):
    index = build_index(db)
    nodes = _watched_nodes(db, user)
    return {"user": user, "nodes": [node_dict(n) for n in nodes]}


class WatchPayload(BaseModel):
    node_id: str


@router.post("")
def add_watch(payload: WatchPayload, db: Session = Depends(get_db), user: str = Depends(_user)):
    if db.get(Node, payload.node_id) is None:
        raise HTTPException(status_code=404, detail=f"node '{payload.node_id}' not found")
    exists = db.scalar(select(Watch).where(Watch.user == user, Watch.node_id == payload.node_id))
    if exists is None:
        db.add(Watch(user=user, node_id=payload.node_id))
        db.commit()
    return {"user": user, "node_id": payload.node_id, "watching": True}


@router.delete("/{node_id}")
def remove_watch(node_id: str, db: Session = Depends(get_db), user: str = Depends(_user)):
    row = db.scalar(select(Watch).where(Watch.user == user, Watch.node_id == node_id))
    if row is not None:
        db.delete(row)
        db.commit()
    return {"user": user, "node_id": node_id, "watching": False}


@router.get("/digest")
def watch_digest(db: Session = Depends(get_db), user: str = Depends(_user), days: int = 14):
    from .helpers import subtree_ids

    index = build_index(db)
    nodes = _watched_nodes(db, user)
    cutoff = recent_cutoff(days)
    sections = []
    for node in nodes:
        ids = subtree_ids(index, node.id)
        papers = db.scalars(
            select(Paper)
            .join(PaperNode, PaperNode.paper_id == Paper.id)
            .where(PaperNode.node_id.in_(ids), Paper.published.is_not(None), Paper.published >= cutoff)
            .order_by(Paper.published.desc())
            .limit(10)
        ).all()
        if not papers:
            papers = db.scalars(
                select(Paper)
                .join(PaperNode, PaperNode.paper_id == Paper.id)
                .where(PaperNode.node_id.in_(ids))
                .order_by(Paper.year.desc(), Paper.citation_count.desc())
                .limit(5)
            ).all()
        links = load_links(db, [p.id for p in papers])
        sections.append(
            {"node": node_dict(node), "items": [paper_dict(p, links.get(p.id), index) for p in papers]}
        )
    return {"user": user, "days": days, "sections": sections}
