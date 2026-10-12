import pytest


@pytest.fixture(scope="module")
def seeded(client):
    from app.database import SessionLocal
    from app.ingest.seed import seed_filler, seed_landmarks

    with SessionLocal() as session:
        n1 = seed_landmarks(session)
        n2 = seed_filler(session, per_node=3)
    return {"landmarks": n1, "filler": n2}


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200 and resp.json()["status"] == "ok"


def test_tree(client, seeded):
    data = client.get("/api/nodes").json()
    roots = data["roots"]
    assert {r["id"] for r in roots} == {"ai", "cs", "robotics"}
    assert all(r["paper_count"] > 0 for r in roots)
    ai = next(r for r in roots if r["id"] == "ai")
    assert any(c["id"] == "ai.ml" for c in ai["children"])
    total_leaf = sum(c["paper_count"] for c in ai["children"])
    # A paper may sit under two siblings, so the parent's distinct count is at most the sum.
    assert total_leaf >= ai["paper_count"]
    assert ai["paper_count"] >= max(c["paper_count"] for c in ai["children"])


def test_subtree_count_ignores_duplicate_membership(client, seeded):
    """Attaching a paper to a sibling it already shares an ancestor with must not inflate counts."""
    from sqlalchemy import delete, select

    from app.database import SessionLocal
    from app.models import Node, Paper, PaperNode

    with SessionLocal() as session:
        parent_id = session.scalar(select(Node.parent_id).where(Node.parent_id.is_not(None)).limit(1))
        kids = session.scalars(select(Node.id).where(Node.parent_id == parent_id)).all()
        assert len(kids) >= 2, "need two siblings to exercise cross-sibling dedupe"
        a, b = kids[0], kids[1]
        paper_id = session.scalar(
            select(PaperNode.paper_id)
            .where(PaperNode.node_id == a)
            .where(PaperNode.paper_id.in_(select(Paper.id)))
            .limit(1)
        )
        session.execute(delete(PaperNode).where(PaperNode.paper_id == paper_id, PaperNode.node_id == b))
        session.commit()

    before = client.get(f"/api/nodes/{parent_id}").json()["stats"]["paper_count"]

    with SessionLocal() as session:
        session.add(PaperNode(paper_id=paper_id, node_id=b))
        session.commit()
    try:
        after = client.get(f"/api/nodes/{parent_id}").json()["stats"]["paper_count"]
        assert after == before, "parent count grew for an already-counted paper"
        sibling = client.get(f"/api/nodes/{b}").json()["stats"]["paper_count"]
        assert sibling > 0
    finally:
        with SessionLocal() as session:
            session.execute(delete(PaperNode).where(PaperNode.paper_id == paper_id, PaperNode.node_id == b))
            session.commit()


def test_node_detail(client, seeded):
    data = client.get("/api/nodes/ai.ml.dl.arch").json()
    assert data["paper_count"] >= 2
    assert data["stats"]["milestone_count"] >= 1
    assert data["ancestors"][0]["id"] == "ai"
    assert [a["id"] for a in data["ancestors"]] == ["ai", "ai.ml", "ai.ml.dl", "ai.ml.dl.arch"]
    assert any(m["title"].startswith("Attention Is All You Need") for m in data["milestones"])


def test_node_papers_filters(client, seeded):
    data = client.get("/api/nodes/ai.ml.dl.arch/papers?sort=citations").json()
    assert data["total"] >= 2
    titles = [p["title"] for p in data["items"]]
    assert any("Residual" in t for t in titles)
    citations = [p["citation_count"] for p in data["items"]]
    assert citations == sorted(citations, reverse=True)

    data2 = client.get("/api/nodes/ai.ml.dl.arch/papers?q=transformer&sort=citations").json()
    assert data2["total"] >= 1

    years = {y["year"] for y in data["years"]}
    assert years


def test_timeline_and_trends(client, seeded):
    tl = client.get("/api/nodes/ai.ml.rl.algo/timeline").json()
    assert tl["years"], "timeline should not be empty"
    assert tl["years"][0]["year"] >= tl["years"][-1]["year"]
    ms_years = [b for b in tl["years"] if any(p["is_milestone"] for p in b["papers"])]
    assert ms_years, "PPO milestone should appear in RL timeline"

    tr = client.get("/api/nodes/ai.ml.rl.algo/trends").json()
    assert tr["data"]
    assert tr["data"][0]["year"] <= tr["data"][-1]["year"]


def test_paper_detail_and_related(client, seeded):
    listing = client.get("/api/nodes/ai.nlp.llm/papers?sort=citations").json()
    pid = listing["items"][0]["id"]
    detail = client.get(f"/api/papers/{pid}").json()
    assert detail["abstract"]
    assert detail["nodes"]
    assert detail["is_milestone"] is True
    assert isinstance(detail["related"], list)

    resp = client.get("/api/papers/999999")
    assert resp.status_code == 404


def test_search(client, seeded):
    data = client.get("/api/search", params={"q": "transformer"}).json()
    assert data["papers"]
    assert any(n["id"] == "ai.ml.dl.arch" for n in data["nodes"])


def test_stats_and_feed(client, seeded):
    stats = client.get("/api/stats").json()
    assert stats["paper_total"] >= 60
    assert len(stats["domains"]) == 3
    assert stats["recent_7d"] >= 0

    feed = client.get("/api/feed").json()
    assert feed["items"]


def test_watch_flow(client, seeded):
    resp = client.post("/api/watch", json={"node_id": "ai.nlp.llm"})
    assert resp.json()["watching"] is True

    listing = client.get("/api/watch").json()
    assert any(n["id"] == "ai.nlp.llm" for n in listing["nodes"])

    digest = client.get("/api/watch/digest").json()
    assert any(s["node"]["id"] == "ai.nlp.llm" and s["items"] for s in digest["sections"])

    resp = client.delete("/api/watch/ai.nlp.llm")
    assert resp.json()["watching"] is False
    listing = client.get("/api/watch").json()
    assert not any(n["id"] == "ai.nlp.llm" for n in listing["nodes"])


def test_milestone_toggle(client, seeded):
    listing = client.get("/api/nodes/ai.cv.det/papers?milestone=true").json()
    assert listing["total"] >= 1
    pid = listing["items"][0]["id"]
    off = client.post("/api/admin/milestone", json={"paper_id": pid, "node_id": "ai.cv.det", "is_milestone": False}).json()
    assert off["is_milestone"] is False
    on = client.post("/api/admin/milestone", json={"paper_id": pid, "node_id": "ai.cv.det", "is_milestone": True}).json()
    assert on["is_milestone"] is True
