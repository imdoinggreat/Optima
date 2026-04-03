from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple
import os

import pandas as pd


@dataclass(frozen=True)
class ProgramlistData:
    program_seeds: pd.DataFrame
    school_seeds: pd.DataFrame


def _strip(s: object) -> str:
    if s is None:
        return ""
    return str(s).strip()


def _is_blank_row(row: pd.Series) -> bool:
    return all(_strip(v) == "" for v in row.tolist())


def _find_header_row(df: pd.DataFrame, header_tokens: Tuple[str, ...]) -> Optional[int]:
    """
    Find a row index where all header tokens appear (case-insensitive) in the row cells.
    """
    tokens = [t.lower() for t in header_tokens]
    for i in range(len(df)):
        row_values = [_strip(v).lower() for v in df.iloc[i].tolist()]
        if all(any(t == cell for cell in row_values) for t in tokens):
            return i
    return None


def _read_excel_raw(path: str) -> pd.DataFrame:
    """
    Read programlist file (xlsx or csv) with no header; return raw grid.
    """
    ext = os.path.splitext(path)[1].lower()

    # CSV 支持：按无表头读取，和原始 xlsx 逻辑保持一致的二维表结构
    if ext == ".csv":
        try:
            return pd.read_csv(path, header=None, dtype=str)
        except Exception as e:
            raise RuntimeError(
                f"Failed to read csv at {path}. Original error: {e}"
            ) from e

    # 默认走 xlsx 逻辑
    try:
        with open(path, "rb") as f:
            magic = f.read(4)
        if magic[:2] != b"PK":
            raise RuntimeError(
                f"文件不是有效的 .xlsx 格式（xlsx 应以 ZIP 头开头）。"
                f"请用 Excel / WPS / Numbers 打开 {path} 并「另存为」保存为「Excel 工作簿 (.xlsx)」后重试。"
            )
    except FileNotFoundError:
        raise
    except RuntimeError:
        raise

    try:
        return pd.read_excel(path, header=None, dtype=str, engine="openpyxl")
    except Exception as e:
        err_msg = str(e).lower()
        if "zip" in err_msg or "badzipfile" in type(e).__name__.lower():
            raise RuntimeError(
                f"无法将 {path} 识别为有效的 .xlsx 文件（可能损坏或实为旧版 .xls）。"
                "请用 Excel/WPS 打开该文件，然后「另存为」选择「Excel 工作簿 (.xlsx)」覆盖保存后重试。"
            ) from e
        raise RuntimeError(
            f"Failed to read excel at {path}. Original error: {e}"
        ) from e


def load_programlist(path: str) -> ProgramlistData:
    """
    Parse `programlist.xlsx` into:
    - program_seeds: per-program rows (university/program/degree/school/official_url/field)
    - school_seeds: per-school rows extracted from the multi-source blocks
      (university/school/official_domain/core_programs/source_block)
    """
    raw = _read_excel_raw(path)

    # ---- Block A: program list table (English headers) ----
    program_header_idx = _find_header_row(
        raw, ("university", "program", "degree", "school", "official_url", "field")
    )
    if program_header_idx is None:
        raise RuntimeError("Could not find program list header row in programlist.xlsx")

    program_rows = []
    for i in range(program_header_idx + 1, len(raw)):
        row = raw.iloc[i]
        if _is_blank_row(row):
            break
        values = [_strip(v) for v in row.tolist()]
        if len(values) < 6:
            continue
        program_rows.append(values[:6])

    program_seeds = pd.DataFrame(
        program_rows,
        columns=["university", "program", "degree", "school", "official_url", "field"],
    )
    program_seeds = program_seeds[(program_seeds["university"] != "") & (program_seeds["program"] != "")]

    # Add source_count and confidence fields for multi-source validation (guard empty/single row)
    if len(program_seeds) == 0:
        program_seeds["source_count"] = []
        program_seeds["confidence"] = []
    else:
        program_seeds["source_count"] = program_seeds.groupby("university")["university"].transform("count")
        _max = program_seeds["source_count"].max()
        program_seeds["confidence"] = (program_seeds["source_count"] / _max) if (pd.notna(_max) and _max > 0) else 0.0

    # ---- Block B+: multi-source school blocks (Chinese headers) ----
    # Heuristic: each block has a header row that includes "大学名称" and "精准官网域名".
    school_seeds_rows = []
    i = 0
    while i < len(raw):
        row_values = [_strip(v) for v in raw.iloc[i].tolist()]
        if "大学名称" in row_values and "精准官网域名" in row_values:
            # Determine source block name by looking upwards for a non-empty line
            source_block = ""
            for j in range(i - 1, max(i - 8, -1), -1):
                prev = " ".join([_strip(v) for v in raw.iloc[j].tolist()]).strip()
                if prev:
                    source_block = prev
                    break

            # Identify column indexes (support variants: 商学院名称, 传媒学院名称, 核心 MKT / 商科硕士项目, etc.)
            col_uni = row_values.index("大学名称") if "大学名称" in row_values else None
            col_school = next((row_values.index(c) for c in row_values if c and "学院" in c and "名称" in c), None)
            col_domain = row_values.index("精准官网域名") if "精准官网域名" in row_values else None
            col_programs = next((row_values.index(c) for c in row_values if c and "核心" in c and "硕士" in c), None)

            k = i + 1
            while k < len(raw) and not _is_blank_row(raw.iloc[k]):
                r = [_strip(v) for v in raw.iloc[k].tolist()]
                university = r[col_uni] if col_uni is not None and col_uni < len(r) else ""
                school = r[col_school] if col_school is not None and col_school < len(r) else ""
                domain = r[col_domain] if col_domain is not None and col_domain < len(r) else ""
                core_programs = r[col_programs] if col_programs is not None and col_programs < len(r) else ""

                if university and domain:
                    school_seeds_rows.append(
                        {
                            "university": university,
                            "school": school,
                            "official_domain": domain,
                            "core_programs": core_programs,
                            "source_block": source_block,
                        }
                    )
                k += 1

            i = k
            continue
        i += 1

    school_seeds = pd.DataFrame(school_seeds_rows)
    if not school_seeds.empty:
        school_seeds = school_seeds.drop_duplicates(subset=["university", "official_domain", "school"], keep="first")

    return ProgramlistData(program_seeds=program_seeds, school_seeds=school_seeds)

