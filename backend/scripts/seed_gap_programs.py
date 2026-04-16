#!/usr/bin/env python3
"""
读取 reviewed pending_gaps/<date>.yaml, 把 decision in {accept, edit} 的条目
作为新行插入 programs 表, 并把生成的 id 回填到对应 POC JSON 的 db_program_id.

然后下一步就可以直接跑 apply_community_tags.py --apply 把 verdict 落库 (零 API 消耗).

用法:
    # dry-run, 只打印计划
    python scripts/seed_gap_programs.py --gaps pending_gaps/2026-04-14.yaml

    # 真插 DB
    python scripts/seed_gap_programs.py --gaps pending_gaps/2026-04-14.yaml --apply

review 前置条件 (yaml 里):
  - decision: accept       # 按 suggested_fields 原样插
      或: edit             # 人工改过 suggested_fields 里的值, 按改后的插
      或: skip             # 不插
  - university_db: 必须非空 (DeepSeek 抽不稳定, 由人工指定)
  - program_name_db: 默认等于 name, 人工可改

安全机制:
  - 默认 dry-run, 必须加 --apply
  - 插入前检查是否已有相同 (university_db, program_name_db) 行, 避免重复
  - 每条插入完立刻把 id 回填到 POC JSON, 防止中途中断后不一致
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timezone

try:
    import yaml
except ImportError:
    print("需要 pyyaml", file=sys.stderr)
    sys.exit(1)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = BACKEND_DIR / "optima.dev.sqlite3"
POC_DIR = BACKEND_DIR / "crawler" / "community_enrichment" / "poc_output"


# 白名单: 允许从 yaml 的 suggested_fields 写到 programs 表的列
# (不在此列的字段忽略, 避免误写到 community_* 列上)
SAFE_COLUMNS = {
    "program_name", "university",
    "country", "region", "city", "city_tier",
    "degree_subtype", "is_stem",
    "duration_months", "teaching_language",
    "total_cost_usd", "tuition_only_usd",
    "min_toefl", "min_ielts", "gre_required", "avg_gpa",
    "post_grad_work_visa", "work_visa_duration_months",
    "has_coop", "internship_required", "capstone_required",
    "chinese_student_ratio", "cohort_size",
    "employment_rate_3month", "avg_starting_salary_usd",
}

# 从 suggested_fields 到 DB 列名的映射 (大部分同名, 少数不同)
FIELD_TO_COLUMN = {
    "chinese_student_ratio_numeric": "chinese_student_ratio",
}


def _to_db_col(field: str) -> str:
    return FIELD_TO_COLUMN.get(field, field)


def _load_gaps(path: Path) -> list[dict]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    gaps = data.get("gaps") or []
    return gaps


def _find_existing(conn: sqlite3.Connection, university: str, program_name: str) -> int | None:
    row = conn.execute(
        "SELECT id FROM programs WHERE university = ? AND program_name = ?",
        (university, program_name),
    ).fetchone()
    return row[0] if row else None


def _actual_columns(conn: sqlite3.Connection) -> set[str]:
    return {r[1] for r in conn.execute("PRAGMA table_info(programs)").fetchall()}


def _insert_program(conn: sqlite3.Connection, payload: dict, allowed: set[str]) -> int:
    cols = [c for c in payload if c in allowed]
    if "program_name" not in cols or "university" not in cols:
        raise ValueError("program_name 和 university 是必填")
    placeholders = ", ".join("?" for _ in cols)
    col_list = ", ".join(cols)
    values = [payload[c] for c in cols]
    cur = conn.execute(
        f"INSERT INTO programs ({col_list}) VALUES ({placeholders})",
        values,
    )
    return cur.lastrowid


def _write_back_program_id(slug: str, pid: int) -> None:
    path = POC_DIR / f"{slug}.json"
    if not path.exists():
        return
    doc = json.loads(path.read_text(encoding="utf-8"))
    doc["db_program_id"] = pid
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")


def _build_insert_payload(gap: dict) -> dict:
    program_name = (gap.get("program_name_db") or gap.get("name") or "").strip()
    university = (gap.get("university_db") or "").strip()
    if not university:
        raise ValueError(f"university_db 必填 (slug={gap.get('slug')})")
    if not program_name:
        raise ValueError(f"program_name 必填 (slug={gap.get('slug')})")

    payload: dict = {"program_name": program_name, "university": university}

    for field, value in (gap.get("suggested_fields") or {}).items():
        if value is None or value == "unknown" or value == "":
            continue
        col = _to_db_col(field)
        if col not in SAFE_COLUMNS:
            continue
        payload[col] = value
    return payload


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gaps", required=True, help="reviewed pending_gaps/*.yaml")
    ap.add_argument("--db", default=str(DEFAULT_DB))
    ap.add_argument("--apply", action="store_true", help="真插 DB, 不加就是 dry-run")
    args = ap.parse_args()

    gaps_path = Path(args.gaps)
    if not gaps_path.exists():
        print(f"gaps 文件不存在: {gaps_path}", file=sys.stderr)
        return 1

    gaps = _load_gaps(gaps_path)
    if not gaps:
        print("yaml 里 gaps 为空")
        return 0

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"DB 不存在: {db_path}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(db_path)
    allowed_cols = SAFE_COLUMNS & _actual_columns(conn)
    dropped = SAFE_COLUMNS - allowed_cols
    if dropped:
        print(f"  (schema 缺列, 自动丢弃: {sorted(dropped)})")

    accepted = skipped = reused = failed = 0
    for g in gaps:
        slug = g.get("slug") or ""
        decision = (g.get("decision") or "pending_review").lower()

        if decision == "skip":
            print(f"  ⏭  skip {slug}")
            skipped += 1
            continue
        if decision not in ("accept", "edit"):
            print(f"  ⚠  {slug}: decision={decision!r} 未 review, 跳过")
            skipped += 1
            continue

        try:
            payload = _build_insert_payload(g)
        except ValueError as e:
            print(f"  ✗ {slug}: {e}")
            failed += 1
            continue

        existing_id = _find_existing(conn, payload["university"], payload["program_name"])
        if existing_id is not None:
            print(f"  ♻  {slug}: 已存在 #{existing_id} ({payload['university']} / {payload['program_name']}), 回填 id")
            if args.apply:
                _write_back_program_id(slug, existing_id)
            reused += 1
            continue

        fields_shown = [f"{k}={v}" for k, v in payload.items() if k not in ("program_name", "university")][:6]
        print(f"  + {slug}: INSERT {payload['university']} / {payload['program_name']}")
        print(f"    + {', '.join(fields_shown)}{' ...' if len(payload) > 8 else ''}")

        if args.apply:
            try:
                new_id = _insert_program(conn, payload, allowed_cols)
                _write_back_program_id(slug, new_id)
                print(f"    → #{new_id}")
                accepted += 1
            except Exception as e:
                print(f"    ✗ INSERT 失败: {e}")
                failed += 1
        else:
            accepted += 1  # dry-run 按"会插"计数

    if args.apply:
        conn.commit()
    conn.close()

    print()
    mode = "[应用]" if args.apply else "[dry-run]"
    print(f"{mode} insert {accepted}, reuse {reused}, skip {skipped}, fail {failed}")
    if accepted > 0 and args.apply:
        print("\n下一步:")
        print("  python scripts/apply_community_tags.py --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
