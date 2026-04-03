import os
from dotenv import load_dotenv

load_dotenv()

# Resolve programlist path relative to this file so it works from any cwd
_CRAWLER_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    # 爬虫延迟（秒），避免被封
    REQUEST_DELAY = float(os.getenv("REQUEST_DELAY", 2.0))
    
    # 请求头，伪装成浏览器
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # 数据保存路径（相对 crawler 目录，与 cwd 无关）
    DATA_DIR = os.path.join(_CRAWLER_DIR, "data")
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 协会URL配置
    ASSOCIATIONS = {
        "APPAM": "https://www.appam.org/membership/institutional-membership/",
        # 后续可扩展：NASPAA, AACSB, CEPH等
    }

    # Programlist seed file
    # 优先级：
    # 1. 环境变量 PROGRAMLIST_PATH
    # 2. 若同目录存在 programlist.csv，则使用 csv
    # 3. 否则回退到 programlist.xlsx
    _XLSX_PATH = os.path.join(_CRAWLER_DIR, "programlist.xlsx")
    _CSV_PATH = os.path.join(_CRAWLER_DIR, "programlist.csv")

    _ENV_PROGRAMLIST_PATH = os.getenv("PROGRAMLIST_PATH")
    if _ENV_PROGRAMLIST_PATH:
        PROGRAMLIST_PATH = _ENV_PROGRAMLIST_PATH
    else:
        PROGRAMLIST_PATH = _CSV_PATH if os.path.exists(_CSV_PATH) else _XLSX_PATH