from __future__ import annotations

import random
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import urlparse
import csv

import requests

DEFAULT_USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


def _looks_like_spa(content: bytes) -> bool:
    """Heuristic: page has very little visible text but many scripts -> likely SPA."""
    if not content or len(content) < 500:
        return True
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content[:500000], "lxml")
        script_count = len(soup.find_all("script"))
        for tag in soup.find_all(["script", "style"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        return len(text) < 800 or (len(text) < 2000 and script_count >= 2)
    except Exception:
        return False


@dataclass
class FetcherConfig:
    min_interval_per_domain_sec: float = 2.0
    timeout_sec: int = 20
    max_retries: int = 3
    backoff_base_sec: float = 1.5
    user_agents: Optional[list[str]] = None
    enable_playwright_domains: Optional[list[str]] = None  # Domains to always use Playwright
    enable_js_fallback: bool = True  # Auto use Playwright when static content looks like SPA
    max_429_retries: int = 5
    throttle_duration_sec: int = 300


class Fetcher:
    """
    Minimal resilient fetcher:
    - per-domain rate limiting
    - session reuse (cookies)
    - randomized user-agent
    - retries with exponential backoff on 429/5xx/timeouts
    """

    def __init__(self, config: Optional[FetcherConfig] = None):
        self.config = config or FetcherConfig()
        self._sessions: Dict[str, requests.Session] = {}
        self._last_request_at: Dict[str, float] = {}
        self._429_counts: Dict[str, int] = defaultdict(int)
        self._throttled_until: Dict[str, float] = {}

    def _domain(self, url: str) -> str:
        return urlparse(url).netloc.lower()

    def _session(self, domain: str) -> requests.Session:
        if domain not in self._sessions:
            self._sessions[domain] = requests.Session()
        return self._sessions[domain]

    def _sleep_for_domain(self, domain: str):
        now = time.time()
        last = self._last_request_at.get(domain, 0.0)
        delta = now - last
        if delta < self.config.min_interval_per_domain_sec:
            time.sleep(self.config.min_interval_per_domain_sec - delta)

    def _use_playwright_for_domain(self, url: str) -> bool:
        domain = self._domain(url)
        return bool(self.config.enable_playwright_domains and domain in self.config.enable_playwright_domains)

    def _fetch_with_playwright(self, url: str) -> bytes:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            raise RuntimeError("Playwright not installed. Run: pip install playwright && playwright install chromium")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=self.config.timeout_sec * 1000)
            page.wait_for_timeout(2000)  # allow minimal JS render
            html = page.content()
            browser.close()
        return html.encode("utf-8")

    def get(self, url: str, headers: Optional[dict] = None) -> requests.Response:
        domain = self._domain(url)

        if self._is_throttled(domain):
            raise requests.HTTPError(f"Domain {domain} is throttled until {self._throttled_until[domain]}")

        sess = self._session(domain)

        ua_list = self.config.user_agents or DEFAULT_USER_AGENTS
        merged_headers = {"User-Agent": random.choice(ua_list)}
        if headers:
            merged_headers.update(headers)

        self._sleep_for_domain(domain)

        last_exc: Optional[Exception] = None
        for attempt in range(1, self.config.max_retries + 1):
            try:
                if self._use_playwright_for_domain(url):
                    content = self._fetch_with_playwright(url)
                    resp = requests.Response()
                    resp._content = content
                    resp.status_code = 200
                    resp.encoding = "utf-8"
                    self._last_request_at[domain] = time.time()
                    return resp

                resp = sess.get(url, headers=merged_headers, timeout=self.config.timeout_sec, allow_redirects=True)
                self._last_request_at[domain] = time.time()

                # Auto fallback: if static page looks like SPA, retry with Playwright
                if (
                    resp.status_code == 200
                    and self.config.enable_js_fallback
                    and _looks_like_spa(resp.content)
                ):
                    try:
                        content = self._fetch_with_playwright(url)
                        resp._content = content
                        resp.encoding = "utf-8"
                    except Exception:
                        pass  # keep static content on Playwright failure

                if resp.status_code == 429:
                    self._429_counts[domain] += 1
                    if self._429_counts[domain] >= self.config.max_429_retries:
                        self._throttle_domain(domain)
                    raise requests.HTTPError(f"retryable status {resp.status_code}", response=resp)

                # Reset 429 count on successful response
                self._429_counts[domain] = 0
                return resp
            except Exception as e:
                last_exc = e
                sleep_sec = (self.config.backoff_base_sec ** (attempt - 1)) + random.uniform(0.0, 0.5)
                time.sleep(sleep_sec)

        raise RuntimeError(f"Failed to fetch {url} after retries. Last error: {last_exc}")

    def _is_throttled(self, domain: str) -> bool:
        return time.time() < self._throttled_until.get(domain, 0)

    def _throttle_domain(self, domain: str):
        self._throttled_until[domain] = time.time() + self.config.throttle_duration_sec
        self._429_counts[domain] = 0

    def save_to_csv(self, data: list[dict], file_path: str):
        """Save crawled data to a CSV file."""
        with open(file_path, mode="w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)

    def crawl_and_save(self, urls: list[str], output_file: str):
        """Crawl URLs and save the results to a CSV file."""
        results = []
        for url in urls:
            try:
                response = self.get(url)
                results.append({"url": url, "content": response.text})
            except Exception as e:
                results.append({"url": url, "error": str(e)})
        self.save_to_csv(results, output_file)


# Example usage
if __name__ == "__main__":
    fetcher = Fetcher()
    urls_to_crawl = ["https://example.com/program1", "https://example.com/program2"]
    fetcher.crawl_and_save(urls_to_crawl, "programlist_crawled.csv")

