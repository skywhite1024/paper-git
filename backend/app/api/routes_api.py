from fastapi import APIRouter, HTTPException

from ..routes_loader import get_family, get_route_detail, get_route_summaries, load_routes

router = APIRouter(prefix="/routes", tags=["routes"])

# 闭环语义派生的跨路线关系（虚线）：任务生成反哺探索/示范归纳，技能库经验回流驱动新发现
LOOP_LINKS = [
    {"source": "hub:taskgen", "target": "hub:usd", "kind": "loop", "label": "自动任务课程驱动无监督探索"},
    {"source": "hub:taskgen", "target": "hub:demo", "kind": "loop", "label": "生成任务提供训练轨迹"},
    {"source": "hub:compose", "target": "hub:usd", "kind": "loop", "label": "技能库经验回流，驱动新候选能力"},
]


@router.get("", description="路线族总览：闭环图 + 全部路线摘要 + 技能契约 + 评测矩阵")
def list_routes():
    return {
        "family": get_family(),
        "routes": get_route_summaries(),
    }


@router.get("/{route_id}", description="单条技术路线：阶段、方法节点、演进边")
def route_detail(route_id: str):
    detail = get_route_detail(route_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"route '{route_id}' not found")
    return detail


@router.get("/graph/network", description="整张论文网络图：路线枢纽 + 方法节点 + 演进/闭环边，供主页面大画布渲染")
def graph_network():
    data = load_routes()
    nodes: list[dict] = []
    links: list[dict] = []
    node_ids: set[str] = set()

    for route in data["routes"]:
        rid = route["id"]
        hub_id = f"hub:{rid}"
        nodes.append(
            {
                "id": hub_id,
                "kind": "hub",
                "label": route["name_zh"],
                "name_en": route["name_en"],
                "route": rid,
                "pipeline": route.get("pipeline", ""),
                "insight": route.get("insight", ""),
                "item_count": sum(len(s.get("items", [])) for s in route.get("stages", [])),
            }
        )
        node_ids.add(hub_id)
        for stage_idx, stage in enumerate(route.get("stages", [])):
            for item in stage.get("items", []):
                nid = f"{rid}:{item['label']}"
                if nid in node_ids:
                    continue
                node_ids.add(nid)
                nodes.append(
                    {
                        "id": nid,
                        "kind": "paper",
                        "label": item["label"],
                        "route": rid,
                        "stage": stage["name"],
                        "stage_idx": stage_idx,
                        "stage_description": stage.get("description", ""),
                        "year": item.get("year"),
                        "key": bool(item.get("key")),
                        "note": item.get("note", ""),
                        "full_title": item.get("full_title"),
                        "url": item.get("url"),
                        "figure_url": item.get("figure_url"),
                    }
                )
        for edge in route.get("edges", []):
            links.append(
                {
                    "source": f"{rid}:{edge['from']}",
                    "target": f"{rid}:{edge['to']}",
                    "kind": edge.get("relation", "evolve"),
                    "label": edge.get("label", ""),
                }
            )

    links.extend(LOOP_LINKS)
    return {
        "family": {
            "id": data["family"]["id"],
            "name_zh": data["family"]["name_zh"],
            "description": data["family"]["description"],
        },
        "routes_meta": [
            {"id": r["id"], "name_zh": r["name_zh"], "stages": [s["name"] for s in r.get("stages", [])]}
            for r in data["routes"]
        ],
        "nodes": nodes,
        "links": links,
    }
