"""
Community verdict aggregator.

职责边界:
  - LLM 只做 claims 抽取 (extractor.extract_claims)
  - 本模块做纯 Python 规则聚合, 不调任何外部服务
  - 结果可单测、可 re-run 零成本、可解释

对外接口:
  - aggregate_verdict(claims, source_mix, profile="default") → dict
  - compute_overall(per_aspect, profile) → float       # 给 API read-time 用
  - PROFILES, ASPECTS_CORE, ASPECTS_SOFT, ASPECTS_ALL
"""
from .profiles import ASPECTS_ALL, ASPECTS_CORE, ASPECTS_SOFT, PROFILES
from .core import aggregate_verdict, compute_overall, render_display_text

__all__ = [
    "aggregate_verdict",
    "compute_overall",
    "render_display_text",
    "PROFILES",
    "ASPECTS_ALL",
    "ASPECTS_CORE",
    "ASPECTS_SOFT",
]
