# backend/app/routers/assessments.py
"""
Optima 测评引擎 v3

30题输入 → 推断引擎 → UserProfile(Assessment)

核心升级：
  1. 多信号目标推断（不靠A1单点）
  2. 认知冲突检测（风险/目标/目的地 三类冲突）
  3. 解释层输出（决策画像 + 矛盾点 + 隐藏风险）
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/assessments", tags=["选校测评"])


# ═══════════════════════════════════════════════════════════════════════
# 1. 答案解析：原始答案 → 结构化字段
# ═══════════════════════════════════════════════════════════════════════

def parse_answers(raw: Dict[str, Any]) -> Dict[str, Any]:
    """把前端提交的 {A1: "a", B2: 3.6, C1: "b", ...} 解析成结构化字段"""

    def val(key: str, default=None):
        return raw.get(key, default)

    def float_val(key: str, default: float = 0.5) -> float:
        try:
            return float(raw.get(key, default))
        except (TypeError, ValueError):
            return default

    # ── 模块 A ──
    goal_hypothesis = val("A1", "e")
    fallback_map = {
        "a": "brand_hedge", "b": "mobility", "c": "academic",
        "d": "none", "e": "cost_sensitive",
    }
    fallback_strategy = fallback_map.get(val("A2", "e"), "none")
    destination_preference = val("A3", ["ALL"])
    if isinstance(destination_preference, str):
        destination_preference = [destination_preference]

    # ── 模块 B ──
    # ── 模块 B0 (专业方向) ──
    undergrad_field = val("B0_field", "other")
    target_fields = val("B0_target", [])
    if isinstance(target_fields, str):
        target_fields = [target_fields]

    school_tier = val("B1")
    gpa_scale = val("B2_scale", "4.0")
    gpa_raw_input = float_val("B2", 3.0)
    # Convert to 4.0 scale for matching
    if gpa_scale == "5.0":
        gpa_raw = round(gpa_raw_input * 4.0 / 5.0, 2)
    elif gpa_scale == "100":
        # Simple linear mapping: 60→2.0, 100→4.0
        gpa_raw = round(max(2.0, min(4.0, (gpa_raw_input - 60) * 2.0 / 40.0 + 2.0)), 2)
    else:
        gpa_raw = gpa_raw_input
    experience_tags = val("B3", [])
    if isinstance(experience_tags, str):
        experience_tags = [experience_tags]
    language_tier = val("B4", "c")
    has_secondary_language = language_tier == "e"
    budget_tier = {"a": 1, "b": 2, "c": 3, "d": 4, "e": 5}.get(val("B5", "c"), 3)

    # ── 新增 B 模块题 ──
    class_rank = val("B2b", "unknown")
    work_years = val("B3b", "none")
    gre_tier = val("B4b", "no_gre")
    personal_context = val("B6", [])
    if isinstance(personal_context, str):
        personal_context = [personal_context]

    is_working = "working" in personal_context
    is_married = "married" in personal_context
    is_career_switch = "career_switch" in personal_context
    is_parent_driven = "parent_driven" in personal_context
    has_gap_year = "gap_year" in personal_context
    is_over_30 = "age_30plus" in personal_context

    # ── 模块 C（可匹配）──
    city_map = {"a": "large", "b": "medium", "c": "small", "d": "any"}
    city_preference = city_map.get(val("C1", "d"), "any")

    ratio_map = {"a": "low", "b": "moderate", "c": "high", "d": "any"}
    chinese_ratio_pref = ratio_map.get(val("C2", "d"), "any")

    lifestyle_map = {"a": 0.8, "b": 0.5, "c": 0.3, "d": 0.9}
    lifestyle_floor = lifestyle_map.get(val("C3", "b"), 0.5)

    safety_map = {"a": 0.9, "b": 0.7, "c": 0.3, "d": 0.1}
    safety_weight = safety_map.get(val("C4", "b"), 0.5)

    indep_map = {"a": 0.9, "b": 0.7, "c": 0.4, "d": 0.2}
    independence_level = indep_map.get(val("C5", "b"), 0.5)

    culture_map = {"a": 0.9, "b": 0.6, "c": 0.3, "d": 0.1}
    culture_openness = culture_map.get(val("C6", "b"), 0.5)

    # ── 模块 C（风险提示）──
    extrav_map = {"a": 0.9, "b": 0.6, "c": 0.3, "d": 0.1}
    extraversion = extrav_map.get(val("C7", "b"), 0.5)

    stress_map = {"a": 0.9, "b": 0.6, "c": 0.3, "d": 0.1}
    stress_tolerance = stress_map.get(val("C8", "b"), 0.5)

    # ── 模块 D（价值观权衡）──
    def tradeoff(key: str) -> float:
        """A=0.2(偏左), B=0.8(偏右)"""
        return 0.8 if val(key) == "B" else 0.2

    value_weights = {
        "rank_vs_location": tradeoff("D1"),
        "rank_vs_cost": tradeoff("D2"),
        "stay_vs_brand": {"A": 0.2, "B": 0.5, "C": 0.8}.get(val("D3"), 0.5),
        "academic_vs_career": tradeoff("D4"),
        "duration_preference": tradeoff("D5"),
    }

    variance_map = {"A": 0.8, "B": 0.2}
    variance_tolerance = variance_map.get(val("D6"), 0.5)

    downside_map = {"A": 0.8, "B": 0.2}
    downside_tolerance = downside_map.get(val("D7"), 0.5)

    risk_confirm_map = {"a": 0.8, "b": 0.9, "c": 0.5}
    risk_confirm = risk_confirm_map.get(val("D8", "c"), 0.5)

    # D9 场景题：隐藏留下意愿
    hidden_stay_map = {"a": "strong_stay", "b": "open_to_stay", "c": "firm_return"}
    hidden_stay_signal = hidden_stay_map.get(val("D9"), None)

    # D_drive: 核心驱动力 → archetype
    drive = val("D_drive", "unsure")
    priority = val("D_priority", "employment")

    # 风险画像（三信号加权）
    risk_score = (variance_tolerance * 0.35 + downside_tolerance * 0.35 + risk_confirm * 0.3)
    if risk_score > 0.65:
        risk_profile = "aggressive"
    elif risk_score > 0.35:
        risk_profile = "balanced"
    else:
        risk_profile = "conservative"

    # ── 模块 E（目的地特定信号）──
    # 翻译为 matching.py 期望的标准化 key + value
    destination_signals = {}
    for key in raw:
        if key.startswith("E_"):
            destination_signals[key.lower()] = val(key)

    # 语义翻译：原始答案 → matching.py 使用的标准词汇
    h1b_raw = val("E_US1")
    if h1b_raw:
        h1b_map = {"a": "acceptable", "b": "need_stem_buffer", "c": "main_concern"}
        destination_signals["h1b_tolerance"] = h1b_map.get(h1b_raw, h1b_raw)

    psw_raw = val("E_UK2")
    if psw_raw:
        psw_map = {"a": "try_stay", "b": "experience_then_return", "c": "not_a_factor"}
        destination_signals["psw_plan"] = psw_map.get(psw_raw, psw_raw)

    hk_stay_raw = val("E_HK2")
    if hk_stay_raw:
        hk_map = {"a": "permanent", "b": "explore", "c": "return"}
        destination_signals["hk_stay_plan"] = hk_map.get(hk_stay_raw, hk_stay_raw)

    # ── 模块 F ──
    mix_map = {
        "a": {"reach": 0.45, "target": 0.35, "safety": 0.20},
        "b": {"reach": 0.30, "target": 0.40, "safety": 0.30},
        "c": {"reach": 0.15, "target": 0.35, "safety": 0.50},
        "d": None,  # 自动分配
    }
    application_mix = mix_map.get(val("F1", "d"))
    # 自动分配：基于 risk_profile
    if application_mix is None:
        if risk_profile == "aggressive":
            application_mix = {"reach": 0.40, "target": 0.40, "safety": 0.20}
        elif risk_profile == "conservative":
            application_mix = {"reach": 0.15, "target": 0.40, "safety": 0.45}
        else:
            application_mix = {"reach": 0.25, "target": 0.45, "safety": 0.30}

    diversity_map = {"a": "single", "b": "multi", "c": "max"}
    destination_diversity = diversity_map.get(val("F2", "b"), "multi")

    rank_importance = max(1, min(10, int(float_val("F3", 5))))

    dealbreaker_map = {
        "a": "no_recognition", "b": "unemployment", "c": "bad_experience",
        "d": "unsafe", "e": "no_learning",
    }
    dealbreaker = dealbreaker_map.get(val("F4"), None)

    # Cross-major detection
    FIELD_AFFINITY_CHECK = {
        "cs_ee": ["cs", "ds_ba", "ee", "energy_sustain", "biomed_eng"],
        "mech_civil": ["mech", "civil_env", "energy_sustain"],
        "math_stat": ["cs", "ds_ba", "finance", "econ", "math_stat", "physics"],
        "finance_econ": ["finance", "econ", "ds_ba", "mba_mgmt", "accounting", "supply_chain"],
        "business": ["mba_mgmt", "marketing", "finance", "ds_ba", "accounting", "supply_chain"],
        "media_comm": ["marketing", "media_comm", "creative_writing", "design", "film_media"],
        "education": ["education", "ed_tech", "policy", "psychology"],
        "social_sci": ["policy", "ir", "dev_studies", "sociology", "psychology", "social_work", "gender_queer", "cultural_studies"],
        "law": ["law", "human_rights", "policy", "ir"],
        "language_lit": ["education", "linguistics", "comp_lit", "cultural_studies", "digital_humanities", "creative_writing"],
        "science": ["cs", "ds_ba", "physics", "chemistry", "biology", "env_science", "math_stat", "public_health", "biotech"],
        "art_design": ["design", "fine_art", "film_media", "architecture", "media_comm"],
        "health": ["public_health", "health_mgmt", "biotech", "nursing", "biomed_eng"],
        "other": [],
    }
    is_cross_major = False
    if target_fields and undergrad_field:
        affinity = FIELD_AFFINITY_CHECK.get(undergrad_field, [])
        if not any(t in affinity for t in target_fields):
            is_cross_major = True

    return {
        "goal_hypothesis": goal_hypothesis,
        "fallback_strategy": fallback_strategy,
        "destination_preference": destination_preference,
        "undergrad_field": undergrad_field,
        "target_fields": target_fields,
        "school_tier": school_tier,
        "gpa_raw": gpa_raw,
        "experience_tags": experience_tags,
        "language_tier": language_tier,
        "has_secondary_language": has_secondary_language,
        "budget_tier": budget_tier,
        "class_rank": class_rank,
        "work_years": work_years,
        "gre_tier": gre_tier,
        "personal_context": personal_context,
        "is_working": is_working,
        "is_married": is_married,
        "is_career_switch": is_career_switch,
        "is_parent_driven": is_parent_driven,
        "has_gap_year": has_gap_year,
        "is_over_30": is_over_30,
        "is_cross_major": is_cross_major,
        "drive": drive,
        "priority": priority,
        "city_preference": city_preference,
        "chinese_ratio_pref": chinese_ratio_pref,
        "lifestyle_floor": lifestyle_floor,
        "safety_weight": safety_weight,
        "independence_level": independence_level,
        "culture_openness": culture_openness,
        "extraversion": extraversion,
        "stress_tolerance": stress_tolerance,
        "value_weights": value_weights,
        "variance_tolerance": variance_tolerance,
        "downside_tolerance": downside_tolerance,
        "risk_profile": risk_profile,
        "destination_signals": destination_signals,
        "application_mix": application_mix,
        "destination_diversity": destination_diversity,
        "rank_importance": rank_importance,
        "dealbreaker": dealbreaker,
        "hidden_stay_signal": hidden_stay_signal,
    }


# ═══════════════════════════════════════════════════════════════════════
# 2. 多信号目标推断
# ═══════════════════════════════════════════════════════════════════════

GOAL_MAP = {
    "a": "stay_abroad",
    "b": "experience_then_return",
    "c": "credential",
    "d": "academic",
    "e": "exploring",
}


def infer_goal_type(parsed: Dict[str, Any]) -> tuple[str, float]:
    """
    用 A1(显性) × D3(留vs名气) × F4(底线) × E(签证) 交叉推导。
    返回 (inferred_goal, confidence 0-1)
    """
    hypothesis = GOAL_MAP.get(parsed["goal_hypothesis"], "exploring")
    d3 = parsed["value_weights"].get("stay_vs_brand", 0.5)  # 0.2=留, 0.8=名气
    dealbreaker = parsed.get("dealbreaker")
    signals = parsed.get("destination_signals", {})

    # 收集投票
    votes: Dict[str, float] = {
        "stay_abroad": 0,
        "experience_then_return": 0,
        "credential": 0,
        "academic": 0,
        "exploring": 0,
    }

    # A1 显性声明（权重 0.4）
    votes[hypothesis] += 0.4

    # D3 行为信号（权重 0.25）
    if d3 < 0.4:   # 选了"留下来"
        votes["stay_abroad"] += 0.25
    elif d3 > 0.6:  # 选了"名气"
        votes["credential"] += 0.15
        votes["experience_then_return"] += 0.10

    # F4 底线信号（权重 0.2）
    if dealbreaker == "no_recognition":
        votes["credential"] += 0.2
    elif dealbreaker == "unemployment":
        votes["stay_abroad"] += 0.12
        votes["experience_then_return"] += 0.08
    elif dealbreaker == "no_learning":
        votes["academic"] += 0.2

    # E模块签证信号（权重 0.15）
    h1b = signals.get("h1b_tolerance")
    if h1b == "acceptable":
        votes["stay_abroad"] += 0.15
    elif h1b == "main_concern":
        votes["stay_abroad"] -= 0.1
        votes["experience_then_return"] += 0.1

    hk_stay = signals.get("hk_stay_plan")
    if hk_stay == "permanent":
        votes["stay_abroad"] += 0.15
    elif hk_stay == "return":
        votes["credential"] += 0.1

    # D9 场景题信号（权重 0.15）
    hidden_stay = parsed.get("hidden_stay_signal")
    if hidden_stay == "strong_stay":
        votes["stay_abroad"] += 0.15
    elif hidden_stay == "open_to_stay":
        votes["stay_abroad"] += 0.08
        votes["experience_then_return"] += 0.05
    elif hidden_stay == "firm_return":
        votes["credential"] += 0.1
        votes["experience_then_return"] += 0.05

    # 找最高票
    inferred = max(votes, key=votes.get)
    top_score = votes[inferred]

    # 置信度 = 最高票 / (最高票 + 次高票)
    sorted_votes = sorted(votes.values(), reverse=True)
    confidence = top_score / (top_score + sorted_votes[1]) if (top_score + sorted_votes[1]) > 0 else 0.5

    return inferred, round(min(1.0, confidence), 2)


def infer_archetype(parsed: Dict[str, Any]) -> str:
    """
    Infer user archetype based on D_drive, D_priority, and cross-signals.
    Returns: career / academic / creative / social_impact / exploring
    """
    drive = parsed.get("drive", "unsure")
    priority = parsed.get("priority", "employment")
    goal = parsed.get("goal_hypothesis", "e")

    # Direct mapping from drive
    if drive == "career":
        return "career"
    if drive == "academic":
        return "academic"
    if drive == "creative":
        return "creative"
    if drive == "impact":
        return "social_impact"
    if drive == "growth":
        # Disambiguate growth: check priority
        if priority in ("faculty", "social_focus"):
            return "academic"
        if priority in ("resources",):
            return "creative"
        if priority in ("community",):
            return "social_impact"
        return "exploring"

    # drive == "unsure": use other signals
    if goal == "d":  # academic
        return "academic"
    if priority == "employment" or priority == "alumni_network":
        return "career"
    if priority == "resources":
        return "creative"
    if priority == "social_focus":
        return "social_impact"

    return "exploring"


# ═══════════════════════════════════════════════════════════════════════
# 3. 认知冲突检测
# ═══════════════════════════════════════════════════════════════════════

def detect_conflicts(parsed: Dict[str, Any], inferred_goal: str, raw_answers: Dict[str, Any] = None) -> List[Dict[str, str]]:
    conflicts: List[Dict[str, str]] = []

    hypothesis = GOAL_MAP.get(parsed["goal_hypothesis"], "exploring")

    # helper to read raw answer values
    def val(key: str, default=None):
        if raw_answers:
            return raw_answers.get(key, default)
        return default

    # ── 目标-行为冲突 ──
    if hypothesis != inferred_goal and hypothesis != "exploring":
        # Check for dual-track strategy: user has clear fallback + D3=both/brand
        d3_val = parsed["value_weights"].get("stay_vs_brand", 0.5)
        is_dual_track = (
            parsed["fallback_strategy"] == "brand_hedge"  # A2=a "牌子回国也能用"
            and d3_val >= 0.5  # D3 chose "both" or "brand"
        )

        if is_dual_track:
            conflicts.append({
                "type": "dual_track_strategy",
                "desc": "你同时考虑了留下和回国两条路径",
                "insight": "这是一种理性的双轨策略——先争取留下，同时确保回国也有好选择。建议选校时兼顾两方面：选留下来可能性大的项目，同时确保学校在国内也有认知度。",
            })
        else:
            conflict_msgs = {
                ("stay_abroad", "credential"): (
                    "你说想留在海外，但选校时更看重回国名气——你可能本质上是「想留但怕留不下」型。"
                    "建议：选校时兼顾留下来的可能性和回国的保底价值。"
                ),
                ("credential", "stay_abroad"): (
                    "你说目标是刷学历回国，但行为上更看重留下来的可能——也许你比自己以为的更想留。"
                    "建议：认真评估目的地的工签和移民政策。"
                ),
                ("stay_abroad", "experience_then_return"): (
                    "你说要长期留海外，但底线设置偏向回国——你可能是「优先尝试留下，留不下就回」型。"
                ),
            }
            msg = conflict_msgs.get((hypothesis, inferred_goal))
            if msg:
                conflicts.append({
                    "type": "goal_behavior_mismatch",
                    "desc": "你在目标和选校偏好上有多元考量",
                    "insight": msg,
                })

    # ── 风险冲突 ──
    risk = parsed["risk_profile"]
    mix = parsed["application_mix"]
    reach_heavy = mix.get("reach", 0) > 0.4

    # Check for classic reach+safety strategy (D6=aggressive + D7=conservative)
    d6_aggressive = val("D6") == "A" if raw_answers else parsed["variance_tolerance"] > 0.6
    d7_conservative = val("D7") == "B" if raw_answers else parsed["downside_tolerance"] < 0.4
    f1_val = val("F1")

    if risk == "conservative" and reach_heavy:
        # D6冲+D7保底 = 经典策略，非冲突
        if d6_aggressive and d7_conservative and f1_val in ("b", "c", "d"):
            pass  # classic reach+safety strategy, skip conflict
        else:
            conflicts.append({
                "type": "risk_inconsistency",
                "desc": "你的风险偏好和选校配方体现了不同的策略倾向",
                "insight": "你可能是「嘴上想冲但心里求稳」型。建议以主申为主，冲刺校控制在1-2个。",
            })

    if risk == "aggressive" and mix.get("safety", 0) > 0.4:
        # D6冲+D7保底 = 经典策略，非冲突
        if d6_aggressive and d7_conservative and f1_val in ("b", "c", "d"):
            pass  # classic reach+safety strategy, skip conflict
        else:
            conflicts.append({
                "type": "risk_inconsistency",
                "desc": "你的风险偏好和选校配方体现了不同的策略倾向",
                "insight": "你其实比自己以为的更保守，这不是坏事。建议保留当前配方，它更符合你的真实风格。",
            })

    # ── 目的地-签证冲突 ──
    dest = set(parsed["destination_preference"] or [])
    signals = parsed["destination_signals"]

    if "US" in dest and signals.get("h1b_tolerance") == "main_concern":
        conflicts.append({
            "type": "destination_visa_conflict",
            "desc": "你对美国有兴趣但也担心H1B不确定性",
            "insight": "建议同时考虑加拿大/澳洲（移民友好）或港新（亚洲枢纽）作为Plan B。",
        })

    if "UK" in dest and signals.get("e_uk1") in ("c", "很介意"):
        conflicts.append({
            "type": "destination_duration_conflict",
            "desc": "你选了英国但很介意1年制太短",
            "insight": "英国硕士多为1年制，如果在意学习深度，建议考虑美国2年制或欧陆项目。",
        })

    # ── 预算-排名冲突 ──
    budget = parsed["budget_tier"]
    rank_imp = parsed["rank_importance"]
    if budget >= 4 and rank_imp >= 8:
        conflicts.append({
            "type": "budget_rank_conflict",
            "desc": "你预算紧张但极度看重排名",
            "insight": "高排名项目通常学费不低。建议关注欧陆免学费名校（如ETH/TU Delft）或有高奖学金率的项目。",
        })

    # ── 决策自主性冲突 ──
    if parsed.get("is_parent_driven"):
        if hypothesis == "exploring" or parsed.get("drive") == "unsure":
            conflicts.append({
                "type": "agency_unclear",
                "desc": "你可能还在摸索自己的方向",
                "insight": "看起来留学决策中有家人的参与。建议先明确自己最想要什么——系统的推荐会尽量兼顾多方需求，但最终选择应该是你自己的。",
            })

    # ── 跨专业提醒 ──
    if parsed.get("is_cross_major"):
        conflicts.append({
            "type": "cross_major_note",
            "desc": "你的目标方向与本科专业不同",
            "insight": "跨专业申请完全可行，但需要在PS中展示转方向的动机和准备。部分项目明确欢迎跨专业背景（如conversion课程），系统会优先推荐这类项目。",
        })

    # ── 在职/已婚特殊提醒 ──
    if parsed.get("is_married") and parsed.get("is_working"):
        conflicts.append({
            "type": "life_stage_consideration",
            "desc": "在职+已婚身份需要特别考量",
            "insight": "配偶签证政策、生活成本、职业中断等因素会影响选校。建议重点关注配偶可工作的目的地，以及提供在职/part-time选项的项目。",
        })

    return conflicts


# ═══════════════════════════════════════════════════════════════════════
# 4. 隐藏风险检测
# ═══════════════════════════════════════════════════════════════════════

def detect_hidden_risks(parsed: Dict[str, Any], inferred_goal: str) -> List[str]:
    risks: List[str] = []

    # 抗压 + 目标高压环境
    if parsed["stress_tolerance"] < 0.4:
        if inferred_goal == "stay_abroad":
            risks.append("你的抗压偏好偏低，但留海外找工通常压力很大（H1B抽签、面试轮次多），请提前做好心理准备")
        if parsed.get("destination_preference") and "US" in parsed["destination_preference"]:
            risks.append("美国硕士节奏普遍快、竞争激烈，建议优先选择节奏平缓的项目")

    # 社恐 + 选了大城市networking导向
    if parsed["extraversion"] < 0.3 and parsed["city_preference"] == "large":
        risks.append("你偏好安静但选了大城市——大城市项目通常更强调networking和social，可能有社交压力")

    # 独立性低 + 文化距离远
    if parsed["independence_level"] < 0.4 and parsed["culture_openness"] < 0.4:
        dest = set(parsed.get("destination_preference", []))
        if dest & {"US", "UK", "EU"}:
            risks.append("你的独立性和文化适应力偏低，但选了文化距离较远的目的地。建议优先考虑港新或有成熟华人社区的城市")

    # 预算紧 + 无奖学金经验
    if parsed["budget_tier"] >= 4 and "publication" not in (parsed.get("experience_tags") or []):
        risks.append("你预算紧张但缺少论文/科研经历，申请奖学金的竞争力有限。建议关注欧陆免学费项目或TA/RA机会多的学校")

    # 没想清楚
    if inferred_goal == "exploring" and parsed["risk_profile"] == "aggressive":
        risks.append("你还没想清楚目标但风险偏好激进——没有明确目标时冲刺高难度项目，全聚德风险很高")

    # Gap year
    if parsed.get("has_gap_year"):
        risks.append("Gap year申请者需要在PS中清晰解释这段经历的成长——这可以是优势，但需要narrative支撑")

    # Over 30
    if parsed.get("is_over_30"):
        risks.append("30岁以上申请者的核心优势是工作经验和成熟度，建议优先关注看重工作背景的项目（如MBA、MPA、Executive类）")

    # Parent driven + low agency
    if parsed.get("is_parent_driven") and parsed.get("drive") in ("unsure", "growth"):
        risks.append("家人主导的留学决策可能导致目标与个人兴趣脱节——建议在测评结果基础上，和家人做一次坦诚的沟通")

    return risks


# ═══════════════════════════════════════════════════════════════════════
# 5. 决策画像生成
# ═══════════════════════════════════════════════════════════════════════

def generate_profile_summary(parsed: Dict[str, Any], inferred_goal: str) -> str:
    """生成一句话决策画像"""
    parts: list[str] = []

    # 用户原型
    archetype_labels = {
        "career": "职业发展型",
        "academic": "学术探索型",
        "creative": "创作导向型",
        "social_impact": "社会影响型",
        "exploring": "探索未定型",
    }
    parts.insert(0, archetype_labels.get(infer_archetype(parsed), "探索未定型"))

    # 风险
    risk_labels = {"aggressive": "高风险偏好", "balanced": "风险中性", "conservative": "稳健型"}
    parts.append(risk_labels.get(parsed["risk_profile"], "风险中性"))

    # 目标
    goal_labels = {
        "stay_abroad": "留海外导向",
        "experience_then_return": "体验后回国",
        "credential": "学历镀金",
        "academic": "学术深造",
        "exploring": "探索未定",
    }
    parts.append(goal_labels.get(inferred_goal, "探索未定"))

    # 最看重什么
    vw = parsed["value_weights"]
    if vw.get("academic_vs_career", 0.5) > 0.6:
        parts.append("就业优先")
    elif vw.get("academic_vs_career", 0.5) < 0.4:
        parts.append("学术优先")

    if vw.get("rank_vs_cost", 0.5) > 0.6:
        parts.append("性价比导向")
    elif vw.get("rank_vs_cost", 0.5) < 0.4:
        parts.append("排名导向")

    return " + ".join(parts)


# ═══════════════════════════════════════════════════════════════════════
# 6. API 路由
# ═══════════════════════════════════════════════════════════════════════

def _default_result(user_id: int) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "id": 0,
        "user_id": user_id,
        "assessment_type": "master_fit",
        "status": "draft",
        "raw_answers": {},
        "inferred_goal_type": None,
        "goal_confidence": 0,
        "decision_profile_summary": None,
        "conflicts": [],
        "hidden_risks": [],
        "created_at": now,
        "updated_at": now,
    }


@router.get("/me")
async def get_my_assessment(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessment = (
        db.query(models.Assessment)
        .filter(
            models.Assessment.user_id == current_user.id,
            models.Assessment.assessment_type == "master_fit",
        )
        .order_by(models.Assessment.updated_at.desc(), models.Assessment.id.desc())
        .first()
    )
    if assessment:
        return assessment
    return _default_result(current_user.id)


@router.put("/me")
async def save_my_assessment(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    提交测评答案 → 推断引擎 → 存入 Assessment

    请求体：{
        "answers": {A1: "a", B2: 3.6, C1: "b", D1: "A", ...},
        "status": "submitted"  // 或 "draft"
    }
    """
    raw_answers = payload.get("answers", {})
    status = payload.get("status", "draft")

    # ── 推断引擎 ──
    parsed = parse_answers(raw_answers)
    inferred_goal, goal_confidence = infer_goal_type(parsed)
    conflicts = detect_conflicts(parsed, inferred_goal, raw_answers)
    hidden_risks = detect_hidden_risks(parsed, inferred_goal)
    profile_summary = generate_profile_summary(parsed, inferred_goal)

    # ── 写入 Assessment ──
    assessment = (
        db.query(models.Assessment)
        .filter(
            models.Assessment.user_id == current_user.id,
            models.Assessment.assessment_type == "master_fit",
        )
        .order_by(models.Assessment.updated_at.desc(), models.Assessment.id.desc())
        .first()
    )

    if not assessment:
        assessment = models.Assessment(user_id=current_user.id, assessment_type="master_fit")
        db.add(assessment)

    # 原始答案
    assessment.raw_answers = raw_answers
    assessment.status = status

    # 推断结果
    assessment.inferred_goal_type = inferred_goal
    assessment.goal_confidence = goal_confidence
    assessment.goal_hypothesis = parsed["goal_hypothesis"]
    assessment.fallback_strategy = parsed["fallback_strategy"]
    assessment.destination_preference = parsed["destination_preference"]

    # 背景
    assessment.undergrad_field = parsed["undergrad_field"]
    assessment.target_fields = parsed["target_fields"]
    assessment.school_tier = parsed["school_tier"]
    assessment.gpa_raw = parsed["gpa_raw"]
    assessment.experience_tags = parsed["experience_tags"]
    assessment.language_tier = parsed["language_tier"]
    assessment.has_secondary_language = parsed["has_secondary_language"]
    assessment.budget_tier = parsed["budget_tier"]

    # 性格-环境
    assessment.city_preference = parsed["city_preference"]
    assessment.chinese_ratio_pref = parsed["chinese_ratio_pref"]
    assessment.lifestyle_floor = parsed["lifestyle_floor"]
    assessment.safety_weight = parsed["safety_weight"]
    assessment.independence_level = parsed["independence_level"]
    assessment.culture_openness = parsed["culture_openness"]
    assessment.extraversion = parsed["extraversion"]
    assessment.stress_tolerance = parsed["stress_tolerance"]

    # 价值观 + 风险
    assessment.value_weights = parsed["value_weights"]
    assessment.variance_tolerance = parsed["variance_tolerance"]
    assessment.downside_tolerance = parsed["downside_tolerance"]
    assessment.risk_profile = parsed["risk_profile"]

    # 配方
    assessment.application_mix = parsed["application_mix"]
    assessment.destination_diversity = parsed["destination_diversity"]
    assessment.rank_importance = parsed["rank_importance"]
    assessment.dealbreaker = parsed["dealbreaker"]

    # 目的地信号
    assessment.destination_signals = parsed["destination_signals"]

    # 新增字段
    assessment.class_rank = parsed.get("class_rank")
    assessment.work_years = parsed.get("work_years")
    assessment.gre_tier = parsed.get("gre_tier")
    assessment.personal_context = parsed.get("personal_context")
    assessment.is_cross_major = parsed.get("is_cross_major")
    assessment.drive = parsed.get("drive")
    assessment.priority = parsed.get("priority")
    assessment.archetype = infer_archetype(parsed)

    # 解释层
    assessment.conflicts = conflicts
    assessment.hidden_risks = hidden_risks
    assessment.decision_profile_summary = profile_summary

    db.commit()
    db.refresh(assessment)

    mix = parsed["application_mix"]
    return {
        "id": assessment.id,
        "status": assessment.status,
        "inferred_goal": inferred_goal,
        "goal_confidence": goal_confidence,
        "archetype": infer_archetype(parsed),
        "decision_profile": profile_summary,
        "conflicts": conflicts,
        "hidden_risks": hidden_risks,
        "risk_profile": parsed["risk_profile"],
        "application_mix": {
            "reach": round(mix.get("reach", 0.3) * 100),
            "target": round(mix.get("target", 0.4) * 100),
            "safety": round(mix.get("safety", 0.3) * 100),
        },
    }
