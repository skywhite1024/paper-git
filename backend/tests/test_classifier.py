from app.ingest.classifier import NodeRules, assign_nodes, fallback_node_for_cat
from app.ingest.dedupe import normalize_arxiv_id, normalize_doi, upsert_paper
from app.models import Paper


def _paper(**kw):
    defaults = dict(title="", abstract="", authors=[], year=2024, cats=[])
    defaults.update(kw)
    return Paper(**defaults)


def test_normalize_ids():
    assert normalize_arxiv_id("2301.07041v2") == "2301.07041"
    assert normalize_arxiv_id("http://arxiv.org/abs/cs/0112017v1") == "cs/0112017"
    assert normalize_arxiv_id("  2401.04088 ") == "2401.04088"
    assert normalize_doi("https://doi.org/10.48550/arXiv.2301.07041") == "10.48550/arxiv.2301.07041"


def test_classifier_transformer_paper(db):
    rules = NodeRules.load(db)
    paper = _paper(
        title="Efficient Transformer Architectures for Long Sequences",
        abstract="We study the transformer attention mechanism and compare architectures.",
        primary_cat="cs.CL",
        cats=["cs.CL", "cs.LG"],
    )
    scored = dict(rules.score_paper(paper))
    assert "ai.ml.dl.arch" in scored or "ai.nlp.llm" in scored
    assert scored.get("ai.ml.dl.arch", 0) >= 4


def test_classifier_robotics_paper(db):
    rules = NodeRules.load(db)
    paper = _paper(
        title="Sampling-Based Motion Planning for Complex Environments",
        abstract="Rapidly-exploring random tree variants for path planning.",
        primary_cat="cs.RO",
        cats=["cs.RO"],
    )
    scored = dict(rules.score_paper(paper))
    assert "robotics.plan" in scored


def test_classifier_rl_paper(db):
    rules = NodeRules.load(db)
    paper = _paper(
        title="Offline Reinforcement Learning with Soft Actor-Critic",
        abstract="We improve q-learning based offline rl algorithms.",
        primary_cat="cs.LG",
        cats=["cs.LG"],
    )
    scored = dict(rules.score_paper(paper))
    assert "ai.ml.rl" in scored or "ai.ml.rl.algo" in scored


def test_fallback_mapping():
    assert fallback_node_for_cat("cs.NI") == "cs"
    assert fallback_node_for_cat("cs.RO") == "robotics"
    assert fallback_node_for_cat("cs.CV") == "ai"
    assert fallback_node_for_cat("stat.ML") == "ai"
    assert fallback_node_for_cat("quant-ph") == "cs"
    assert fallback_node_for_cat(None) is None


def test_assign_fallback(db):
    rules = NodeRules.load(db)
    paper = _paper(
        title="Congestion Control in Datacenter Networks",
        abstract="tcp variants",
        primary_cat="cs.NI",
        cats=["cs.NI"],
    )
    db.add(paper)
    db.flush()
    targets = assign_nodes(db, paper, rules)
    assert "cs.networks" in targets or "cs" in targets
    db.rollback()


def test_upsert_dedupe_arxiv(db):
    row1 = {"arxiv_id": "2301.07041v1", "title": "Paper A", "year": 2023, "citation_count": 5}
    row2 = {"arxiv_id": "2301.07041v3", "title": "Paper A (updated)", "year": 2023, "citation_count": 12}
    p1, created1 = upsert_paper(db, row1)
    db.flush()
    p2, created2 = upsert_paper(db, row2)
    assert created1 and not created2
    assert p1.id == p2.id
    assert p2.citation_count == 12
    db.rollback()


def test_upsert_dedupe_title_year(db):
    p1, c1 = upsert_paper(db, {"title": "No Identifier Paper", "year": 2020, "citation_count": 1})
    db.flush()
    p2, c2 = upsert_paper(db, {"title": "No Identifier Paper", "year": 2020, "citation_count": 9})
    assert c1 and not c2 and p1.id == p2.id
    db.rollback()
