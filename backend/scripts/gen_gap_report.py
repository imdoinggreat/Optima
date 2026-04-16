#!/usr/bin/env python3
"""
扫 poc_output/*.json, 挑 db_program_id 为 None 的那些 (DB 里还没有对应行),
把 DeepSeek 抽出的 facts 预填到一个 pending_gaps/<date>.yaml 供人工 review.

人工 review 后, 这个文件会被 seed_gap_programs.py 读, 批量插 DB 行, 并把
新生成的 program.id 回填到对应 POC JSON 的 db_program_id 字段.

用法:
    python scripts/gen_gap_report.py                       # 生成今日 report
    python scripts/gen_gap_report.py --out pending_gaps.yaml  # 指定文件名

输出 schema 示例 (给人读的):
    generated_at: 2026-04-14T...
    aggregator_version: 2
    gaps:
      - slug: northwestern_imc
        name: Northwestern Medill IMC
        decision: pending_review       # pending_review | accept | skip | edit
        suggested_fields:
          country: 美国
          city: Evanston
          degree_subtype: MS
          duration_months: 15
          total_cost_usd: 65000
          ...
        confidence:
          country: high
          city: high
          duration_months: medium
          ...
        evidence:
          country: "..."
          ...
        verdict_preview:
          overall: positive
          score: 0.42
          confidence: 0.35
          sample_size: 28
          pros: [...]
          cons: [...]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("需要 pyyaml: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

BACKEND_DIR = Path(__file__).resolve().parent.parent
POC_DIR = BACKEND_DIR / "crawler" / "community_enrichment" / "poc_output"
PENDING_DIR = BACKEND_DIR / "crawler" / "community_enrichment" / "pending_gaps"


def load_poc_files() -> list[tuple[Path, dict]]:
    out = []
    for f in sorted(POC_DIR.glob("*.json")):
        try:
            out.append((f, json.loads(f.read_text(encoding="utf-8"))))
        except Exception as e:
            print(f"  ! 解析失败 {f.name}: {e}", file=sys.stderr)
    return out


def _extract_fact_value(facts: dict, key: str):
    """Pull a fact field, handling "unknown" / null / list edge cases."""
    v = facts.get(key)
    if v in (None, "unknown", "", []):
        return None
    return v


def build_gap_entry(doc: dict) -> dict:
    facts = doc.get("facts") or {}
    verdict = doc.get("verdict") or {}

    suggested = {
        "country": _extract_fact_value(facts, "country"),
        "region": _extract_fact_value(facts, "region"),
        "city": _extract_fact_value(facts, "city"),
        "degree_subtype": _extract_fact_value(facts, "degree_subtype"),
        "is_stem": _extract_fact_value(facts, "is_stem"),
        "duration_months": _extract_fact_value(facts, "duration_months"),
        "teaching_language": _extract_fact_value(facts, "teaching_language"),
        "total_cost_usd": _extract_fact_value(facts, "total_cost_usd"),
        "tuition_only_usd": _extract_fact_value(facts, "tuition_only_usd"),
        "min_toefl": _extract_fact_value(facts, "min_toefl"),
        "min_ielts": _extract_fact_value(facts, "min_ielts"),
        "gre_required": _extract_fact_value(facts, "gre_required"),
        "avg_gpa": _extract_fact_value(facts, "avg_gpa"),
        "post_grad_work_visa": _extract_fact_value(facts, "post_grad_work_visa"),
        "work_visa_duration_months": _extract_fact_value(facts, "work_visa_duration_months"),
        "has_coop": _extract_fact_value(facts, "has_coop"),
        "internship_required": _extract_fact_value(facts, "internship_required"),
        "capstone_required": _extract_fact_value(facts, "capstone_required"),
        "chinese_student_ratio_numeric": _extract_fact_value(facts, "chinese_student_ratio_numeric"),
        "cohort_size": _extract_fact_value(facts, "cohort_size"),
        "employment_rate_3month": _extract_fact_value(facts, "employment_rate_3month"),
        "avg_starting_salary_usd": _extract_fact_value(facts, "avg_starting_salary_usd"),
    }

    verdict_preview = {
        "overall": verdict.get("overall"),
        "score": verdict.get("score"),
        "confidence": verdict.get("confidence"),
        "sample_size": verdict.get("sample_size"),
        "pros": verdict.get("pros") or [],
        "cons": verdict.get("cons") or [],
        "risk_flags": verdict.get("risk_flags") or [],
    }

    return {
        "slug": doc.get("slug") or "",
        "name": doc.get("program") or "",
        "decision": "pending_review",
        "program_name_db": doc.get("program") or "",  # 人工可改, 用于 INSERT 时的 program_name
        "university_db": "",   # 人工必填
        "suggested_fields": suggested,
        "confidence": facts.get("_field_confidence") or {},
        "evidence": facts.get("_field_evidence") or {},
        "verdict_preview": verdict_preview,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", help="输出文件路径 (默认: pending_gaps/YYYY-MM-DD.yaml)")
    ap.add_argument("--force", action="store_true", help="覆盖已有文件")
    args = ap.parse_args()

    if args.out:
        out_path = Path(args.out)
    else:
        PENDING_DIR.mkdir(parents=True, exist_ok=True)
        out_path = PENDING_DIR / f"{date.today().isoformat()}.yaml"

    if out_path.exists() and not args.force:
        print(f"文件已存在: {out_path}. 加 --force 覆盖 或用 --out 指定新名字.", file=sys.stderr)
        return 1

    docs = load_poc_files()
    if not docs:
        print("poc_output 为空", file=sys.stderr)
        return 1

    gaps = []
    ready = []
    stale = []
    for path, doc in docs:
        slug = doc.get("slug") or path.stem
        db_id = doc.get("db_program_id")
        if doc.get("verdict") is None:
            stale.append(slug)
            continue
        if db_id is not None:
            ready.append(slug)
            continue
        gaps.append(build_gap_entry(doc))

    if not gaps:
        print("所有 POC 都已有 db_program_id, 没有 gap 要补")
        if stale:
            print(f"⚠️  {len(stale)} 条是旧格式 POC 未跑新 pipeline: {stale}")
        return 0

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "aggregator_version": 2,
        "review_instructions": (
            "每条 gap 的 decision 可选值: accept / edit / skip.\n"
            "accept  = 照 suggested_fields 建行 (必须先填 university_db)\n"
            "edit    = 你改了 suggested_fields 里的值, 按改后的建行\n"
            "skip    = 跳过 (POC 产出保留但不落库, 比如 DB 已有近似行要复用)\n"
            "university_db 字段必填, 因为 DeepSeek 不一定能稳定抽出学校全称.\n"
        ),
        "gaps": gaps,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        yaml.dump(report, allow_unicode=True, sort_keys=False, default_flow_style=False),
        encoding="utf-8",
    )
    print(f"✓ 写入 {out_path}")
    print(f"  gaps: {len(gaps)}  已落库: {len(ready)}  stale: {len(stale)}")
    print(f"\n请打开 {out_path} review, 然后跑:")
    print(f"  python scripts/seed_gap_programs.py --gaps {out_path} --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
