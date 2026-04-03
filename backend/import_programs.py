#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目批量导入工具 — 从 CSV 快速导入硕士项目到 programs 表

支持两种 CSV 格式：
1. 简化版（推荐）：program_name, university, program_website + 可选列
2. programlist 格式：university, program, degree, school, official_url, field

用法（需在 backend 目录下用 venv 运行）：
  cd backend && ./venv/bin/python import_programs.py crawler/data/programlist_crawled.csv
  ./venv/bin/python import_programs.py path/to/your_programs.csv
  ./venv/bin/python import_programs.py --template   # 生成模板 CSV

列表类字段（如 prerequisite_courses）用 | 分隔，如：微积分|线性代数|统计学
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys

# 确保能导入 app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal, init_db
from app.models import Program


# degree 列常见值 → degree_subtype
DEGREE_MAP = {
    "mpp": "MPP", "mpp": "MPP", "m.p.p.": "MPP",
    "mfa": "MFA", "ma": "MA", "ms": "MS", "master's": "MA",
    "master": "MA", "masters": "MA", "ma": "MA",
    "mba": "MBA", "mph": "MPH", "ma": "MA",
    "mup": "MUP", "midp": "MA", "mpa": "MPA", "mnsp": "MA",
}


def _parse_list(val) -> list:
    """将 | 或 ; 分隔的字符串解析为 list"""
    if val is None or val == "" or (isinstance(val, float) and str(val) == "nan"):
        return []
    s = str(val).strip()
    if not s:
        return []
    parts = re.split(r"[,|;]\s*", s)
    return [p.strip() for p in parts if p.strip()]


def _parse_int(val):
    if val is None or val == "" or (isinstance(val, float) and str(val) == "nan"):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _parse_float(val):
    if val is None or val == "" or (isinstance(val, float) and str(val) == "nan"):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _parse_bool(val) -> bool:
    if val is None or val == "" or (isinstance(val, float) and str(val) == "nan"):
        return False
    s = str(val).strip().lower()
    return s in ("1", "true", "yes", "是", "y")


def _parse_str(val, max_len=500):
    if val is None or val == "" or (isinstance(val, float) and str(val) == "nan"):
        return None
    s = str(val).strip()[:max_len]
    return s if s else None


def _normalize_degree(degree: str) -> str | None:
    if degree is None or (isinstance(degree, float) and str(degree) == "nan") or not str(degree).strip():
        return None
    d = str(degree).strip().lower()
    for k, v in DEGREE_MAP.items():
        if k in d or d in k:
            return v
    if "mpa" in d:
        return "MPA"
    if "mpp" in d:
        return "MPP"
    if "ma" in d or "master" in d:
        return "MA"
    if "ms" in d or "m.s." in d:
        return "MS"
    return None


def row_to_program(row: dict, col_map: dict) -> dict | None:
    """将一行转为 Program 所需字段 dict"""
    out = {}
    raw = row

    # 必填
    pname = _parse_str(raw.get(col_map.get("program_name", "program_name")) or raw.get("program"))
    univ = _parse_str(raw.get(col_map.get("university", "university")))
    if not pname or not univ:
        return None
    out["program_name"] = pname
    out["university"] = univ

    # 可选映射
    url_col = col_map.get("program_website", "program_website")
    url = _parse_str(raw.get(url_col) or raw.get("official_url"), 500)
    if url:
        out["program_website"] = url

    degree = raw.get(col_map.get("degree_subtype", "degree_subtype")) or raw.get("degree")
    ds = _normalize_degree(degree) if degree else None
    if ds:
        out["degree_subtype"] = ds

    # 可批量填写的字段
    if _parse_int(raw.get("duration_months")):
        out["duration_months"] = _parse_int(raw.get("duration_months"))
    if _parse_int(raw.get("credits_required")):
        out["credits_required"] = _parse_int(raw.get("credits_required"))
    if _parse_int(raw.get("total_cost_usd")):
        out["total_cost_usd"] = _parse_int(raw.get("total_cost_usd"))
    if _parse_int(raw.get("cohort_size")):
        out["cohort_size"] = _parse_int(raw.get("cohort_size"))
    if _parse_float(raw.get("avg_gpa")):
        out["avg_gpa"] = _parse_float(raw.get("avg_gpa"))
    if _parse_int(raw.get("avg_gre_quant")):
        out["avg_gre_quant"] = _parse_int(raw.get("avg_gre_quant"))
    if _parse_int(raw.get("avg_gre_verbal")):
        out["avg_gre_verbal"] = _parse_int(raw.get("avg_gre_verbal"))
    if _parse_bool(raw.get("is_stem")):
        out["is_stem"] = True
    if _parse_bool(raw.get("gre_required")):
        out["gre_required"] = True
    elif "gre_required" in raw and str(raw.get("gre_required")).strip():
        out["gre_required"] = _parse_bool(raw.get("gre_required"))

    # 列表字段
    for col, key in [
        ("prerequisite_courses", "prerequisite_courses"),
        ("employment_industries", "employment_industries"),
        ("concentrations", "concentrations"),
    ]:
        val = raw.get(col)
        lst = _parse_list(val)
        if lst:
            out[key] = lst

    return out


