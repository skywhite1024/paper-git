"""OpenAlex 适配器：按 arXiv DOI（10.48550/arXiv.<id>）批量回填引用数与 venue。"""

import time

import httpx

from ..config import OPENALEX_API_BASE, OPENALEX_DELAY_SECONDS, OPENALEX_MAILTO
from .dedupe import normalize_doi

_RETRY_DELAYS = [2, 4, 8, 16, 30, 60]


def _get_client() -> httpx.Client:
    return httpx.Client(timeout=60, headers={"User-Agent": f"PaperGit/0.1 (mailto:{OPENALEX_MAILTO})"})


def _fetch_batch(client: httpx.Client, filter_value: str, per_page: int) -> httpx.Response:
    """带指数退避的请求（OpenAlex 突发限流返回 429）。"""
    last: httpx.Response | None = None
    for attempt in range(len(_RETRY_DELAYS) + 1):
        resp = client.get(OPENALEX_API_BASE, params={"filter": filter_value, "per-page": per_page})
        if resp.status_code != 429:
            return resp
        last = resp
        if attempt < len(_RETRY_DELAYS):
            time.sleep(_RETRY_DELAYS[attempt])
    assert last is not None
    return last


def backfill_citations(papers: list, batch_size: int = 40, delay: float = 0.5, commit_fn=None) -> int:
    """papers: 含 arxiv_id/doi/citation_count 属性的 ORM 对象列表。返回更新条数。"""
    updated = 0
    client = _get_client()
    try:
        for i in range(0, len(papers), batch_size):
            chunk = [p for p in papers[i : i + batch_size] if p.arxiv_id or p.doi]
            dois = []
            for p in chunk:
                if p.doi:
                    dois.append(p.doi)
                elif p.arxiv_id:
                    dois.append(f"10.48550/arxiv.{p.arxiv_id}")
            if not dois:
                continue
            resp = _fetch_batch(client, "doi:" + "|".join(dois), batch_size)
            resp.raise_for_status()
            by_doi = {}
            for work in resp.json().get("results", []):
                doi = normalize_doi(work.get("doi"))
                if doi:
                    by_doi[doi] = work
            for p in chunk:
                key = p.doi or f"10.48550/arxiv.{p.arxiv_id}"
                work = by_doi.get(normalize_doi(key))
                if not work:
                    continue
                p.citation_count = work.get("cited_by_count") or p.citation_count
                source = ((work.get("primary_location") or {}).get("source") or {}).get("display_name")
                if source and not p.venue:
                    p.venue = source
                updated += 1
            if commit_fn is not None:
                commit_fn()
            time.sleep(delay)
    finally:
        client.close()
    return updated
