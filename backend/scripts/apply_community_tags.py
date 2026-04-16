#!/usr/bin/env python3
"""
POC JSON 里的 verdict/facts → programs 表.

DB 存储约定:
  community_verdict    : TEXT   — 展示串 (aggregator.render_display_text)
  community_tags       : JSON   — 整个结构化 verdict dict (per_aspect, pros, cons, ...)
  community_confidence : REAL   — verdict.confidence (便于 SQL 过滤排序)
  community_updated_at : TEXT   — ISO8601

映射策略: 只认 POC JSON 里的 db_program_id, 不做任何 fuzzy.

用法:
    python scripts/apply_community_tags.py              # dry-run, 打印计划
    python scripts/apply_community_tags.py --apply      # 写入 DB
    python scripts/apply_community_tags.py --apply --db path/to.sqlite3
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = BACKEND_DIR / "optima.dev.sqlite3"
POC_DIR = BACKEND_DIR / "crawler" / "community_enrichment" / "poc_output"

# 让脚本能 import crawler 包里的 aggregator (给旧格式 JSON 做 re-aggregate 兜底)
sys.path.insert(0, str(BACKEND_DIR))


def load_poc_files() -> list[tuple[Path, dict]]:
    out = []
    for f in sorted(POC_DIR.glob("*.json")):
        try:
            out.append((f, json.loads(f.read_text(encoding="utf-8"))))
        except Exception as e:
            print(f"  ! 解析失败 {f.name}: {e}", file=sys.stderr)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="写入 DB（默认 dry-run）")
    ap.add_argument("--db", default=str(DEFAULT_DB))
    args = ap.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"DB 不存在: {db_path}", file=sys.stderr)
        return 1

    docs = load_poc_files()
    if not docs:
        print(f"poc_output 为空: {POC_DIR}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # 预读 programs 做 id → (uni, pname) 反查, 便于打印确认
    c.execute("SELECT id, program_name, university FROM programs")
    id_to_row = {r[0]: (r[1], r[2]) for r in c.fetchall()}
    print(f"DB 中共 {len(id_to_row)} 个 programs\n")

    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    applied: list[tuple[str, int]] = []
    pending: list[tuple[str, str]] = []  # (slug, program_name_from_poc)
    missing_id: list[tuple[str, int]] = []  # id 不存在于 DB

    stale_format: list[str] = []  # 老格式 (没 verdict 字段) 的 POC JSON

    for path, doc in docs:
        slug = doc.get("slug") or path.stem
        program_name = doc.get("program") or slug
        db_id = doc.get("db_program_id")

        # 新格式: 顶层含 "verdict" (aggregator 输出的结构化 dict)
        verdict_obj = doc.get("verdict")
        display_text = doc.get("display_text") or ""

        if verdict_obj is None:
            # 老格式 fallback: 没跑新 pipeline, 记下来, 这轮不落库
            stale_format.append(slug)
            continue

        if db_id is None:
            pending.append((slug, program_name))
            continue

        if db_id not in id_to_row:
            missing_id.append((slug, db_id))
            continue

        pname, uni = id_to_row[db_id]
        confidence = verdict_obj.get("confidence")
        overall = verdict_obj.get("overall")
        sample_size = verdict_obj.get("sample_size", 0)
        print(f"  → {path.name}  #{db_id} {uni} / {pname}")
        print(f"     {overall}  score={verdict_obj.get('score')}  "
              f"conf={confidence}  n={sample_size}")
        if display_text:
            print(f"     display: {display_text[:90]}")

        if args.apply:
            c.execute(
                """
                UPDATE programs
                SET community_verdict = ?,
                    community_tags = ?,
                    community_confidence = ?,
                    community_updated_at = ?
                WHERE id = ?
                """,
                (
                    display_text or None,
                    json.dumps(verdict_obj, ensure_ascii=False),
                    float(confidence) if isinstance(confidence, (int, float)) else None,
                    now_iso,
                    db_id,
                ),
            )
        applied.append((slug, db_id))

    if args.apply:
        conn.commit()

    conn.close()

    print()
    mode = "[应用]" if args.apply else "[dry-run]"
    print(f"{mode} 命中 {len(applied)} 条, pending {len(pending)} 条, stale {len(stale_format)} 条")
    if pending:
        print("\npending (DB 里还没有对应 program):")
        for slug, name in pending:
            print(f"  - {slug}: {name}")
    if missing_id:
        print("\n⚠️  POC 里指向了不存在的 DB id:")
        for slug, db_id in missing_id:
            print(f"  - {slug}: id={db_id}")
    if stale_format:
        print("\n⚠️  旧格式 POC JSON (无 verdict 字段, 需 rerun run_poc):")
        for slug in stale_format:
            print(f"  - {slug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
