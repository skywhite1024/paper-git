"""论文去重与 upsert：按 arXiv ID -> DOI -> 标题+年份 三级归并。"""

import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Paper

_VERSION_SUFFIX = re.compile(r"v\d+$")


def normalize_arxiv_id(raw: str | None) -> str | None:
    if not raw:
        return None
    arxiv_id = raw.strip()
    arxiv_id = arxiv_id.rsplit("/abs/", 1)[-1]
    arxiv_id = _VERSION_SUFFIX.sub("", arxiv_id)
    return arxiv_id.lower() or None


def normalize_doi(raw: str | None) -> str | None:
    if not raw:
        return None
    doi = raw.strip().lower()
    if doi.startswith("https://doi.org/"):
        doi = doi[len("https://doi.org/"):]
    if doi.startswith("http://doi.org/"):
        doi = doi[len("http://doi.org/"):]
    return doi or None


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def _parse_date(value) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def upsert_paper(session: Session, row: dict) -> tuple[Paper, bool]:
    """按归并键查找并更新/新建论文，返回 (paper, created)。"""
    arxiv_id = normalize_arxiv_id(row.get("arxiv_id"))
    doi = normalize_doi(row.get("doi"))
    title = row.get("title") or ""
    year = row.get("year")

    paper = None
    if arxiv_id:
        paper = session.scalar(select(Paper).where(Paper.arxiv_id == arxiv_id))
    if paper is None and doi:
        paper = session.scalar(select(Paper).where(Paper.doi == doi))
    if paper is None and title and year:
        paper = session.scalar(
            select(Paper).where(Paper.title == title, Paper.year == year)
        )

    fields = {
        "arxiv_id": arxiv_id,
        "doi": doi,
        "title": title,
        "abstract": row.get("abstract") or "",
        "authors": row.get("authors") or [],
        "year": year,
        "venue": row.get("venue"),
        "citation_count": row.get("citation_count", 0) or 0,
        "pdf_url": row.get("pdf_url"),
        "abs_url": row.get("abs_url"),
        "code_url": row.get("code_url"),
        "primary_cat": row.get("primary_cat"),
        "cats": row.get("cats") or [],
        "source": row.get("source", "arxiv"),
        "is_demo": row.get("is_demo", False),
        "published": _parse_date(row.get("published")),
    }

    if paper is None:
        paper = Paper(**fields)
        session.add(paper)
        created = True
    else:
        # 只用新值覆盖非空字段，避免回填时互相抹掉
        for key, value in fields.items():
            if value not in (None, "", [], 0) or key in ("is_demo",):
                    setattr(paper, key, value)
        created = False
    session.flush()
    return paper, created
