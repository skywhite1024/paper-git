from app.routes_loader import load_routes, get_family, get_route_detail, get_route_summaries


def test_routes_yaml_structure():
    data = load_routes()
    assert data["family"]["id"] == "skill-discovery"
    assert len(data["routes"]) == 6
    summaries = get_route_summaries()
    assert {r["id"] for r in summaries} == {"usd", "demo", "guided", "taskgen", "datax", "compose"}
    assert sum(r["stage_count"] for r in summaries) >= 20
    assert sum(r["item_count"] for r in summaries) >= 100
    assert sum(r["edge_count"] for r in summaries) >= 20


def test_routes_loop_and_matrix():
    family = get_family()
    loop = family["loop"]
    assert len(loop["nodes"]) >= 12
    assert len(loop["edges"]) >= 15
    feedback = [e for e in loop["edges"] if e.get("kind") == "feedback"]
    assert feedback, "closed loop must contain the skill-library feedback edge"
    route_ids = {r["id"] for r in load_routes()["routes"]}
    linked = [n for n in loop["nodes"] if n.get("route")]
    assert linked and all(n["route"] in route_ids for n in linked)
    assert len(family["matrix"]) >= 8
    assert "identity" in family["contract"]["formula"]


def test_route_detail():
    usd = get_route_detail("usd")
    assert usd is not None
    assert usd["item_count"] >= 20
    labels = {i["label"] for s in usd["stages"] for i in s["items"]}
    assert {"VIC", "DIAYN", "METRA"} <= labels
    assert any(e["from"] == "VIC" and e["to"] == "DIAYN" for e in usd["edges"])
    assert get_route_detail("nope") is None


def test_graph_network_endpoint(client):
    data = client.get("/api/routes/graph/network").json()
    ids = {n["id"] for n in data["nodes"]}
    hubs = [n for n in data["nodes"] if n["kind"] == "hub"]
    stages = [n for n in data["nodes"] if n["kind"] == "stage"]
    papers = [n for n in data["nodes"] if n["kind"] == "paper"]
    assert len(hubs) == 6
    assert len(stages) >= 20
    assert len(papers) >= 100
    assert all(l["source"] in ids and l["target"] in ids for l in data["links"])
    loop_links = [l for l in data["links"] if l["kind"] == "loop"]
    assert len(loop_links) >= 3
    pipeline_links = [l for l in data["links"] if l["kind"] == "pipeline"]
    assert len(pipeline_links) >= 25, "每条路线 hub→阶段→…→阶段 的结构边应齐全"
    sample = next(n for n in papers if n["label"] == "DIAYN")
    assert sample["route"] == "usd" and sample["stage_idx"] == 0
    assert sample["url"]
    assert {m["id"] for m in data["routes_meta"]} == {h["route"] for h in hubs}
    stage_anchor = next(n for n in stages if n["id"] == "stage:usd:0")
    assert stage_anchor["item_count"] >= 3 and stage_anchor["stage_description"]