def detect_format(columns: list[str]) -> dict:
    """检测 CSV 格式，返回列名映射"""
    cols_lower = {c.lower(): c for c in columns}
    # programlist 格式
    if "university" in cols_lower and "program" in cols_lower and "official_url" in cols_lower:
        return {
            "program_name": "program",
            "university": "university",
            "program_website": "official_url",
            "degree_subtype": "degree",
        }
    # 简化版
    if "program_name" in cols_lower and "university" in cols_lower:
        return {"program_name": "program_name", "university": "university"}
    if "program" in cols_lower and "university" in cols_lower:
        return {"program_name": "program", "university": "university"}
    return {}


def _is_likely_master_program(name: str) -> bool:
    """粗略判断是否为硕士项目（用于过滤本科/首页等噪音）"""
    if not name or len(name) < 5:
        return False
    n = name.lower()
    skip = ["undergraduate", "homepage", "minor", "certificate", "application process", "degree programs"]
    if any(s in n for s in skip):
        return False
    return any(kw in n for kw in ["master", "mpp", "mpa", "ms ", "ma ", "mfa", "mph", "mup", "msp", "imep", "mnsp", "midp"])


def import_csv(path: str, dry_run: bool = False, skip_duplicates: bool = True, master_only: bool = True) -> int:
    """从 CSV 导入项目，返回成功导入数量"""
    if not os.path.isfile(path):
        raise FileNotFoundError(f"文件不存在: {path}")

    rows = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        rows = list(reader)

    if not rows:
        print("CSV 为空，跳过")
        return 0

    col_map = detect_format(columns)
    if not col_map:
        print("无法识别 CSV 格式，请确保包含 university 和 program/program_name 列")
        return 0

    init_db()
    db = SessionLocal()
    imported = 0

    try:
        for row in rows:
            data = row_to_program(row, col_map)
            if not data:
                continue
            if master_only and not _is_likely_master_program(data["program_name"]):
                print(f"  跳过非硕士项目: {data['program_name']}")
                continue

            if skip_duplicates:
                exists = (
                    db.query(Program)
                    .filter(
                        Program.university == data["university"],
                        Program.program_name == data["program_name"],
                    )
                    .first()
                )
                if exists:
                    print(f"  跳过已存在: {data['university']} - {data['program_name']}")
                    continue

            if dry_run:
                print(f"  [dry-run] 将导入: {data['university']} - {data['program_name']}")
                imported += 1
                continue

            prog = Program(**data)
            db.add(prog)
            db.flush()
            print(f"  ✓ {data['university']} - {data['program_name']}")
            imported += 1

        if not dry_run:
            db.commit()
    finally:
        db.close()

    return imported


def write_template(path: str = "programs_import_template.csv"):
    """生成导入模板 CSV"""
    rows = [
        ["program_name", "university", "program_website", "degree_subtype", "duration_months", "total_cost_usd", "is_stem", "prerequisite_courses"],
        ["Master of Public Policy (MPP)", "Columbia University", "https://example.edu/mpp", "MPP", "24", "65000", "0", "统计学|微观经济学"],
        ["Master of International Affairs", "Princeton University", "https://example.edu/mia", "MA", "21", "58000", "0", ""],
    ]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(rows[0])
        for r in rows[1:]:
            w.writerow(r)
    print(f"已生成模板: {path}")
    print("第一行为列名，第二行起为数据。可选列可留空，列表字段用 | 分隔。")


def main():
    parser = argparse.ArgumentParser(description="从 CSV 批量导入硕士项目")
    parser.add_argument("csv_path", nargs="?", help="CSV 文件路径")
    parser.add_argument("--template", action="store_true", help="生成导入模板 CSV")
    parser.add_argument("--dry-run", action="store_true", help="仅预览，不写入数据库")
    parser.add_argument("--no-skip-dup", action="store_true", help="不跳过已存在的项目（默认跳过）")
    parser.add_argument("--all", action="store_true", help="导入全部行（默认会过滤掉本科/首页等非硕士项目）")
    args = parser.parse_args()

    if args.template:
        write_template()
        return

    if not args.csv_path:
        parser.print_help()
        print("\n示例：")
        print("  python import_programs.py crawler/data/programlist_crawled.csv")
        print("  python import_programs.py --template  # 生成模板")
        return

    print(f"读取: {args.csv_path}")
    n = import_csv(
        args.csv_path,
        dry_run=args.dry_run,
        skip_duplicates=not args.no_skip_dup,
        master_only=not args.all,
    )
    print(f"\n完成，共导入 {n} 个项目")


if __name__ == "__main__":
    main()
