from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import misc, nodes, papers, routes_api, watch
from .taxonomy_loader import init_db, load_taxonomy


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_taxonomy()
    yield


app = FastAPI(
    title="PaperGit API",
    version="0.1.0",
    description="论文追踪与可视化 API：领域树 / 论文聚合 / 时间线 / 趋势 / 关注",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(nodes.router, prefix=API_PREFIX)
app.include_router(papers.router, prefix=API_PREFIX)
app.include_router(misc.router, prefix=API_PREFIX)
app.include_router(watch.router, prefix=API_PREFIX)
app.include_router(routes_api.router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", tags=["misc"])
def health():
    return {"status": "ok"}
