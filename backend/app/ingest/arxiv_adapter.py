"""arXiv Atom API 适配器：按分类拉取最近论文（分页 + 限速）。"""

import time
import xml.etree.ElementTree as ET
from datetime import datetime

import httpx

from ..config import ARXIV_API_BASE, ARXIV_DELAY_SECONDS

ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV = "{http://arxiv.org/schemas/atom}"

_client: httpx.Client | None = None


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=60, follow_redirects=True, headers={"User-Agent": "PaperGit/0.1 ingester"})
    return _client


def _parse_entry(entry) -> dict | None:
    id_url = entry.findtext(f"{ATOM}id") or ""
    arxiv_id = id_url.rsplit("/abs/", 1)[-1] if "/abs/" in id_url else id_url
    if not arxiv_id:
        return None
    title = " ".join((entry.findtext(f"{ATOM}title") or "").split())
    abstract = " ".join((entry.findtext(f"{ATOM}summary") or "").split())
    authors = [a.findtext(f"{ATOM}name") or "" for a in entry.findall(f"{ATOM}author")]
    published = entry.findtext(f"{ATOM}published")
    primary_el = entry.find(f"{ARXIV}primary_category")
    primary_cat = primary_el.get("term") if primary_el is not None else None
    cats = [c.get("term") for c in entry.findall(f"{ATOM}category") if c.get("term")]
    pdf_url = abs_url = None
    for link in entry.findall(f"{ATOM}link"):
        if link.get("title") == "pdf":
            pdf_url = link.get("href")
        elif link.get("type") == "text/html":
            abs_url = link.get("href")

    year = None
    if published:
        try:
            year = datetime.fromisoformat(published.replace("Z", "+00:00")).year
        except ValueError:
            pass

    return {
        "arxiv_id": arxiv_id,
        "title": title,
        "abstract": abstract,
        "authors": authors,
        "year": year,
        "published": published,
        "primary_cat": primary_cat,
        "cats": cats,
        "pdf_url": pdf_url,
        "abs_url": abs_url or (f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None),
        "source": "arxiv",
    }


def fetch_category(
    category: str,
    max_results: int = 800,
    page_size: int = 200,
    delay: float = ARXIV_DELAY_SECONDS,
    client: httpx.Client | None = None,
) -> list[dict]:
    """按 arXiv 分类拉取最新 max_results 篇论文元数据。"""
    http = client or _get_client()
    papers: list[dict] = []
    start = 0
    while start < max_results:
        size = min(page_size, max_results - start)
        resp = http.get(
            ARXIV_API_BASE,
            params={
                "search_query": f"cat:{category}",
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "start": start,
                "max_results": size,
            },
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        entries = root.findall(f"{ATOM}entry")
        if not entries:
            break
        for entry in entries:
            parsed = _parse_entry(entry)
            if parsed and parsed["title"] and parsed["year"]:
                papers.append(parsed)
        if len(entries) < size:
            break
        start += size
        if start < max_results:
            time.sleep(delay)
    return papers


def fetch_recent_updates(days: int = 3, delay: float = ARXIV_DELAY_SECONDS, client: httpx.Client | None = None) -> list[dict]:
    """全库最近更新（增量模式用）。"""
    http = client or _get_client()
    papers: list[dict] = []
    start = 0
    while True:
        resp = http.get(
            ARXIV_API_BASE,
            params={
                "search_query": "all:computer science OR all:robotics",
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "start": start,
                "max_results": 200,
            },
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        entries = root.findall(f"{ATOM}entry")
        if not entries:
            break
        cutoff_hit = False
        for entry in entries:
            parsed = _parse_entry(entry)
            if not parsed:
                continue
            published = parsed.get("published")
            if published:
                dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                if (datetime.now(dt.tzinfo) - dt).days > days:
                    cutoff_hit = True
                    continue
            if parsed["title"] and parsed["year"]:
                papers.append(parsed)
        if cutoff_hit or len(entries) < 200:
            break
        start += 200
        time.sleep(delay)
    return papers
