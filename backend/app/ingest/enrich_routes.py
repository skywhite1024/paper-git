"""用 arXiv 标题检索为 routes.yaml 中的方法节点补 url/year（原地写回，幂等：已有 url 跳过）。

用法：python -m app.ingest.enrich_routes [--delay 3.2] [--dry-run]
"""

import argparse
import re
import time
import xml.etree.ElementTree as ET

import httpx
import yaml

from ..config import ARXIV_API_BASE, ARXIV_DELAY_SECONDS, REPO_ROOT
from ..routes_loader import ROUTES_PATH

ATOM = "{http://www.w3.org/2005/Atom}"


def _norm(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (title or "").lower())


def search_title(client: httpx.Client, title: str) -> dict | None:
    resp = client.get(
        ARXIV_API_BASE,
        params={"search_query": f'ti:"{title}"', "sortBy": "relevance", "max_results": 3},
    )
    resp.raise_for_status()
    root = ET.fromstring(resp.text)
    want = _norm(title)
    for entry in root.findall(f"{ATOM}entry"):
        got_title = " ".join((entry.findtext(f"{ATOM}title") or "").split())
        got = _norm(got_title)
        if not got:
            continue
        if want == got or want in got or got in want:
            id_url = entry.findtext(f"{ATOM}id") or ""
            arxiv_id = id_url.rsplit("/abs/", 1)[-1]
            published = entry.findtext(f"{ATOM}published") or ""
            return {
                "url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None,
                "year": int(published[:4]) if published[:4].isdigit() else None,
                "matched_title": got_title,
            }
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=ARXIV_DELAY_SECONDS)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    with open(ROUTES_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    client = httpx.Client(timeout=60, follow_redirects=True, headers={"User-Agent": "PaperGit/0.1 route-enricher"})
    candidates = [
        item
        for route in data["routes"]
        for stage in route.get("stages", [])
        for item in stage.get("items", [])
        if item.get("full_title") and not item.get("url")
    ]
    print(f"{len(candidates)} items to enrich")

    hit = miss = 0
    try:
        for i, item in enumerate(candidates, 1):
            try:
                match = search_title(client, item["full_title"])
            except Exception as exc:
                print(f"  [{i}] {item['label']}: request failed: {exc}")
                time.sleep(args.delay)
                continue
            if match and match["url"]:
                item["url"] = match["url"]
                if not item.get("year") and match["year"]:
                    item["year"] = match["year"]
                hit += 1
                print(f"  [{i}] {item['label']} -> {match['url']} ({match['matched_title'][:60]})")
            else:
                miss += 1
                print(f"  [{i}] {item['label']}: no exact match")
            time.sleep(args.delay)
    finally:
        client.close()

    if not args.dry_run and hit:
        with open(ROUTES_PATH, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False, width=120)
        print(f"wrote back {hit} urls ({miss} unmatched)")

    # 让下一次进程内读取拿到新数据
    print("done")


if __name__ == "__main__":
    main()
