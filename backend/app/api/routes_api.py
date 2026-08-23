from fastapi import APIRouter, HTTPException

from ..routes_loader import get_family, get_route_detail, get_route_summaries

router = APIRouter(prefix="/routes", tags=["routes"])


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
