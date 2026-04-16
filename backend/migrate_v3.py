#!/usr/bin/env python3
"""
Optima v3 数据库迁移脚本
在现有 SQLite 上添加所有 v3 新字段（不丢失旧数据）
"""
import sqlite3
import sys

DB_PATH = "wthimf.dev.sqlite3"

# 新增列定义：(表名, 列名, 类型, 默认值)
NEW_COLUMNS = [
    # ── Programs 表新增 ──
    # 全球化
    ("programs", "country",                    "TEXT",    None),
    ("programs", "region",                     "TEXT",    None),
    ("programs", "city",                       "TEXT",    None),
    ("programs", "city_tier",                  "TEXT",    None),
    ("programs", "teaching_language",           "TEXT",    "'English'"),
    # 排名
    ("programs", "qs_ranking",                 "INTEGER", None),
    ("programs", "us_news_ranking",            "INTEGER", None),
    ("programs", "subject_ranking",            "INTEGER", None),
    # 录取
    ("programs", "min_toefl",                  "INTEGER", None),
    ("programs", "min_ielts",                  "REAL",    None),
    ("programs", "requires_secondary_language", "BOOLEAN", "0"),
    # 项目结构
    ("programs", "has_coop",                   "BOOLEAN", "0"),
    ("programs", "exchange_opportunities",     "BOOLEAN", "0"),
    # 班级
    ("programs", "chinese_student_ratio",      "REAL",    None),
    # 签证移民
    ("programs", "post_grad_work_visa",        "TEXT",    None),
    ("programs", "work_visa_duration_months",  "INTEGER", None),
    ("programs", "immigration_friendly",       "TEXT",    None),
    ("programs", "pr_pathway_score",           "REAL",    None),
    ("programs", "return_to_china_recognition","TEXT",    None),
    # 软性维度
    ("programs", "academic_pressure",          "TEXT",    None),
    ("programs", "social_culture",             "TEXT",    None),
    ("programs", "campus_safety",              "TEXT",    None),
    ("programs", "city_livability",            "REAL",    None),
    ("programs", "chinese_community_support",  "TEXT",    None),
    ("programs", "cultural_distance",          "TEXT",    None),
    ("programs", "political_climate",          "TEXT",    None),
    ("programs", "isolation_risk",             "TEXT",    None),

    # ── Assessments 表新增 ──
    ("assessments", "inferred_goal_type",       "TEXT",    None),
    ("assessments", "goal_confidence",          "REAL",    None),
    ("assessments", "goal_hypothesis",          "TEXT",    None),
    ("assessments", "fallback_strategy",        "TEXT",    None),
    ("assessments", "destination_preference",   "TEXT",    None),  # JSON
    ("assessments", "school_tier",              "TEXT",    None),
    ("assessments", "gpa_raw",                  "REAL",    None),
    ("assessments", "experience_tags",          "TEXT",    None),  # JSON
    ("assessments", "language_tier",            "TEXT",    None),
    ("assessments", "has_secondary_language",   "BOOLEAN", "0"),
    ("assessments", "budget_tier",              "INTEGER", None),
    ("assessments", "city_preference",          "TEXT",    None),
    ("assessments", "chinese_ratio_pref",       "TEXT",    None),
    ("assessments", "lifestyle_floor",          "REAL",    None),
    ("assessments", "safety_weight",            "REAL",    None),
    ("assessments", "independence_level",       "REAL",    None),
    ("assessments", "culture_openness",         "REAL",    None),
    ("assessments", "extraversion",             "REAL",    None),
    ("assessments", "stress_tolerance",         "REAL",    None),
    ("assessments", "value_weights",            "TEXT",    None),  # JSON
    ("assessments", "variance_tolerance",       "REAL",    None),
    ("assessments", "downside_tolerance",       "REAL",    None),
    ("assessments", "risk_profile",             "TEXT",    None),
    ("assessments", "application_mix",          "TEXT",    None),  # JSON
    ("assessments", "destination_diversity",    "TEXT",    None),
    ("assessments", "rank_importance",          "INTEGER", None),
    ("assessments", "dealbreaker",              "TEXT",    None),
    ("assessments", "destination_signals",      "TEXT",    None),  # JSON
    ("assessments", "conflicts",                "TEXT",    None),  # JSON
    ("assessments", "decision_profile_summary", "TEXT",    None),
    ("assessments", "hidden_risks",             "TEXT",    None),  # JSON
]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 获取现有列
    existing = {}
    for table in ("programs", "assessments"):
        c.execute(f"PRAGMA table_info({table})")
        existing[table] = {row[1] for row in c.fetchall()}

    added = 0
    skipped = 0
    for table, col, dtype, default in NEW_COLUMNS:
        if col in existing.get(table, set()):
            skipped += 1
            continue

        default_clause = f" DEFAULT {default}" if default is not None else ""
        sql = f"ALTER TABLE {table} ADD COLUMN {col} {dtype}{default_clause}"
        try:
            c.execute(sql)
            added += 1
            print(f"  + {table}.{col} ({dtype})")
        except Exception as e:
            print(f"  ! {table}.{col}: {e}")

    conn.commit()
    conn.close()

    print(f"\n迁移完成：新增 {added} 列，跳过 {skipped} 列（已存在）")


if __name__ == "__main__":
    migrate()
