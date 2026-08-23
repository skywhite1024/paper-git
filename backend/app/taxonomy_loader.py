"""把 taxonomy/taxonomy.yaml 同步进数据库（只增改不删，删除需人工处理）。"""

import sys

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import TAXONOMY_PATH
from .database import Base, SessionLocal, engine
from .models import Node


def _flatten(entries: list[dict], parent_id: str | None, level: int, out: list[dict]) -> None:
    for sort, entry in enumerate(entries):
        node = {
            "id": entry["id"],
            "parent_id": parent_id,
            "name_en": entry["name_en"],
            "name_zh": entry["name_zh"],
            "description": entry.get("description", ""),
            "keywords": entry.get("keywords", []),
            "arxiv_cats": entry.get("arxiv_cats", []),
            "level": level,
            "sort": sort,
            "is_fallback": bool(entry.get("fallback", False)),
        }
        out.append(node)
        _flatten(entry.get("children", []), entry["id"], level + 1, out)


def load_taxonomy(path=None) -> int:
    path = path or TAXONOMY_PATH
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    flat: list[dict] = []
    _flatten(data.get("nodes", []), None, 0, flat)

    with SessionLocal() as session:
        existing = {n.id: n for n in session.scalars(select(Node)).all()}
        for node in flat:
            row = existing.get(node["id"])
            if row is None:
                session.add(Node(**node))
            else:
                for key, value in node.items():
                    setattr(row, key, value)
        session.commit()
    return len(flat)


def init_db() -> None:
    Base.metadata.create_all(engine)


def sync() -> None:
    init_db()
    count = load_taxonomy()
    print(f"taxonomy synced: {count} nodes from {TAXONOMY_PATH}")


if __name__ == "__main__":
    sys.exit(sync())
