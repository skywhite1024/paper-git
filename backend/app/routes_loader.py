"""技术路线族加载器：routes/routes.yaml 即代码（无需入库，进程内缓存）。"""

from functools import lru_cache
from pathlib import Path

import yaml

from .config import REPO_ROOT

ROUTES_PATH = Path(__file__).resolve().parents[2] / "routes" / "routes.yaml"


def _validate(data: dict) -> None:
    family = data.get("family") or {}
    loop = family.get("loop") or {}
    loop_node_ids = {n["id"] for n in loop.get("nodes", [])}
    for edge in loop.get("edges", []):
        if edge["from"] not in loop_node_ids or edge["to"] not in loop_node_ids:
            raise ValueError(f"loop edge references unknown node: {edge}")

    route_ids = set()
    for route in data.get("routes", []):
        rid = route["id"]
        if rid in route_ids:
            raise ValueError(f"duplicate route id: {rid}")
        route_ids.add(rid)
        labels = set()
        for stage in route.get("stages", []):
            for item in stage.get("items", []):
                if item["label"] in labels:
                    raise ValueError(f"duplicate item label '{item['label']}' in route {rid}")
                labels.add(item["label"])
        for edge in route.get("edges", []):
            if edge["from"] not in labels or edge["to"] not in labels:
                raise ValueError(f"edge references unknown item in route {rid}: {edge}")
        for node_id in route.get("related_nodes", []):
            if "." in node_id and node_id.count(".") >= 4:
                raise ValueError(f"related node looks invalid: {node_id}")


@lru_cache(maxsize=1)
def load_routes(path: str | None = None) -> dict:
    target = Path(path) if path else ROUTES_PATH
    with open(target, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    _validate(data)
    return data


def get_family() -> dict:
    return load_routes()["family"]


def get_route_summaries() -> list[dict]:
    out = []
    for route in load_routes()["routes"]:
        stages = route.get("stages", [])
        out.append(
            {
                "id": route["id"],
                "name_zh": route["name_zh"],
                "name_en": route["name_en"],
                "description": route.get("description", ""),
                "pipeline": route.get("pipeline", ""),
                "insight": route.get("insight", ""),
                "related_nodes": route.get("related_nodes", []),
                "stage_count": len(stages),
                "item_count": sum(len(s.get("items", [])) for s in stages),
                "edge_count": len(route.get("edges", [])),
                "stages": [{"name": s["name"], "item_count": len(s.get("items", []))} for s in stages],
            }
        )
    return out


def get_route_detail(route_id: str) -> dict | None:
    for route in load_routes()["routes"]:
        if route["id"] != route_id:
            continue
        detail = {k: v for k, v in route.items() if k not in ("stages", "edges")}
        detail["stages"] = route.get("stages", [])
        edges = route.get("edges", [])
        detail["edges"] = edges
        detail["item_count"] = sum(len(s.get("items", [])) for s in detail["stages"])
        detail["edge_count"] = len(edges)
        return detail
    return None


if __name__ == "__main__":
    data = load_routes()
    print(f"family: {data['family']['name_zh']}")
    for summary in get_route_summaries():
        print(f"  {summary['id']}: {summary['name_zh']} — {summary['stage_count']} stages, {summary['item_count']} items, {summary['edge_count']} edges")
