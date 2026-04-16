"""
POC 主入口：跑 3 个典型 program，走完"搜索 → 抓取 → DeepSeek 抽取"整条链路，把原文和结构化结果落到 JSON，方便人工抽检。

运行：
  cd backend
  export DEEPSEEK_API_KEY=sk-...
  python -m crawler.community_enrichment.run_poc

依赖（先装）：
  pip install duckduckgo-search trafilatura requests openai

产出：
  crawler/community_enrichment/poc_output/<program_slug>.json
    {
      "program": "...",
      "raw_sources": [...],   # 抓到的原文（人工可翻）
      "tags": {...}           # DeepSeek 抽取的结构化结果
    }
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import List

from crawler.community_enrichment.collectors.web_search import (
    SearchResult,
    search_and_fetch,
)
try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

from crawler.community_enrichment.aggregator import aggregate_verdict, render_display_text
from crawler.community_enrichment.extractor import SourceDoc, extract_claims, extract_facts
from crawler.community_enrichment.relevance import (
    ProgramAliases,
    build_enhanced_queries,
    is_relevant,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("poc")

OUT_DIR = Path(__file__).parent / "poc_output"
OUT_DIR.mkdir(exist_ok=True)
QUEUE_PATH = Path(__file__).parent / "priority_queue.yaml"


def _load_queue() -> list[dict]:
    """从 priority_queue.yaml 读取项目列表, 转成 _run_one 吃的 dict 结构."""
    if yaml is None:
        raise RuntimeError("pyyaml 未安装. pip install pyyaml")
    if not QUEUE_PATH.exists():
        raise FileNotFoundError(f"找不到 {QUEUE_PATH}")
    raw = yaml.safe_load(QUEUE_PATH.read_text(encoding="utf-8")) or {}
    out = []
    for entry in raw.get("programs", []):
        aliases_raw = entry.get("aliases") or {}
        out.append({
            "slug": entry["slug"],
            "name": entry.get("name") or entry["slug"],
            "db_program_id": entry.get("db_program_id"),
            "aliases": ProgramAliases(
                school=list(aliases_raw.get("school") or []),
                program=list(aliases_raw.get("program") or []),
            ),
            "query_keywords": entry.get("seed_queries") or entry.get("query_keywords") or [],
            "priority": entry.get("priority"),
            "category": entry.get("category"),
            "status": entry.get("status", "pending"),
        })
    return out




def _run_one(program: dict) -> dict:
    name = program["name"]
    aliases: ProgramAliases = program["aliases"]
    log.info(f"━━━ {name} ━━━")

    # Query 增强：把学校/项目全名 + "硕士"/"留学"锚词拼进去
    queries = build_enhanced_queries(program["query_keywords"], aliases)
    log.info(f"  增强后 {len(queries)} 条 query")

    all_results: List[SearchResult] = []
    for q in queries:
        log.info(f"  搜: {q!r}")
        hits = search_and_fetch(
            query=q,
            site=None,
            max_results=5,
            sleep_between=0.6,
        )
        got_text = sum(1 for h in hits if h.fetched)
        log.info(f"    → {len(hits)} 条 / 正文 {got_text} 条")
        all_results.extend(hits)

    # 去重（按 URL）
    seen = set()
    dedup: List[SearchResult] = []
    for r in all_results:
        if r.url in seen:
            continue
        seen.add(r.url)
        dedup.append(r)

    # 相关性过滤：抓回来的 + 正文够长 + 通过 is_relevant
    relevant: List[SearchResult] = []
    reject_log: List[tuple[str, str]] = []
    for r in dedup:
        if not r.fetched or len(r.text) < 200:
            reject_log.append((r.url, "no_text"))
            continue
        ok, reason = is_relevant(r.text, r.source_domain, aliases)
        if ok:
            relevant.append(r)
        else:
            reject_log.append((r.url, reason))

    log.info(
        f"  去重后 {len(dedup)} 条；相关 {len(relevant)} 条 "
        f"(过滤掉 {len(dedup) - len(relevant)})"
    )

    docs = [
        SourceDoc(url=r.url, title=r.title, text=r.text, source_domain=r.source_domain)
        for r in relevant
    ]

    log.info("  调 DeepSeek 抽 claims (aspect-level)...")
    claims_result = extract_claims(program_name=name, docs=docs)
    log.info("  调 DeepSeek 抽 facts (客观字段)...")
    facts = extract_facts(program_name=name, docs=docs)

    claims = claims_result.get("claims", [])
    source_mix = claims_result.get("source_mix", {})

    log.info(f"  聚合 verdict (Python 纯规则, claims={len(claims)})...")
    verdict = aggregate_verdict(claims, source_mix, profile_name="default")
    display_text = render_display_text(verdict)
    log.info(f"  → {display_text}")

    return {
        "program": name,
        "slug": program["slug"],
        "db_program_id": program.get("db_program_id"),
        "stats": {
            "total_searched": len(dedup),
            "relevant": len(relevant),
            "rejected": len(dedup) - len(relevant),
        },
        "raw_sources": [r.to_dict() for r in relevant],
        "all_urls_with_reason": [
            {"url": u, "reason": r} for u, r in reject_log
        ],
        "claims": claims,          # LLM 输出的原子 claim 数组
        "source_mix": source_mix,  # 按源 domain 计数
        "facts": facts,            # 客观字段 (国别/学费/GPA/...)
        "verdict": verdict,        # aggregator 输出 (结构化 verdict, 含 per_aspect)
        "display_text": display_text,
    }


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--slugs", help="逗号分隔的 slug 过滤, 例如 cmu_mscs,columbia_msds; 不传则跑全部")
    args = ap.parse_args()

    if not os.getenv("DEEPSEEK_API_KEY"):
        print("⚠️  请先 export DEEPSEEK_API_KEY=sk-...", file=sys.stderr)
        return 1

    try:
        queue = _load_queue()
    except Exception as e:
        print(f"⚠️  加载 priority_queue.yaml 失败: {e}", file=sys.stderr)
        return 1

    wanted = set(s.strip() for s in args.slugs.split(",")) if args.slugs else None
    targets = [p for p in queue if wanted is None or p["slug"] in wanted]
    if wanted:
        missing = wanted - {p["slug"] for p in queue}
        if missing:
            print(f"⚠️  未知 slug: {sorted(missing)}", file=sys.stderr)
    log.info(f"本次跑 {len(targets)} 个 program: {[p['slug'] for p in targets]}")

    for program in targets:
        try:
            result = _run_one(program)
        except Exception as e:
            log.exception(f"跑 {program['name']} 失败: {e}")
            continue

        out_path = OUT_DIR / f"{program['slug']}.json"
        out_path.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.info(f"  ✓ 写入 {out_path}")

        # 打印关键结果到终端，方便快速 sanity check
        v = result["verdict"]
        stats = result["stats"]
        print("\n── 关键抽取结果 ──")
        print(f"  项目:            {result['program']}")
        print(f"  搜索/相关/拒:    {stats['total_searched']} / {stats['relevant']} / {stats['rejected']}")
        print(f"  claim 数:        {len(result.get('claims', []))}")
        print(f"  overall:         {v['overall']}  (score={v['score']})")
        print(f"  confidence:      {v['confidence']}  sample_size={v['sample_size']}")
        print(f"  pros:            {v['pros']}")
        print(f"  cons:            {v['cons']}")
        print(f"  risk_flags:      {v['risk_flags']}")
        print(f"  display:         {result.get('display_text', '')}")
        print()

    print(f"✓ 全部完成。结果在 {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
