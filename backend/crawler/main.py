import sys
import os

try:
    import pandas as pd
except ImportError:
    print("缺少依赖：当前 Python 未安装 pandas。")
    print("当前使用的 Python：", sys.executable)
    print("若已用 venv，请用 venv 的 Python 直接运行：")
    print("  cd backend && ./venv/bin/python crawler/main.py")
    print("或先激活 venv 再确认 which python 指向 venv：")
    print("  source venv/bin/activate && which python && pip install pandas openpyxl && python crawler/main.py")
    raise SystemExit(1)

from crawler_2_university import crawl_university_program_pages
from crawler_3_program import crawl_program_details
from config import Config
from programlist_loader import load_programlist


def main():
    print("="*50)
    print("🎓 北美文商科硕士项目自动发现系统")
    print("="*50)
    
    # Seed: programlist.xlsx / .csv（优先使用你维护的权威清单 + 多源块）
    programlist = load_programlist(Config.PROGRAMLIST_PATH)
    program_seeds = programlist.program_seeds
    school_seeds = programlist.school_seeds

    # 可选：按领域过滤（例如第一次只爬 Marketing / MKT）
    field_filter = os.getenv("CRAWLER_FIELD")
    if field_filter:
        print("\n" + "=" * 50)
        print(f"🎯  仅保留与字段包含「{field_filter}」的 seed（field / core_programs / source_block）")
        print("=" * 50)

        if "field" in program_seeds.columns:
            mask_prog = program_seeds["field"].astype(str).str.contains(field_filter, case=False, na=False)
            program_seeds = program_seeds[mask_prog]

        if not school_seeds.empty:
            school_df = school_seeds.copy()
            for col in ["core_programs", "source_block"]:
                if col in school_df.columns:
                    school_df[col] = school_df[col].astype(str)
            mask_school = False
            if "core_programs" in school_df.columns:
                mask_school = mask_school | school_df["core_programs"].str.contains(field_filter, case=False, na=False)
            if "source_block" in school_df.columns:
                mask_school = mask_school | school_df["source_block"].str.contains(field_filter, case=False, na=False)
            school_seeds = school_df[mask_school]

    print(
        f"✅ programlist 加载完成：program_seeds={len(program_seeds)}，"
        f"school_seeds={len(school_seeds)}（字段过滤={field_filter or '无'}）"
    )

    # 第二层：爬学校项目页（默认全量，也可通过环境变量限流）
    print("\n" + "="*50)
    max_schools = int(os.getenv("CRAWLER_MAX_SCHOOLS", "0"))  # 0 表示不限制
    if max_schools > 0:
        print(f"⚠️  仅爬取前 {max_schools} 所学校（CRAWLER_MAX_SCHOOLS）")
    else:
        print("🚀  爬取所有 seed 学校")
    print("="*50)
    # 以 school_seeds 为主：有精准域名，避免猜 .edu
    if school_seeds.empty:
        print("⚠️  school_seeds 为空，将退化使用 program_seeds 里的 official_url 作为入口")
        seeds_df = program_seeds.rename(columns={"official_url": "official_domain"})[
            ["university", "school", "official_domain"]
        ].drop_duplicates()
    else:
        seeds_df = school_seeds.rename(columns={"official_domain": "official_url"})[
            ["university", "school", "official_url"]
        ]

    if max_schools > 0:
        seeds_df = seeds_df.head(max_schools)

    links_df = crawl_university_program_pages(seeds_df)
    if links_df.empty:
        print("❌ 第二层失败，退出")
        return
    
    # 第三层：爬项目详情（默认全量，也可通过环境变量限流）
    print("\n" + "="*50)
    max_programs = int(os.getenv("CRAWLER_MAX_PROGRAMS", "0"))  # 0 表示不限制
    if max_programs > 0:
        print(f"⚠️  仅爬取前 {max_programs} 个项目页（CRAWLER_MAX_PROGRAMS）")
        target_links_df = links_df.head(max_programs)
    else:
        print("🚀  爬取所有项目页链接")
        target_links_df = links_df
    print("="*50)

    programs_df = crawl_program_details(target_links_df)

    # 输出与 programlist.xlsx 对齐的爬取结果，含 source_block / confidence 便于人工校验
    crawled_path = f"{Config.DATA_DIR}/programlist_crawled.csv"
    out_cols = [
        "university", "program", "degree", "school", "official_url", "field",
        "source_block", "confidence", "page_title", "raw_text",
    ]
    programs_df[[c for c in out_cols if c in programs_df.columns]].to_csv(
        crawled_path, index=False, encoding="utf-8"
    )
    print(f"📄 已写入：{crawled_path}（列与 programlist.xlsx 对齐，含 source_block / confidence）")

    print("\n" + "="*50)
    print("🎉 全流程爬取完成！")
    print(f"📊 最终数据规模：{len(programs_df)} 个项目")
    print("="*50)

if __name__ == "__main__":
    main()