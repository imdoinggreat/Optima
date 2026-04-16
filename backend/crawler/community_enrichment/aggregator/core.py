"""
聚合器核心: 从 LLM 抽出的 claims → 结构化 verdict.

纯 Python, 无网络, 可单测.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from statistics import pstdev
from typing import Any

from .profiles import (
    AGGREGATOR_VERSION,
    ASPECT_LABEL_ZH,
    ASPECTS_ALL,
    ASPECTS_CORE,
    DEFAULT_SOURCE_WEIGHT,
    PROFILES,
    SOURCE_WEIGHTS,
)


# ─────────────────────────────────────────────────────────
# Step 1: 原始 claims → per_aspect 结构
# ─────────────────────────────────────────────────────────
def aggregate_per_aspect(claims: list[dict]) -> dict[str, dict]:
    """
    claims 每条形如:
      {"aspect": "employment", "sentiment": "positive"|"negative"|"neutral",
       "evidence_quote": "...", "source_url": "...", "source_type": "personal"}

    输出 per_aspect:
      {
        "employment": {
           "score": float in [-1, 1],
           "samples": int,
           "pos": int, "neg": int, "neutral": int,
           "stddev": float,
           "top_evidence": [短引用1, 短引用2, 短引用3],
        },
        ...  # 所有 ASPECTS_ALL, 无数据的 aspect samples=0
      }
    """
    out: dict[str, dict] = {
        a: {
            "score": 0.0,
            "samples": 0,
            "pos": 0,
            "neg": 0,
            "neutral": 0,
            "stddev": 0.0,
            "top_evidence": [],
        }
        for a in ASPECTS_ALL
    }

    # 按 aspect 归类
    by_aspect: dict[str, list[dict]] = {a: [] for a in ASPECTS_ALL}
    for c in claims or []:
        aspect = c.get("aspect")
        if aspect not in ASPECTS_ALL:
            continue
        by_aspect[aspect].append(c)

    SENTIMENT_VALUE = {"positive": 1.0, "negative": -1.0, "neutral": 0.0}

    for aspect, cs in by_aspect.items():
        if not cs:
            continue

        values: list[float] = []
        pos = neg = neu = 0
        evidences: list[str] = []
        for c in cs:
            s = c.get("sentiment", "neutral")
            v = SENTIMENT_VALUE.get(s, 0.0)
            values.append(v)
            if v > 0:
                pos += 1
            elif v < 0:
                neg += 1
            else:
                neu += 1
            q = (c.get("evidence_quote") or "").strip()
            if q and q not in evidences:
                evidences.append(q)

        total = len(values)
        score = sum(values) / total if total else 0.0
        stddev = pstdev(values) if total > 1 else 0.0

        # 正面 claim 优先、反面次之, 保留前 3 条 evidence
        pos_ev = [c.get("evidence_quote", "").strip() for c in cs if c.get("sentiment") == "positive"]
        neg_ev = [c.get("evidence_quote", "").strip() for c in cs if c.get("sentiment") == "negative"]
        top_evidence = [e for e in (pos_ev + neg_ev) if e][:3]

        out[aspect] = {
            "score": round(score, 3),
            "samples": total,
            "pos": pos,
            "neg": neg,
            "neutral": neu,
            "stddev": round(stddev, 3),
            "top_evidence": top_evidence,
        }

    return out


# ─────────────────────────────────────────────────────────
# Step 2: per_aspect + profile → overall score
# ─────────────────────────────────────────────────────────
def compute_overall(per_aspect: dict[str, dict], profile_name: str = "default") -> float:
    """加权求和。profile 不认识则回落 default。no-sample aspect 贡献 0。"""
    weights = PROFILES.get(profile_name) or PROFILES["default"]
    total = 0.0
    weight_used = 0.0
    for aspect, w in weights.items():
        if w == 0:
            continue
        a_data = per_aspect.get(aspect) or {}
        if a_data.get("samples", 0) == 0:
            continue  # 没数据的 aspect 不参与, 也不 penalize
        total += a_data["score"] * w
        weight_used += w

    # renormalize: 如果部分 aspect 缺数据, 按实际参与权重归一化, 避免 "缺一半数据 → overall 减半"
    if weight_used == 0:
        return 0.0
    return total / weight_used


def label_overall(score: float) -> str:
    if score > 0.3:
        return "positive"
    if score < -0.3:
        return "negative"
    return "mixed"


# ─────────────────────────────────────────────────────────
# Step 3: confidence (统计量)
# ─────────────────────────────────────────────────────────
def compute_confidence(per_aspect: dict[str, dict], source_mix: dict[str, int]) -> float:
    """
    confidence = posts_factor × consistency × source_factor
      - posts_factor: log10(posts+1)/log10(31), 30 post ≈ 1.0
      - consistency : 1 - 加权平均 stddev, 分歧大则低
      - source_factor: 按 SOURCE_WEIGHTS 加权平均源质量
    """
    # 1. 样本量
    total_samples = sum(a.get("samples", 0) for a in per_aspect.values())
    if total_samples == 0:
        return 0.0
    posts_factor = min(1.0, math.log10(total_samples + 1) / math.log10(31))

    # 2. 一致性 (按 samples 加权平均 stddev)
    weighted_stddev = 0.0
    denom = 0
    for a in per_aspect.values():
        n = a.get("samples", 0)
        if n > 1:
            weighted_stddev += a.get("stddev", 0.0) * n
            denom += n
    avg_stddev = weighted_stddev / denom if denom else 0.0
    consistency = max(0.0, 1.0 - avg_stddev)

    # 3. 源质量
    source_factor = _compute_source_factor(source_mix)

    return round(posts_factor * consistency * source_factor, 2)


def _compute_source_factor(source_mix: dict[str, int]) -> float:
    if not source_mix:
        return DEFAULT_SOURCE_WEIGHT
    total = sum(source_mix.values())
    if total == 0:
        return DEFAULT_SOURCE_WEIGHT
    weighted = 0.0
    for src, cnt in source_mix.items():
        w = SOURCE_WEIGHTS.get(src.lower(), DEFAULT_SOURCE_WEIGHT)
        weighted += w * cnt
    return weighted / total


# ─────────────────────────────────────────────────────────
# Step 4: pros / cons / risk_flags
# ─────────────────────────────────────────────────────────
def extract_pros_cons(per_aspect: dict[str, dict], top_n: int = 3) -> tuple[list[str], list[str]]:
    """挑 score 最高的 top_n 作为 pros, 最低的 top_n 作为 cons。仅考虑 samples>=2 的 aspect。"""
    candidates = [
        (aspect, data)
        for aspect, data in per_aspect.items()
        if data.get("samples", 0) >= 2
    ]
    # pros: score > 0.2
    pos_sorted = sorted(
        [c for c in candidates if c[1]["score"] > 0.2],
        key=lambda x: (-x[1]["score"], -x[1]["samples"]),
    )
    neg_sorted = sorted(
        [c for c in candidates if c[1]["score"] < -0.2],
        key=lambda x: (x[1]["score"], -x[1]["samples"]),
    )
    pros = [_label_with_direction(a, "+") for a, _ in pos_sorted[:top_n]]
    cons = [_label_with_direction(a, "-") for a, _ in neg_sorted[:top_n]]
    return pros, cons


def _label_with_direction(aspect: str, sign: str) -> str:
    label = ASPECT_LABEL_ZH.get(aspect, aspect)
    if sign == "+":
        return f"{label}强" if aspect in ("employment", "network_outcome", "brand_global", "brand_china", "curriculum") \
            else f"{label}好" if aspect in ("cost_roi", "location_opportunity") \
            else f"{label}友好" if aspect == "visa_immigration" \
            else f"{label}佳"
    else:
        return f"{label}大" if aspect == "workload" \
            else f"{label}弱" if aspect in ("brand_global", "brand_china", "employment", "network_outcome") \
            else f"{label}差" if aspect in ("cost_roi", "curriculum", "location_opportunity") \
            else f"{label}不利" if aspect == "visa_immigration" \
            else f"{label}欠佳"


# 触发 risk_flag 的规则
_RISK_RULES = {
    "workload_extreme":  lambda pa: pa.get("workload", {}).get("score", 0) < -0.6 and pa.get("workload", {}).get("samples", 0) >= 3,
    "visa_unfriendly":   lambda pa: pa.get("visa_immigration", {}).get("score", 0) < -0.5 and pa.get("visa_immigration", {}).get("samples", 0) >= 2,
    "employment_weak":   lambda pa: pa.get("employment", {}).get("score", 0) < -0.4 and pa.get("employment", {}).get("samples", 0) >= 3,
    "roi_bad":           lambda pa: pa.get("cost_roi", {}).get("score", 0) < -0.5 and pa.get("cost_roi", {}).get("samples", 0) >= 2,
    "safety_concern":    lambda pa: pa.get("location_opportunity", {}).get("score", 0) < -0.5 and pa.get("location_opportunity", {}).get("samples", 0) >= 2,
}


def detect_risk_flags(per_aspect: dict[str, dict]) -> list[str]:
    return [flag for flag, rule in _RISK_RULES.items() if rule(per_aspect)]


# ─────────────────────────────────────────────────────────
# Step 5: 整装输出
# ─────────────────────────────────────────────────────────
def aggregate_verdict(
    claims: list[dict],
    source_mix: dict[str, int],
    profile_name: str = "default",
) -> dict[str, Any]:
    """入口: claims + source_mix → 结构化 verdict dict。"""
    per_aspect = aggregate_per_aspect(claims)
    score = compute_overall(per_aspect, profile_name)
    confidence = compute_confidence(per_aspect, source_mix)
    pros, cons = extract_pros_cons(per_aspect)
    risk_flags = detect_risk_flags(per_aspect)
    sample_size = sum(a["samples"] for a in per_aspect.values())

    return {
        "overall": label_overall(score),
        "score": round(score, 3),
        "confidence": confidence,
        "sample_size": sample_size,
        "per_aspect": per_aspect,
        "pros": pros,
        "cons": cons,
        "risk_flags": risk_flags,
        "profile": profile_name,
        "source_mix": dict(source_mix),
        "aggregator_version": AGGREGATOR_VERSION,
        "last_updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def render_display_text(verdict: dict) -> str:
    """给 community_verdict TEXT 字段生成一行展示串。纯模板, 不调 LLM。"""
    label_map = {"positive": "整体偏正面", "mixed": "评价分化", "negative": "偏向劝退"}
    label = label_map.get(verdict.get("overall", "mixed"), "评价分化")
    pros = verdict.get("pros") or []
    cons = verdict.get("cons") or []
    conf = verdict.get("confidence", 0)
    n = verdict.get("sample_size", 0)
    parts = [f"{label} (n={n}, conf={conf:.2f})"]
    if pros:
        parts.append("优势: " + "、".join(pros[:2]))
    if cons:
        parts.append("顾虑: " + "、".join(cons[:2]))
    return "。".join(parts)
