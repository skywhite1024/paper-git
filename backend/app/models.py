from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Node(Base):
    """领域树节点。id 即层级路径，如 ai.ml.dl.arch。"""

    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("nodes.id"), index=True)
    name_en: Mapped[str] = mapped_column(String(200))
    name_zh: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    arxiv_cats: Mapped[list] = mapped_column(JSON, default=list)
    level: Mapped[int] = mapped_column(Integer, default=0)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False)


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    arxiv_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    doi: Mapped[str | None] = mapped_column(String(256), unique=True, index=True)
    title: Mapped[str] = mapped_column(Text, index=True)
    abstract: Mapped[str] = mapped_column(Text, default="")
    authors: Mapped[list] = mapped_column(JSON, default=list)
    year: Mapped[int] = mapped_column(Integer, index=True)
    venue: Mapped[str | None] = mapped_column(String(300))
    citation_count: Mapped[int] = mapped_column(Integer, default=0)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    abs_url: Mapped[str | None] = mapped_column(Text)
    code_url: Mapped[str | None] = mapped_column(Text)
    primary_cat: Mapped[str | None] = mapped_column(String(64), index=True)
    cats: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(32), default="arxiv")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    links: Mapped[list["PaperNode"]] = relationship(
        back_populates="paper", cascade="all, delete-orphan"
    )


class PaperNode(Base):
    __tablename__ = "paper_node"
    __table_args__ = (UniqueConstraint("paper_id", "node_id", name="uq_paper_node"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id"), index=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), index=True)
    assign_reason: Mapped[str] = mapped_column(String(32), default="rule")
    score: Mapped[float] = mapped_column(Float, default=0.0)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    paper: Mapped[Paper] = relationship(back_populates="links")
    node: Mapped[Node] = relationship()


class Watch(Base):
    __tablename__ = "watches"
    __table_args__ = (UniqueConstraint("user", "node_id", name="uq_user_node"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user: Mapped[str] = mapped_column(String(64), default="local", index=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
