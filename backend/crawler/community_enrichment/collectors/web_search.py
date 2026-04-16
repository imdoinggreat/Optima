"""
通用 Web 检索 + 正文抓取。

Backend 选择（按优先级）：
  1. 显式 env `SEARCH_BACKEND=serpapi|ddgs` 强制指定
  2. 若设置了 `SERPAPI_API_KEY` → SerpAPI（Google 结果，稳）
  3. 否则 fallback 到 ddgs（免费，偶发 TLS/限速）

SerpAPI (serpapi.com) 定价参考：$75 / 5k 查询的起步套餐；zh 结果质量显著优于 ddgs。
失败不抛异常，返回空列表，由上层决定是否重试。

使用示例：
  results = search("NEU Align 就业", site="mp.weixin.qq.com", max_results=5)
  for r in results:
      text = fetch_article(r.url)
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

# 懒加载依赖：避免没装时 import 报错
try:
    from ddgs import DDGS  # 新包名（旧 duckduckgo_search 已废弃）
except ImportError:
    try:
        from duckduckgo_search import DDGS  # fallback 到旧包
    except ImportError:
        DDGS = None  # type: ignore

try:
    import trafilatura
except ImportError:
    trafilatura = None  # type: ignore

try:
    import requests
except ImportError:
    requests = None  # type: ignore


SERPAPI_ENDPOINT = "https://serpapi.com/search"

# 文件缓存：省 SerpAPI 查询次数，重跑时命中磁盘
_CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache" / "web_search"


def _cache_enabled() -> bool:
    return os.getenv("WEB_SEARCH_NO_CACHE", "").strip() not in ("1", "true", "yes")


def _cache_key(*parts: str) -> str:
    h = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
    return h


def _cache_path(kind: str, key: str) -> Path:
    return _CACHE_DIR / kind / f"{key}.json"


def _cache_load(kind: str, key: str) -> Optional[dict]:
    p = _cache_path(kind, key)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _cache_save(kind: str, key: str, data: dict) -> None:
    p = _cache_path(kind, key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


@dataclass
class SearchResult:
    url: str
    title: str
    snippet: str
    source_domain: str
    text: str = ""           # fetch_article 后填充
    fetched: bool = False

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "snippet": self.snippet,
            "source_domain": self.source_domain,
            "text": self.text,
            "fetched": self.fetched,
        }


def _domain_of(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc
    except Exception:
        return ""


def _pick_backend() -> str:
    """返回 'serpapi' 或 'ddgs'。env 显式 > SERPAPI_API_KEY 存在 > ddgs 兜底。"""
    explicit = (os.getenv("SEARCH_BACKEND") or "").strip().lower()
    if explicit in ("serpapi", "ddgs"):
        return explicit
    if os.getenv("SERPAPI_API_KEY"):
        return "serpapi"
    return "ddgs"


def _search_serpapi(
    query: str,
    site: Optional[str],
    max_results: int,
    region: str,
) -> List[SearchResult]:
    """调 SerpAPI (serpapi.com)。GET + api_key query param，响应字段是 organic_results。"""
    if requests is None:
        logger.error("requests 未安装。pip install requests")
        return []
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        logger.error("SERPAPI_API_KEY 未设置")
        return []

    q = f"site:{site} {query}" if site else query
    gl, hl = ("cn", "zh-cn") if region.startswith("cn") else ("us", "en")
    params = {
        "engine": "google",
        "q": q,
        "num": max_results,
        "gl": gl,
        "hl": hl,
        "api_key": api_key,
    }

    try:
        resp = requests.get(SERPAPI_ENDPOINT, params=params, timeout=20)
        if resp.status_code != 200:
            logger.warning(f"SerpAPI HTTP {resp.status_code}: {resp.text[:200]}")
            return []
        data = resp.json()
    except Exception as e:
        logger.warning(f"SerpAPI 请求失败 q={q!r}: {e}")
        return []

    if "error" in data:
        logger.warning(f"SerpAPI error: {data['error']}")
        return []

    out: List[SearchResult] = []
    for hit in (data.get("organic_results") or [])[:max_results]:
        url = hit.get("link") or ""
        if not url:
            continue
        out.append(SearchResult(
            url=url,
            title=hit.get("title", ""),
            snippet=hit.get("snippet", ""),
            source_domain=_domain_of(url),
        ))
    return out


def _search_ddgs(
    query: str,
    site: Optional[str],
    max_results: int,
    region: str,
    retries: int,
) -> List[SearchResult]:
    """DDG 搜索。ddgs 后端偶发 TLS 失败，简单重试可恢复。"""
    if DDGS is None:
        logger.error("ddgs 未安装。pip install ddgs")
        return []

    q = f"site:{site} {query}" if site else query
    out: List[SearchResult] = []

    for attempt in range(retries + 1):
        try:
            with DDGS() as ddgs:
                for hit in ddgs.text(q, region=region, max_results=max_results):
                    url = hit.get("href") or hit.get("url") or ""
                    if not url:
                        continue
                    out.append(SearchResult(
                        url=url,
                        title=hit.get("title", ""),
                        snippet=hit.get("body", ""),
                        source_domain=_domain_of(url),
                    ))
            return out
        except Exception as e:
            if attempt < retries:
                sleep_s = 1.5 * (attempt + 1)
                logger.warning(f"DDG 失败 try{attempt+1}/{retries+1} q={q!r}: {e}；{sleep_s}s 后重试")
                time.sleep(sleep_s)
            else:
                logger.warning(f"DDG 最终失败 q={q!r}: {e}")

    return out


def search(
    query: str,
    site: Optional[str] = None,
    max_results: int = 8,
    region: str = "cn-zh",
    retries: int = 2,
) -> List[SearchResult]:
    """统一入口：按 _pick_backend() 选 SerpAPI 或 ddgs。签名保持向后兼容。
    文件缓存：同一 (backend, query, site, max_results, region) 命中磁盘直接返回，
    省 SerpAPI 查询次数。WEB_SEARCH_NO_CACHE=1 可绕过。
    """
    backend = _pick_backend()
    use_cache = _cache_enabled()
    key = _cache_key(backend, query, site or "", str(max_results), region) if use_cache else ""

    if use_cache:
        cached = _cache_load("search", key)
        if cached is not None:
            logger.info(f"[cache HIT] search q={query!r} site={site}")
            return [
                SearchResult(
                    url=h["url"],
                    title=h.get("title", ""),
                    snippet=h.get("snippet", ""),
                    source_domain=h.get("source_domain", ""),
                )
                for h in cached.get("hits", [])
            ]

    if backend == "serpapi":
        results = _search_serpapi(query, site, max_results, region)
    else:
        results = _search_ddgs(query, site, max_results, region, retries)

    # 只在拿到结果时缓存（空结果可能是临时故障，下次重试）
    if use_cache and results:
        _cache_save("search", key, {"hits": [r.to_dict() for r in results]})

    return results


def fetch_article(url: str, timeout: int = 15) -> str:
    """
    抓取文章正文。对微信公众号 / 豆瓣 / 大部分 Markdown/HTML 博客都有效。
    知乎 / 小红书 / 一亩三分地 有 403 风险——这些源后续需要专门的 collector。
    文件缓存：同一 URL 只抓一次，重跑时命中磁盘。WEB_SEARCH_NO_CACHE=1 绕过。
    """
    use_cache = _cache_enabled()
    if use_cache:
        key = _cache_key("fetch", url)
        cached = _cache_load("fetch", key)
        if cached is not None:
            return cached.get("text", "")

    if requests is None or trafilatura is None:
        logger.error("requests / trafilatura 未安装。pip install requests trafilatura")
        return ""

    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
        if resp.status_code != 200:
            logger.warning(f"fetch {url} -> HTTP {resp.status_code}")
            return ""
        # trafilatura 自己解码最稳
        text = trafilatura.extract(
            resp.text,
            include_comments=False,
            include_tables=False,
            favor_recall=True,
        )
        text = text or ""
        if use_cache and text:
            _cache_save("fetch", key, {"url": url, "text": text})
        return text
    except Exception as e:
        logger.warning(f"fetch 异常 {url}: {e}")
        return ""


def search_and_fetch(
    query: str,
    site: Optional[str] = None,
    max_results: int = 6,
    sleep_between: float = 0.8,
) -> List[SearchResult]:
    """便捷入口：搜 + 抓 一条龙。sleep_between 防止被反爬。"""
    results = search(query, site=site, max_results=max_results)
    for r in results:
        r.text = fetch_article(r.url)
        r.fetched = bool(r.text)
        time.sleep(sleep_between)
    return results
