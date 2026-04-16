#!/usr/bin/env python3
"""
为 programs 表添加社区舆情字段（community_verdict/tags/confidence/updated_at）。
幂等：已存在的列会跳过。默认操作 optima.dev.sqlite3（DATABASE_URL 未设时的 fallback DB）。
"""
import sqlite3
import sys
from pathlib import Path

DEFAULT_DB = Path(__file__).parent / "optima.dev.sqlite3"

NEW_COLUMNS = [
    ("community_verdict",     "TEXT",    None),
    ("community_tags",        "TEXT",    None),   # JSON 以 TEXT 存
    ("community_confidence",  "REAL",    None),
    ("community_updated_at",  "TEXT",    None),   # ISO 8601 字符串
]


def migrate(db_path: Path) -> None:
    if not db_path.exists():
        print(f"DB 不存在: {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("PRAGMA table_info(programs)")
    existing = {row[1] for row in c.fetchall()}

    added = skipped = 0
    for col, dtype, default in NEW_COLUMNS:
        if col in existing:
            print(f"  = programs.{col} (已存在)")
            skipped += 1
            continue
        default_clause = f" DEFAULT {default}" if default is not None else ""
        c.execute(f"ALTER TABLE programs ADD COLUMN {col} {dtype}{default_clause}")
        print(f"  + programs.{col} ({dtype})")
        added += 1

    conn.commit()
    conn.close()
    print(f"\n迁移完成：新增 {added} 列，跳过 {skipped} 列")


if __name__ == "__main__":
    db = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DB
    print(f"Target DB: {db}")
    migrate(db)
