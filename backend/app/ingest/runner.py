"""Ingest CLI。

常用：
  python -m app.ingest.runner                        # 全量：taxonomy 涉及的每个 arXiv 分类拉取最近论文
  python -m app.ingest.runner --categories cs.RO --per-category 300
  python -m app.ingest.runner --incremental --days 3  # 增量：最近提交
  python -m app.ingest.runner --backfill-citations    # OpenAlex 回填引用数/venue
  python -m app.ingest.seed                           # 离线种子数据
"""

import argparse
import sys
import time

from sqlalchemy import select

from ..database import SessionLocal
from ..models import Node, Paper
from ..taxonomy_loader import init_db, load_taxonomy
from .arxiv_adapter import fetch_category, fetch_recent_updates
from .classifier import NodeRules, assign_nodes
from .dedupe import upsert_paper
from .openalex_adapter import backfill_citations


def categories_from_taxonomy(session) -> list[str]:
    cats: list[str] = []
    for node in session.scalars(select(Node)).all():
        for cat in node.arxiv_cats or []:
            if "." in cat and cat not in cats:
                cats.append(cat)
    return sorted(cats)


def ingest_rows(session, rows, rules) -> tuple[int, int]:
    created = updated = 0
    for row in rows:
        paper, is_new = upsert_paper(session, row)
        session.flush()
        assign_nodes(session, paper, rules)
        if is_new:
            created += 1
        else:
            updated += 1
    session.commit()
    return created, updated


def run_full(session, categories, per_category, delay, limit) -> None:
    rules = NodeRules.load(session)
    total_new = total_upd = 0
    for i, cat in enumerate(categories, 1):
        remaining = limit - total_new if limit else None
        if remaining is not None and remaining <= 0:
            print(f"limit {limit} reached, stopping")
            break
        want = per_category if remaining is None else min(per_category, remaining)
        print(f"[{i}/{len(categories)}] fetching cat:{cat} (up to {want}) ...", flush=True)
        try:
            rows = fetch_category(cat, max_results=want, delay=delay)
        except Exception as exc:  # 单类失败不阻断整体
            print(f"  !! {cat} failed: {exc}")
            continue
        created, updated = ingest_rows(session, rows, rules)
        total_new += created
        total_upd += updated
        print(f"  {cat}: fetched={len(rows)} new={created} updated={updated} (total new={total_new})", flush=True)
    print(f"DONE full ingest: new={total_new} updated={total_upd}")


def run_incremental(session, days, delay) -> None:
    rules = NodeRules.load(session)
    rows = fetch_recent_updates(days=days, delay=delay)
    created, updated = ingest_rows(session, rows, rules)
    print(f"DONE incremental: fetched={len(rows)} new={created} updated={updated}")


def run_backfill(session, only_missing: bool, batch: int) -> None:
    query = select(Paper)
    if only_missing:
        query = query.where(Paper.citation_count == 0)
    papers = list(session.scalars(query).all())
    print(f"backfilling {len(papers)} papers via OpenAlex ...", flush=True)
    n = backfill_citations(papers, batch_size=batch, commit_fn=session.commit)
    session.commit()
    print(f"DONE backfill: updated {n} papers")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="PaperGit ingest runner")
    parser.add_argument("--categories", help="逗号分隔 arXiv 分类，默认取 taxonomy 全部分类")
    parser.add_argument("--per-category", type=int, default=800)
    parser.add_argument("--delay", type=float, default=3.2, help="arXiv 请求间隔秒数")
    parser.add_argument("--limit", type=int, default=0, help="总新增上限，0=不限制")
    parser.add_argument("--incremental", action="store_true")
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--backfill-citations", action="store_true")
    parser.add_argument("--backfill-all", action="store_true", help="回填时不只处理 citation_count=0")
    parser.add_argument("--backfill-batch", type=int, default=40)
    parser.add_argument("--seed", action="store_true")
    parser.add_argument("--clean-demo", action="store_true")
    args = parser.parse_args(argv)

    init_db()
    load_taxonomy()

    started = time.time()
    with SessionLocal() as session:
        if args.clean_demo:
            from .seed import clean_demo

            print(f"removed {clean_demo(session)} demo papers")
            return 0
        if args.seed:
            from .seed import main as seed_main

            seed_main()
        elif args.backfill_citations:
            run_backfill(session, only_missing=not args.backfill_all, batch=args.backfill_batch)
        elif args.incremental:
            run_incremental(session, args.days, args.delay)
        else:
            cats = args.categories.split(",") if args.categories else categories_from_taxonomy(session)
            print(f"full ingest over {len(cats)} categories: {cats}")
            run_full(session, cats, args.per_category, args.delay, args.limit)
    print(f"elapsed: {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
