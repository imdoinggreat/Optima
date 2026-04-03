import re
from bs4 import BeautifulSoup
import pandas as pd
from tqdm import tqdm
from config import Config
from fetcher import Fetcher, FetcherConfig


DEGREE_PATTERNS = [
    (re.compile(r"\bMPP\b", re.I), "MPP"),
    (re.compile(r"\bMPA\b", re.I), "MPA"),
    (re.compile(r"\bMPH\b", re.I), "MPH"),
    (re.compile(r"\bMIA\b", re.I), "MIA"),
    (re.compile(r"\bEMPA\b", re.I), "EMPA"),
    (re.compile(r"\bMSBA\b", re.I), "MSBA"),
    (re.compile(r"\bMBA\b", re.I), "MBA"),
    (re.compile(r"\bM\.?Ed\.?\b", re.I), "M.Ed."),
    (re.compile(r"\bM\.?S\.?\b", re.I), "MS"),
    (re.compile(r"\bM\.?A\.?\b", re.I), "MA"),
    (re.compile(r"master of [a-z\s]+", re.I), "Master's"),
]


FIELD_KEYWORDS = [
    ("Public Policy", ["public policy", "policy"]),
    ("Public Administration", ["public administration", "public affairs", "administration"]),
    ("International Affairs", ["international affairs", "international relations", "global affairs"]),
    ("Public Health", ["public health", "epidemiology", "biostatistics", "health policy"]),
    ("Business Analytics", ["business analytics", "analytics", "data analytics"]),
    ("Accounting", ["accounting", "accountancy", "tax"]),
    ("Marketing", ["marketing", "strategic communications", "integrated marketing"]),
    ("Education", ["education", "teaching", "instructional", "counseling"]),
    ("Communication", ["communication", "journalism", "media", "mass communication"]),
    ("Finance", ["finance", "financial"]),
]


def _extract_degree(text: str) -> str:
    t = (text or "").strip()
    for pat, label in DEGREE_PATTERNS:
        if pat.search(t):
            return label
    return ""


def _extract_field(text: str) -> str:
    t = (text or "").lower()
    for field, kws in FIELD_KEYWORDS:
        if any(kw in t for kw in kws):
            return field
    return ""


def _extract_program_name(title: str) -> str:
    t = (title or "").strip()
    # Common patterns: "Master of X | University" / "X (MPP) - School"
    t = re.split(r"\||–|-", t)[0].strip()
    t = re.sub(r"\s{2,}", " ", t)
    return t[:200]


def _confidence(program_name: str, degree: str, field: str) -> float:
    """Score 0.0–1.0 for manual review: higher = more likely a real program page."""
    score = 0.3
    if (degree or "").strip():
        score += 0.25
    if (field or "").strip():
        score += 0.25
    if (program_name or "").strip():
        score += 0.2
    return min(1.0, round(score, 2))


def crawl_program_details(links_df: pd.DataFrame) -> pd.DataFrame:
    """
    访问具体项目页面，提取结构化信息
    """
    print(f"🚀 开始爬取项目详情，共 {len(links_df)} 个页面...")
    
    fetcher = Fetcher(
        FetcherConfig(min_interval_per_domain_sec=Config.REQUEST_DELAY * 0.5, timeout_sec=25, max_retries=3)
    )
    programs = []
    
    for idx, row in tqdm(links_df.iterrows(), total=len(links_df), desc="项目进度"):
        url = row["program_page_url"]
        
        try:
            response = fetcher.get(url, headers=Config.HEADERS)
            soup = BeautifulSoup(response.content, "lxml")
            page_title = soup.title.string if soup.title else ""
            raw_text = soup.get_text(separator=" ", strip=True)
            
            # 提取核心信息
            combined = f"{page_title}\n{raw_text[:8000]}"
            program_name = _extract_program_name(page_title) or row.get("program", "")
            degree = row.get("degree", "") or _extract_degree(combined)
            field = row.get("field", "") or _extract_field(combined)

            confidence = _confidence(program_name, degree, field)
            program_data = {
                # Align with programlist.xlsx (core columns)
                "university": row.get("university", ""),
                "program": program_name,
                "degree": degree,
                "school": row.get("school", ""),
                "official_url": url,
                "field": field,
                # For manual review / multi-source validation
                "source_block": row.get("association", ""),
                "confidence": confidence,
                "page_title": page_title,
                "raw_text": raw_text[:5000],
            }
            programs.append(program_data)
            
        except Exception as e:
            print(f"⚠️  跳过 {url}: {str(e)}")
            continue
    
    df = pd.DataFrame(programs)
    output_path = f"{Config.DATA_DIR}/03_program_details.csv"
    df.to_csv(output_path, index=False)
    print(f"✅ 项目详情爬取完成！共 {len(df)} 个项目，保存至: {output_path}")
    return df

if __name__ == "__main__":
    df = pd.read_csv(f"{Config.DATA_DIR}/02_university_program_links.csv")
    crawl_program_details(df.head(10))  # 先测试前10个