from sqlalchemy import select

from app.models import Node
from app.taxonomy_loader import load_taxonomy


def test_taxonomy_size(db):
    nodes = list(db.scalars(select(Node)).all())
    assert len(nodes) >= 60, f"expected >=60 nodes, got {len(nodes)}"


def test_taxonomy_hierarchy(db):
    nodes = {n.id: n for n in db.scalars(select(Node)).all()}
    roots = [n for n in nodes.values() if n.parent_id is None]
    assert {r.id for r in roots} == {"ai", "cs", "robotics"}
    for node in nodes.values():
        assert node.id.count(".") == node.level, f"level mismatch for {node.id}"
        if node.parent_id:
            assert node.parent_id in nodes, f"dangling parent for {node.id}"
            assert node.id.startswith(node.parent_id + ".")


def test_taxonomy_content_quality(db):
    nodes = list(db.scalars(select(Node)).all())
    assert all(n.name_en and n.name_zh for n in nodes)
    leaf_with_rules = [n for n in nodes if not n.is_fallback]
    assert len(leaf_with_rules) >= 55
    assert all(n.keywords for n in leaf_with_rules), "every non-fallback node needs keywords"
    cats = {c for n in nodes for c in (n.arxiv_cats or [])}
    assert {"cs.AI", "cs.RO", "cs.CL"} <= cats


def test_taxonomy_idempotent(db):
    before = len(list(db.scalars(select(Node)).all()))
    load_taxonomy()
    after = len(list(db.scalars(select(Node)).all()))
    assert before == after
