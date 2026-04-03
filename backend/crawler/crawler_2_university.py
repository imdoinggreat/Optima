import re
from bs4 import BeautifulSoup
import pandas as pd
from tqdm import tqdm
from urllib.parse import urljoin, urlparse
from config import Config
from fetcher import Fetcher, FetcherConfig
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def crawl_university_program_pages(schools_df: pd.DataFrame) -> pd.DataFrame:
    """
    基于协会成员列表，访问学校官网，寻找研究生院项目页面
    """
    print(f"🚀 开始爬取学校项目页面，共 {len(schools_df)} 所学校...")
    
    fetcher = Fetcher(
        FetcherConfig(min_interval_per_domain_sec=Config.REQUEST_DELAY, timeout_sec=20, max_retries=3)
    )
    program_links = []
    
    for idx, row in tqdm(schools_df.iterrows(), total=len(schools_df), desc="学校进度"):
        university = row["university"]
        school = row["school"]
        
        # 优先使用 programlist / seed 提供的官网域名或入口 URL（如果存在）
        base_url = _normalize_seed_url(row.get("official_url") or row.get("official_domain") or "")
        if not base_url:
            base_url = _guess_university_url(university, fetcher)
        if not base_url:
            continue
            
        # 步骤2: 访问学校官网，寻找项目页面
        try:
            grad_urls = _find_grad_program_links(base_url, university, school, fetcher)
            
            for grad_url in grad_urls:
                program_links.append({
                    "association": row.get("association", "PROGRAMLIST"),
                    "university": university,
                    "school": school,
                    "program_page_url": grad_url,
                    "source_school_url": base_url
                })
                
        except Exception as e:
            print(f"⚠️  跳过 {university}: {str(e)}")
            continue
    
    df = pd.DataFrame(program_links)
    output_path = f"{Config.DATA_DIR}/02_university_program_links.csv"
    df.to_csv(output_path, index=False)
    print(f"✅ 学校项目页爬取完成！共 {len(df)} 个链接，保存至: {output_path}")
    return df

def _normalize_seed_url(seed: str) -> str:
    seed = (seed or "").strip()
    if not seed:
        return ""
    if seed.startswith("http://") or seed.startswith("https://"):
        return seed
    # allow domain or path-like values in excel
    return "https://" + seed.lstrip("/")


def _guess_university_url(university: str, fetcher: Fetcher) -> str:
    """
    基于大学名猜测官网 URL（简化版启发式）
    """
    # 清理大学名
    clean_name = university.lower().replace(" ", "-").replace(",", "")
    
    # 常见域名模式
    candidates = [
        f"https://www.{clean_name}.edu",
        f"https://{clean_name}.edu",
    ]
    
    # 简单测试连通性
    for url in candidates:
        try:
            resp = fetcher.get(url, headers=Config.HEADERS)
            if resp.status_code < 400:
                return resp.url
        except Exception:
            continue
    
    return ""

def _find_grad_program_links(base_url: str, university: str, school: str, fetcher: Fetcher) -> list:
    """
    在学校官网内寻找包含 "graduate", "master", "program" 的链接
    """
    grad_links = []
    try:
        response = fetcher.get(base_url, headers=Config.HEADERS)
        soup = BeautifulSoup(response.content, "lxml")
        a_tags = soup.find_all("a", href=True)
        if not a_tags:
            return []

        # Generate candidates with TF-IDF scoring (guard empty corpus)
        def generate_candidates():
            corpus = [a.get_text(strip=True).lower() or " " for a in a_tags]
            try:
                vectorizer = TfidfVectorizer()
                tfidf_matrix = vectorizer.fit_transform(corpus)
                query_vector = vectorizer.transform(["graduate master program degree admissions"])
                scores = cosine_similarity(query_vector, tfidf_matrix).flatten()
            except Exception:
                scores = [0.0] * len(a_tags)
            return sorted(
                [(a["href"], float(scores[i])) for i, a in enumerate(a_tags)],
                key=lambda x: x[1],
                reverse=True,
            )

        candidates = generate_candidates()

        # Filter and validate candidates
        for href, score in candidates:
            full_url = urljoin(base_url, href)
            if urlparse(full_url).netloc == urlparse(base_url).netloc:
                if full_url not in grad_links:
                    grad_links.append(full_url)

        # Re-score candidates with domain-specific rules
        def score(u: str) -> int:
            ul = u.lower()
            s = 0
            if "master" in ul or "masters" in ul:
                s += 3
            if "program" in ul or "degree" in ul:
                s += 2
            if "graduate" in ul:
                s += 1
            if any(x in ul for x in ["apply", "admissions", "tuition", "financial-aid", "contact"]):
                s -= 3
            return s

        grad_links = sorted(grad_links, key=score, reverse=True)
        return grad_links[:10]
        
    except Exception as e:
        return []

if __name__ == "__main__":
    # 测试：先加载第一层的数据
    df = pd.read_csv(f"{Config.DATA_DIR}/01_association_members.csv")
    crawl_university_program_pages(df.head(5))  # 先测试前5所