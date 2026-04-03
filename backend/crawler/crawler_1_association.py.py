import time
import requests
from bs4 import BeautifulSoup
import pandas as pd
from tqdm import tqdm
from config import Config

def crawl_appam_members() -> pd.DataFrame:
    """
    爬取 APPAM 协会的 Institutional Members 列表
    返回包含 university, school, raw_name 的 DataFrame
    """
    url = Config.ASSOCIATIONS["APPAM"]
    print(f"🚀 开始爬取 APPAM 协会成员: {url}")
    
    try:
        response = requests.get(url, headers=Config.HEADERS, timeout=30)
        response.raise_for_status()
        time.sleep(Config.REQUEST_DELAY)
        
        soup = BeautifulSoup(response.content, "lxml")
        
        # 提取成员列表（根据APPAM页面结构调整）
        members = []
        
        # 策略1: 查找页面中的表格（APPAM页面底部有表格）
        table = soup.find("table")
        if table:
            rows = table.find_all("tr")
            for row in tqdm(rows[1:], desc="解析表格"):  # 跳过表头
                cols = row.find_all("td")
                if len(cols) >= 2:
                    # 提取联系人（可选）和机构名
                    contact_name = cols[0].get_text(strip=True)
                    raw_institution = cols[1].get_text(strip=True)
                    
                    # 解析机构名：分离大学和学院
                    university, school = _parse_institution_name(raw_institution)
                    
                    members.append({
                        "association": "APPAM",
                        "raw_name": raw_institution,
                        "university": university,
                        "school": school,
                        "contact_name": contact_name,
                        "source_url": url
                    })
        
        # 策略2: 如果没有表格，查找所有包含 "University" 的文本块（备用）
        if not members:
            print("⚠️  未找到表格，尝试备用解析策略...")
            # 这里可以根据实际页面结构补充
        
        df = pd.DataFrame(members)
        output_path = f"{Config.DATA_DIR}/01_association_members.csv"
        df.to_csv(output_path, index=False)
        print(f"✅ APPAM 成员爬取完成！共 {len(df)} 所机构，保存至: {output_path}")
        return df
        
    except Exception as e:
        print(f"❌ APPAM 爬取失败: {str(e)}")
        return pd.DataFrame()

def _parse_institution_name(raw_name: str) -> tuple:
    """
    智能解析机构名，分离大学和学院
    例如："Duke University, Sanford School of Public Policy"
         -> ("Duke University", "Sanford School of Public Policy")
    """
    raw_name = raw_name.strip()
    
    # 常见分隔符
    separators = [", ", " - ", " – ", " at ", " in "]
    
    for sep in separators:
        if sep in raw_name:
            parts = raw_name.split(sep, 1)
            # 简单启发式：包含 "University" 的部分是大学
            if "University" in parts[0] or "College" in parts[0]:
                return parts[0].strip(), parts[1].strip()
            else:
                return parts[1].strip(), parts[0].strip()
    
    # 如果没有分隔符，整个作为大学
    return raw_name, ""

if __name__ == "__main__":
    crawl_appam_members()