# backend/app/routers/matching.py
"""
Optima 选校匹配引擎 v3

架构：
  UserProfile(Assessment) × Program → 项目级匹配
  不是"算一个全局分然后排序"，而是每个项目单独评估

匹配流程：
  1. 按终极目标分流 → 确定权重体系
  2. 硬性匹配（录取概率 + 学术 + 经济）
  3. 软性匹配（性格-环境 + 生活方式）
  4. 签证移民匹配
  5. 风险对冲评估
  6. 解释生成（为什么推荐 + 风险提示）
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app import models
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/api/matching",
    tags=["项目匹配"],
    responses={404: {"description": "Not found"}},
)


# ═══════════════════════════════════════════════════════════════════════
# 权重体系：按终极目标分流
# ═══════════════════════════════════════════════════════════════════════

# 每个 goal_type 对应完全不同的权重分配
GOAL_WEIGHT_PROFILES: Dict[str, Dict[str, float]] = {
    "stay_abroad": {
        "admission":    0.12,
        "career":       0.20,
        "visa":         0.18,
        "location":     0.12,
        "cost":         0.05,
        "soft_fit":     0.08,
        "risk_hedge":   0.10,
        "field_match":  0.15,
    },
    "experience_then_return": {
        "admission":    0.12,
        "career":       0.15,
        "visa":         0.08,
        "location":     0.08,
        "cost":         0.08,
        "soft_fit":     0.07,
        "risk_hedge":   0.10,
        "brand":        0.15,
        "field_match":  0.17,
    },
    "credential": {
        "admission":    0.12,
        "brand":        0.28,
        "cost":         0.12,
        "career":       0.05,
        "visa":         0.00,
        "location":     0.05,
        "soft_fit":     0.08,
        "risk_hedge":   0.12,
        "field_match":  0.18,
    },
    "academic": {
        "admission":    0.10,
        "academic_quality": 0.25,
        "career":       0.05,
        "visa":         0.05,
        "cost":         0.10,
        "soft_fit":     0.08,
        "risk_hedge":   0.07,
        "brand":        0.10,
        "field_match":  0.20,
    },
    "exploring": {
        "admission":    0.12,
        "career":       0.12,
        "visa":         0.08,
        "location":     0.08,
        "cost":         0.10,
        "soft_fit":     0.12,
        "risk_hedge":   0.08,
        "brand":        0.13,
        "field_match":  0.17,
    },
}

# Primary weight selection is by ARCHETYPE, not just goal_type
ARCHETYPE_WEIGHT_PROFILES: Dict[str, Dict[str, float]] = {
    "career": {
        "admission": 0.12, "career": 0.22, "visa": 0.15,
        "location": 0.10, "cost": 0.08, "soft_fit": 0.05,
        "risk_hedge": 0.08, "brand": 0.05, "field_match": 0.15,
    },
    "academic": {
        "admission": 0.12, "academic_quality": 0.25, "field_match": 0.20,
        "brand": 0.10, "cost": 0.10, "soft_fit": 0.08,
        "risk_hedge": 0.05, "career": 0.05, "visa": 0.05,
    },
    "creative": {
        "admission": 0.10, "field_match": 0.25, "soft_fit": 0.15,
        "location": 0.15, "cost": 0.10, "academic_quality": 0.10,
        "brand": 0.05, "career": 0.05, "risk_hedge": 0.05,
    },
    "social_impact": {
        "admission": 0.12, "field_match": 0.20, "academic_quality": 0.15,
        "soft_fit": 0.12, "location": 0.10, "cost": 0.10,
        "career": 0.08, "visa": 0.08, "brand": 0.05,
    },
    "exploring": {
        "admission": 0.12, "field_match": 0.15, "brand": 0.12,
        "career": 0.12, "soft_fit": 0.12, "cost": 0.10,
        "location": 0.10, "visa": 0.08, "risk_hedge": 0.09,
    },
}

# 不在上面的 key 默认为 0
def _get_weight(archetype: str, goal_type: str, dimension: str) -> float:
    profile = ARCHETYPE_WEIGHT_PROFILES.get(archetype)
    if profile:
        return profile.get(dimension, 0.0)
    # fallback to goal-based
    profile = GOAL_WEIGHT_PROFILES.get(goal_type, GOAL_WEIGHT_PROFILES["exploring"])
    return profile.get(dimension, 0.0)


# ═══════════════════════════════════════════════════════════════════════
# 专业方向匹配
# ═══════════════════════════════════════════════════════════════════════

# Two-pass matching: long phrases first (high specificity), then short keywords.
# This prevents "management" in mba_mgmt from stealing "Marketing Management".
_FIELD_RULES_PRIORITY: list[tuple[str, list[str]]] = [
    # ── Pass 1: Multi-word phrases (high specificity) ──
    ("marketing", ["integrated marketing", "marketing communication", "marketing management",
                   "brand management", "digital marketing", "marketing analytics",
                   "marketing science", "advertising", "public relation"]),
    # film_media BEFORE media_comm so "film, television", "media arts" don't leak into media_comm
    ("film_media", ["film production", "media production", "film, television",
                    "digital media production", "media arts"]),
    ("media_comm", ["media and communication", "media studies", "new media", "digital media",
                    "communication management", "communication science", "journalism",
                    "media practice", "media analytics",
                    "communication, culture"]),
    ("design", ["human-computer interaction", "human centered design", "interaction design",
                "ux track", "hci", "graphic design", "industrial design",
                "service design", "visual communication", "design informatics",
                "design engineering", "design for interaction"]),
    ("ds_ba", ["data science", "business analytics", "data analytics", "data engineering"]),
    ("cs", ["computer science", "computer engineering", "information system",
            "information technology", "information management", "cybersecurity",
            "artificial intelligence", "machine learning", "computing"]),
    ("ee", ["electrical engineering", "electronic engineering", "electrical and computer"]),
    ("finance", ["financial engineering", "financial economics", "financial technology",
                 "financial mathematics", "financial analysis", "fintech"]),
    ("civil_env", ["civil engineering", "environmental engineering", "urban planning",
                   "sustainable development", "construction management"]),
    ("mech", ["mechanical engineering", "aerospace engineering", "materials science"]),
    ("energy_sustain", ["sustainable energy", "renewable energy", "energy science",
                        "climate change", "energy system", "energy futures"]),
    ("dev_studies", ["development studies", "international development", "global development",
                     "human geography"]),
    ("cultural_studies", ["cultural studies", "critical theory", "cultural analysis"]),
    ("gender_queer", ["gender studies", "gender and sexuality", "queer studies",
                      "women's studies", "feminist"]),
    ("digital_humanities", ["digital humanities"]),
    ("fine_art", ["fine art", "studio art", "visual art"]),
    ("creative_writing", ["creative writing"]),
    ("ed_tech", ["education technology", "learning design", "instructional"]),
    ("human_rights", ["human rights", "social justice"]),
    ("social_work", ["social work"]),
    ("supply_chain", ["supply chain", "operations management", "logistics"]),
    ("env_science", ["environmental science", "earth science"]),
    ("public_health", ["public health", "epidemiology", "global health", "health science"]),
    ("health_mgmt", ["health management", "hospital management", "health policy"]),
    ("policy", ["public policy", "public administration", "public affairs"]),
    ("ir", ["international relations", "international affairs", "foreign service"]),
    ("area_studies", ["area studies", "asian studies", "middle east", "african studies",
                      "latin american", "european studies"]),
    ("architecture", ["architecture"]),
    ("biotech", ["biotechnology", "bioinformatics"]),

    # ── Pass 2: Single keywords (lower specificity, checked after phrases) ──
    ("marketing", ["marketing"]),
    ("media_comm", ["communication", "communications", "media", "journalism"]),
    ("finance", ["finance", "accounting", "banking"]),
    ("econ", ["economics"]),
    ("ds_ba", ["analytics"]),
    ("cs", ["informatics", "information science"]),
    ("mba_mgmt", ["business administration", "mba"]),
    ("education", ["education", "tesol", "teaching"]),
    ("law", ["law", "llm", "legal"]),
    ("health", ["health", "biomedical", "neuroscience", "molecular bio"]),
    ("science", ["physics", "chemistry", "biology", "molecular", "mathematics"]),
    ("philosophy", ["philosophy"]),
    ("comp_lit", ["comparative literature", "literature", "rhetoric"]),
    ("history", ["history"]),
    ("sociology", ["sociology", "anthropology", "social sciences"]),
    ("psychology", ["psychology", "cognitive"]),
    ("music_perf", ["music", "performing arts", "theatre", "theater", "dance"]),
    ("film_media", ["film", "cinema", "animation", "screenwriting", "game design", "games"]),
    ("design", ["design"]),
    ("gender_queer", ["sexuality"]),
    ("cultural_studies", ["humanities"]),
    ("policy", ["governance"]),
    ("energy_sustain", ["energy", "sustainable", "sustainability", "renewable", "climate"]),
    ("nursing", ["nursing"]),
    ("engineering_general", ["engineering"]),
    ("mba_mgmt", ["management", "international business"]),
]

FIELD_AFFINITY = {
    "cs_ee": ["cs", "ds_ba", "ee", "energy_sustain", "biomed_eng", "digital_humanities"],
    "mech_civil": ["mech", "civil_env", "energy_sustain", "env_science"],
    "math_stat": ["cs", "ds_ba", "finance", "econ", "math_stat", "physics"],
    "finance_econ": ["finance", "econ", "ds_ba", "mba_mgmt", "accounting", "supply_chain"],
    "business": ["mba_mgmt", "marketing", "finance", "ds_ba", "accounting", "supply_chain"],
    "media_comm": ["marketing", "media_comm", "creative_writing", "design", "film_media"],
    "education": ["education", "ed_tech", "policy", "psychology"],
    "social_sci": ["policy", "ir", "dev_studies", "sociology", "psychology", "social_work", "gender_queer", "cultural_studies", "human_rights"],
    "law": ["law", "human_rights", "policy", "ir"],
    "language_lit": ["education", "linguistics", "comp_lit", "cultural_studies", "digital_humanities", "creative_writing", "area_studies"],
    "science": ["cs", "ds_ba", "physics", "chemistry", "biology", "env_science", "math_stat", "public_health", "biotech"],
    "art_design": ["design", "fine_art", "film_media", "architecture", "media_comm", "music_perf"],
    "health": ["public_health", "health_mgmt", "biotech", "nursing", "biomed_eng"],
    "other": [],
}


def infer_program_field(program_name: str) -> str:
    """Two-pass matching: long phrases first, then short keywords."""
    name_lower = program_name.lower()
    for field, keywords in _FIELD_RULES_PRIORITY:
        for kw in keywords:
            if kw in name_lower:
                return field
    return "other"


# 中文"人文" = non-STEM 大类, 包括传统 humanities + 社科 + 艺术 + 法学 + 教育.
# 用于识别"理工不匹配"的硬惩罚, 避免人文画像被 STEM 占据推荐前排.
_HARD_STEM_FIELDS = {
    "cs", "ee", "mech", "civil_env", "biotech", "env_science", "science",
    "math_stat", "engineering_general", "biomed_eng", "energy_sustain",
}

_HUMANITIES_BROAD_FIELDS = {
    # humanities pure
    "philosophy", "comp_lit", "history", "creative_writing", "fine_art",
    "music_perf", "film_media", "digital_humanities", "linguistics",
    # social sciences
    "sociology", "psychology", "ir", "dev_studies", "cultural_studies",
    "gender_queer", "area_studies", "policy", "social_work", "human_rights",
    # education / arts / law / comm
    "education", "ed_tech", "media_comm", "design", "architecture", "law",
}

_HUMANITIES_UNDERGRAD = {"language_lit", "social_sci", "art_design", "education", "law", "media_comm"}


def _is_humanities_leaning(a: models.Assessment) -> bool:
    """
    人文倾向画像探测器. 严格定义:
      - 若用户显式选了 target_fields, 必须 100% 落在人文大类才算 (避免误伤交叉申请者)
      - 若没选 target_fields, 退到本科背景判断
    """
    targets = set(a.target_fields or [])
    if targets:
        return targets.issubset(_HUMANITIES_BROAD_FIELDS)
    return (a.undergrad_field or "") in _HUMANITIES_UNDERGRAD


def score_field_match(a: models.Assessment, p: models.Program) -> float:
    """专业方向匹配度评分"""
    program_field = infer_program_field(p.program_name or "")
    target_fields = a.target_fields or []
    undergrad_field = a.undergrad_field or ""
    is_cross_major = getattr(a, 'is_cross_major', False)

    # Direct match to user's target
    if program_field in target_fields:
        return 100.0

    # Cross-major: user explicitly wants this direction even if background doesn't match
    # Don't penalize — they already acknowledged the cross-major in B6
    if is_cross_major:
        # Still give 100 for target match (already checked above)
        # For non-target programs, check affinity more generously
        affinity = FIELD_AFFINITY.get(undergrad_field, [])
        if program_field in affinity:
            return 65.0
        return 15.0  # still low for non-target, non-affinity programs

    # Normal path: check affinity
    affinity = FIELD_AFFINITY.get(undergrad_field, [])
    if program_field in affinity:
        return 70.0

    return 10.0


# ═══════════════════════════════════════════════════════════════════════
# 各维度评分函数（项目级，不是全局）
# ═══════════════════════════════════════════════════════════════════════

def score_admission(a: models.Assessment, p: models.Program) -> float:
    """录取概率评估 — 基于项目的具体要求，不是全局段位"""
    score = 0.0
    total_weight = 0.0

    # GPA 匹配（项目级：对比该项目的avg_gpa）
    if p.avg_gpa and a.gpa_raw:
        total_weight += 40
        diff = a.gpa_raw - p.avg_gpa
        if diff >= 0.1:
            score += 40       # 高于项目中位数
        elif diff >= -0.1:
            score += 30       # 持平
        elif diff >= -0.3:
            score += 15       # 略低，有机会
        else:
            score += 5        # 差距大

    # 语言匹配
    if a.language_tier:
        total_weight += 20
        lang_scores = {"a": 20, "b": 15, "c": 10, "d": 3, "e": 15}
        score += lang_scores.get(a.language_tier, 10)
        # 小语种加分
        if p.requires_secondary_language and a.has_secondary_language:
            score += 5

    # 本科背景匹配
    if a.school_tier:
        total_weight += 20
        tier_map = {
            "a": 20, "b": 17, "c": 13, "d": 8,  # 清北/C9, 985, 211, 双非
            "e": 19, "f": 14, "g": 9,             # 海本 tiers
        }
        tier_score = tier_map.get(a.school_tier, 10)
        # 项目难度调节：top项目对背景要求高
        if p.school_tier in ("HYPMS", "Top10") and tier_score < 15:
            tier_score = max(0, tier_score - 5)  # 双非冲Top10额外惩罚
        score += tier_score

    # 经历匹配
    tags = set(a.experience_tags or [])
    if tags:
        total_weight += 20
        exp_score = 0
        if "publication" in tags:
            exp_score += 8
        if "research" in tags:
            exp_score += 5
        if "intern_2plus" in tags:
            exp_score += 7
        elif "intern_1" in tags:
            exp_score += 4
        if "fulltime" in tags:
            exp_score += 5
        score += min(20, exp_score)

    # GRE/GMAT scoring
    gre_tier = getattr(a, 'gre_tier', None)
    if gre_tier and gre_tier != "no_gre":
        total_weight += 15
        gre_scores = {
            "gre_325plus": 15, "gre_315": 12, "gre_305": 8,
            "gmat_700plus": 15, "gmat_650": 11,
        }
        score += gre_scores.get(gre_tier, 5)

    # Class rank bonus
    class_rank = getattr(a, 'class_rank', None)
    if class_rank and class_rank != "unknown":
        total_weight += 10
        rank_scores = {"top5": 10, "top15": 8, "top30": 6, "top50": 4, "below50": 2}
        score += rank_scores.get(class_rank, 0)

    # Work experience enhancement
    work_years = getattr(a, 'work_years', None)
    if work_years and work_years != "none":
        total_weight += 10
        year_scores = {"lt1": 3, "1_3": 6, "3_5": 9, "5plus": 10}
        score += year_scores.get(work_years, 5)

    if total_weight == 0:
        return 50.0
    return min(100.0, (score / total_weight) * 100)


def score_career(a: models.Assessment, p: models.Program) -> float:
    """就业前景匹配"""
    score = 0.0

    # 就业率
    if p.employment_rate_3month:
        score += min(30, p.employment_rate_3month * 30)

    # 起薪
    if p.avg_starting_salary_usd:
        if p.avg_starting_salary_usd >= 90000:
            score += 25
        elif p.avg_starting_salary_usd >= 70000:
            score += 20
        elif p.avg_starting_salary_usd >= 50000:
            score += 15
        else:
            score += 8

    # Career service
    support_scores = {"强": 20, "high": 20, "中": 12, "medium": 12, "低": 5, "low": 5}
    score += support_scores.get(p.career_support or "", 10)

    # Co-op 加分
    if p.has_coop:
        score += 10

    # 校友网络（用top_employers数量代理）
    if p.top_employers:
        score += min(15, len(p.top_employers) * 3)

    return min(100.0, score)


def score_brand(a: models.Assessment, p: models.Program) -> float:
    """排名/品牌/回国认可度"""
    score = 0.0

    # QS排名（回国最看这个）
    if p.qs_ranking:
        if p.qs_ranking <= 10:
            score += 45
        elif p.qs_ranking <= 30:
            score += 38
        elif p.qs_ranking <= 50:
            score += 30
        elif p.qs_ranking <= 100:
            score += 22
        elif p.qs_ranking <= 200:
            score += 12
        else:
            score += 5

    # 专业排名
    if p.subject_ranking:
        if p.subject_ranking <= 10:
            score += 25
        elif p.subject_ranking <= 30:
            score += 18
        elif p.subject_ranking <= 50:
            score += 12
        else:
            score += 5

    # 回国认可度
    recog_scores = {"高": 20, "high": 20, "中": 12, "medium": 12, "低": 5, "low": 5}
    score += recog_scores.get(p.return_to_china_recognition or "", 10)

    # 用户排名重要性加权
    rank_imp = a.rank_importance or 5
    multiplier = 0.7 + (rank_imp / 10) * 0.6  # rank_importance 1→0.76, 10→1.3
    score *= multiplier

    return min(100.0, score)


def score_academic_quality(a: models.Assessment, p: models.Program) -> float:
    """学术质量（读博/学术目标用）"""
    score = 0.0

    if p.faculty_student_ratio:
        if p.faculty_student_ratio <= 0.1:
            score += 30  # 师生比好
        elif p.faculty_student_ratio <= 0.2:
            score += 20
        else:
            score += 10

    if p.cross_registration:
        score += 15

    # 灵活度高 = 学术自由度高
    flex_scores = {"高": 20, "high": 20, "中": 12, "medium": 12, "低": 5, "low": 5}
    score += flex_scores.get(p.course_flexibility or "", 10)

    # 专业排名对学术目标更重要
    if p.subject_ranking:
        if p.subject_ranking <= 20:
            score += 25
        elif p.subject_ranking <= 50:
            score += 15
        else:
            score += 5

    if p.dual_degree_available:
        score += 10

    return min(100.0, score)


def score_visa(a: models.Assessment, p: models.Program) -> float:
    """签证与移民匹配"""
    score = 0.0
    goal = a.inferred_goal_type or "exploring"

    # 工签时长
    if p.work_visa_duration_months:
        if p.work_visa_duration_months >= 36:
            score += 30  # 3年+ OPT/蓝卡
        elif p.work_visa_duration_months >= 24:
            score += 22  # 2年 PSW
        elif p.work_visa_duration_months >= 12:
            score += 15
        else:
            score += 5

    # 移民友好度
    immig_scores = {"高": 25, "high": 25, "中": 15, "medium": 15, "低": 5, "low": 5}
    score += immig_scores.get(p.immigration_friendly or "", 10)

    # PR路径
    if p.pr_pathway_score:
        score += p.pr_pathway_score * 20

    # STEM对留美特别重要
    if goal == "stay_abroad" and p.country == "美国":
        if p.is_stem:
            score += 15
        else:
            score -= 10  # 非STEM留美极难

    # H1B容忍度调节（来自用户E模块）
    signals = a.destination_signals or {}
    h1b_tol = signals.get("h1b_tolerance")
    if p.country == "美国" and h1b_tol == "main_concern":
        score -= 15  # 用户最怕H1B，美国项目减分

    # 回国认可度（对credential/return型重要）
    if goal in ("credential", "experience_then_return"):
        recog_scores = {"高": 10, "high": 10, "中": 5, "medium": 5}
        score += recog_scores.get(p.return_to_china_recognition or "", 0)

    return max(0.0, min(100.0, score))


def score_location(a: models.Assessment, p: models.Program) -> float:
    """地理位置匹配"""
    score = 0.0

    # 城市偏好
    city_pref = a.city_preference or "any"
    city_tier = (p.city_tier or "").lower()
    if city_pref == "large":
        score += 30 if "大都市" in city_tier or "large" in city_tier else 10
    elif city_pref == "small":
        score += 30 if "大学城" in city_tier or "small" in city_tier else 10
    elif city_pref == "medium":
        score += 25 if "中等" in city_tier or "medium" in city_tier else 15
    else:
        score += 20  # any

    # 城市宜居度
    if p.city_livability:
        score += p.city_livability * 25

    # 产业聚集（对stay_abroad重要）
    if p.employment_industries and len(p.employment_industries) >= 3:
        score += 15

    # 目的地偏好匹配
    dest_pref = set(a.destination_preference or [])
    if dest_pref and p.country:
        country_map = {
            "美国": "US", "英国": "UK", "加拿大": "CA", "澳大利亚": "AU",
            "香港": "HK", "新加坡": "SG", "日本": "JP",
            "德国": "EU", "荷兰": "EU", "法国": "EU", "瑞士": "EU",
        }
        code = country_map.get(p.country, p.country)
        if code in dest_pref or "ALL" in dest_pref:
            score += 20
        else:
            score -= 10  # 不在偏好目的地

    return max(0.0, min(100.0, score))


def score_cost(a: models.Assessment, p: models.Program) -> float:
    """经济性价比"""
    budget = a.budget_tier or 3
    total = p.total_cost_usd or 0

    # 预算 vs 实际成本
    budget_limits = {1: 999999, 2: 70000, 3: 45000, 4: 25000, 5: 15000}
    limit = budget_limits.get(budget, 45000)

    score = 0.0
    if total <= 0:
        score += 30  # 无数据，中性
    elif total <= limit * 0.7:
        score += 40  # 远低于预算
    elif total <= limit:
        score += 30  # 在预算内
    elif total <= limit * 1.3:
        score += 15  # 略超预算
    else:
        score += 0   # 远超预算

    # 奖学金
    if p.scholarship_rate and p.scholarship_rate > 0.3:
        score += 20
    elif p.scholarship_rate and p.scholarship_rate > 0:
        score += 10

    # ROI（薪资/学费）
    if p.avg_starting_salary_usd and total > 0:
        roi = p.avg_starting_salary_usd / (total if total > 0 else 1)
        if roi >= 1.5:
            score += 25
        elif roi >= 1.0:
            score += 18
        elif roi >= 0.5:
            score += 10
        else:
            score += 3

    # 需要奖学金的用户，无奖项目大幅减分
    if budget == 5 and (not p.scholarship_rate or p.scholarship_rate < 0.1):
        score -= 20

    return max(0.0, min(100.0, score))


def score_soft_fit(a: models.Assessment, p: models.Program) -> float:
    """软性匹配（可匹配环境变量 C1-C6）"""
    scores: list[float] = []

    # 中国学生比例偏好
    pref = a.chinese_ratio_pref or "any"
    ratio = p.chinese_student_ratio
    if ratio is not None and pref != "any":
        if pref == "low":
            scores.append(80 if ratio < 0.2 else 50 if ratio < 0.4 else 20)
        elif pref == "moderate":
            scores.append(80 if 0.15 < ratio < 0.5 else 50)
        elif pref == "high":
            scores.append(80 if ratio > 0.3 else 50)
    else:
        scores.append(60)

    # 安全感
    safety_w = a.safety_weight or 0.5
    safety_map = {"高": 1.0, "high": 1.0, "中": 0.6, "medium": 0.6, "低": 0.2, "low": 0.2}
    campus_safe = safety_map.get(p.campus_safety or "", 0.6)
    safety_score = 50 + (campus_safe - (1.0 - safety_w)) * 50
    scores.append(max(0, min(100, safety_score)))

    # 独立性 vs 华人社区支持
    indep = a.independence_level or 0.5
    community_map = {"高": 1.0, "high": 1.0, "中": 0.5, "medium": 0.5, "低": 0.1, "low": 0.1}
    community = community_map.get(p.chinese_community_support or "", 0.5)
    if indep < 0.4:
        # 低独立性用户需要华人社区支持
        scores.append(community * 100)
    else:
        scores.append(60)  # 高独立性不在意

    # 文化开放度 vs 文化距离
    culture_open = a.culture_openness or 0.5
    dist_map = {"低": 0.2, "low": 0.2, "中": 0.5, "medium": 0.5, "高": 0.8, "high": 0.8}
    culture_dist = dist_map.get(p.cultural_distance or "", 0.5)
    if culture_open < 0.4 and culture_dist > 0.6:
        scores.append(25)  # 怕文化冲击 + 高文化距离 = 不匹配
    elif culture_open > 0.7 and culture_dist > 0.6:
        scores.append(85)  # 期待文化冲击 + 高距离 = 很匹配
    else:
        scores.append(60)

    # 生活舒适度底线
    lf = a.lifestyle_floor or 0.5
    livability = p.city_livability or 0.5
    if lf > 0.7 and livability < 0.4:
        scores.append(20)  # 高要求 + 低宜居 = 差
    else:
        scores.append(50 + livability * 40)

    # Identity-based matching
    identity_factors = getattr(a, 'personal_context', []) or []
    # Check if assessment has identity preferences from C_identity
    # For now, this is stored in raw_answers
    raw = getattr(a, 'raw_answers', {}) or {}
    identity_prefs = raw.get("C_identity", [])
    if isinstance(identity_prefs, str):
        identity_prefs = [identity_prefs]

    if "lgbtq" in identity_prefs:
        # Countries with strong LGBTQ+ protections score higher
        lgbtq_friendly = {"荷兰", "加拿大", "英国", "瑞典", "丹麦", "德国", "澳大利亚", "新加坡"}
        lgbtq_hostile = {"日本"}  # less hostile, more invisible
        if p.country in lgbtq_friendly:
            scores.append(85)
        elif p.country in lgbtq_hostile:
            scores.append(40)
        else:
            scores.append(55)

    if "mental_health" in identity_prefs:
        # Proxy: countries with strong university counseling culture
        mh_strong = {"美国", "英国", "加拿大", "澳大利亚", "荷兰"}
        if p.country in mh_strong:
            scores.append(80)
        else:
            scores.append(50)

    return sum(scores) / len(scores) if scores else 50.0


def score_risk_hedge(a: models.Assessment, p: models.Program) -> float:
    """风险对冲评估 — "如果Plan A失败，这个选择能兜底吗？" """
    goal = a.inferred_goal_type or "exploring"
    fallback = a.fallback_strategy or "none"
    score = 0.0

    # 回国保底能力
    if fallback == "brand_hedge":
        # 用户的兜底策略是"学校牌子回国能用"
        recog_map = {"高": 40, "high": 40, "中": 25, "medium": 25, "低": 5, "low": 5}
        score += recog_map.get(p.return_to_china_recognition or "", 15)
        if p.qs_ranking and p.qs_ranking <= 100:
            score += 30
        elif p.qs_ranking and p.qs_ranking <= 200:
            score += 15

    # 跨国流动性
    elif fallback == "mobility":
        if p.immigration_friendly in ("高", "high"):
            score += 30
        if p.pr_pathway_score and p.pr_pathway_score > 0.5:
            score += 20
        if p.exchange_opportunities:
            score += 15
        if p.dual_degree_available:
            score += 15

    # 学术兜底
    elif fallback == "academic":
        if p.faculty_student_ratio and p.faculty_student_ratio <= 0.15:
            score += 30
        if p.cross_registration:
            score += 20
        score += score_academic_quality(a, p) * 0.3

    # 成本敏感兜底
    elif fallback == "cost_sensitive":
        cost_score = score_cost(a, p)
        score += cost_score * 0.6
        if p.scholarship_rate and p.scholarship_rate > 0.5:
            score += 25

    # 无兜底策略 / 高风险偏好
    else:
        score = 50  # 中性

    return min(100.0, score)


# ═══════════════════════════════════════════════════════════════════════
# 风险提示生成（C7/C8 变量 + 项目属性交叉）
# ═══════════════════════════════════════════════════════════════════════

def generate_warnings(a: models.Assessment, p: models.Program) -> List[str]:
    """生成风险提示（不影响分数，但影响用户决策）"""
    warnings: List[str] = []

    # ── 抗压 × 项目压力 ──
    stress = a.stress_tolerance or 0.5
    pressure_map = {"极高": 1.0, "高": 0.75, "中": 0.5, "低": 0.25}
    pressure = pressure_map.get(p.academic_pressure or "", 0.5)
    if stress < 0.4 and pressure > 0.6:
        warnings.append(
            f"抗压提醒：{p.university}的{p.program_name}学业压力{p.academic_pressure}，"
            f"但你的抗压偏好偏低，建议认真评估"
        )

    # ── 社交 × 项目文化 ──
    extrav = a.extraversion or 0.5
    if extrav < 0.3 and p.social_culture and "networking" in (p.social_culture or "").lower():
        warnings.append(
            f"社交提醒：该项目强调networking文化，但你偏好安静环境，可能会有社交压力"
        )
    if extrav > 0.7 and p.isolation_risk in ("高", "high"):
        warnings.append(
            f"孤独风险：该项目所在地孤独感风险较高，你是社交活跃型，可能会不适应"
        )

    # ── 签证刺客 ──
    if p.country == "美国" and not p.is_stem:
        goal = a.inferred_goal_type or ""
        if goal == "stay_abroad":
            warnings.append("签证警告：该项目非STEM，留美仅有1年OPT，H1B机会极有限")

    # ── 中国人比例 ──
    if p.chinese_student_ratio and p.chinese_student_ratio > 0.7:
        warnings.append(
            f"班级构成：中国学生占比约{int(p.chinese_student_ratio*100)}%，"
            f"语言提升和文化体验可能有限"
        )

    # ── 预算超支 ──
    budget_limits = {1: 999999, 2: 70000, 3: 45000, 4: 25000, 5: 15000}
    budget = a.budget_tier or 3
    limit = budget_limits.get(budget, 45000)
    if p.total_cost_usd and p.total_cost_usd > limit * 1.3:
        warnings.append(
            f"预算警告：该项目总费用约${p.total_cost_usd:,}，超出你的预算区间约"
            f"{int((p.total_cost_usd/limit - 1)*100)}%"
        )

    # ── 政策风险 ──
    signals = a.destination_signals or {}
    if p.country == "美国" and signals.get("h1b_tolerance") == "main_concern":
        warnings.append("目标冲突：你最担心H1B不确定性，但选择了美国项目，建议准备Plan B")

    return warnings


# ═══════════════════════════════════════════════════════════════════════
# 推荐理由生成
# ═══════════════════════════════════════════════════════════════════════

def generate_reason(
    a: models.Assessment, p: models.Program,
    breakdown: Dict[str, float], goal: str,
    archetype: str = "exploring",
) -> Dict[str, str]:
    """Generate per-program specific recommendation reason.

    Returns a dict with three fields:
      why  - the top 2 strongest dimensions with specific data
      risk - the weakest dimension or specific warnings
      note - one comparative insight / unique selling point
    """

    # ── helpers ──
    def _school_tier_label(qs: Optional[int]) -> str:
        if not qs:
            return "未上榜"
        if qs <= 10:
            return "顶尖名校"
        if qs <= 30:
            return "世界一流"
        if qs <= 50:
            return "Top50强校"
        if qs <= 100:
            return "百强"
        if qs <= 200:
            return "QS前200"
        return "QS200+"

    def _industry_desc(p_obj: models.Program) -> str:
        industries = getattr(p_obj, "employment_industries", None) or []
        if industries:
            return "、".join(industries[:3]) + "等产业聚集"
        return "综合性城市"

    # ── "why": top 2 strongest dimensions with specific data ──
    sorted_dims = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
    why_parts: list[str] = []

    dim_specific: Dict[str, str] = {}
    # Pre-build specific descriptions for each dimension
    if p.qs_ranking:
        dim_specific["brand"] = f"QS排名第{p.qs_ranking}，{_school_tier_label(p.qs_ranking)}级别"
    else:
        dim_specific["brand"] = f"{p.university}，业内认可度不错"

    if p.is_stem:
        dim_specific["visa"] = f"{p.program_name}是STEM项目，毕业后有3年OPT工作签证"
    elif p.work_visa_duration_months and p.work_visa_duration_months >= 24:
        dim_specific["visa"] = f"毕业后有{p.work_visa_duration_months}个月工签，留下机会较大"
    elif getattr(p, "immigration_friendly", None) in ("高", "high"):
        dim_specific["visa"] = f"{p.country}移民政策友好，拿身份路径清晰"
    else:
        dim_specific["visa"] = f"{p.country}工签政策一般，留下需要额外规划"

    dim_specific["location"] = f"位于{p.city or '未知城市'}，{_industry_desc(p)}"

    if p.avg_starting_salary_usd:
        emp_label = "高" if p.employment_rate_3month and p.employment_rate_3month > 0.8 else "尚可"
        dim_specific["career"] = f"毕业生平均起薪${p.avg_starting_salary_usd:,}，就业率{emp_label}"
    elif p.has_coop:
        dim_specific["career"] = "提供Co-op带薪实习，就业导向强"
    else:
        dim_specific["career"] = "就业服务和校友网络可用"

    if p.avg_gpa:
        gpa_label = "有竞争力" if a.gpa_raw and a.gpa_raw >= p.avg_gpa else "需要其他亮点补充"
        dim_specific["admission"] = f"该项目录取均GPA {p.avg_gpa}，你的{a.gpa_raw or '未填'}{gpa_label}"
    else:
        dim_specific["admission"] = "录取数据有限，但你的背景整体匹配"

    total_cost = p.total_cost_usd or 0
    if total_cost > 0:
        cost_label = "性价比高" if breakdown.get("cost", 0) >= 60 else "费用偏高"
        dim_specific["cost"] = f"总费用约${total_cost:,}，{cost_label}"
    else:
        dim_specific["cost"] = "费用数据暂缺"

    dim_specific["soft_fit"] = "校园氛围和生活环境与你的偏好匹配"
    dim_specific["risk_hedge"] = "作为Plan B兜底能力强"
    if getattr(p, "faculty_student_ratio", None) and p.faculty_student_ratio <= 0.15:
        dim_specific["academic_quality"] = f"师生比{p.faculty_student_ratio:.2f}，学术资源丰富"
    else:
        dim_specific["academic_quality"] = "学术质量扎实"

    for dim, _score in sorted_dims[:2]:
        why_parts.append(dim_specific.get(dim, f"{dim}表现突出"))

    why = "；".join(why_parts)

    # ── "risk": weakest scoring dimension with actual weight ──
    weakest_dim, weakest_score = sorted_dims[-1]
    weight_for_weakest = _get_weight(archetype, goal, weakest_dim)
    if weight_for_weakest == 0 and len(sorted_dims) >= 2:
        for dim, sc in reversed(sorted_dims):
            if _get_weight(archetype, goal, dim) > 0:
                weakest_dim, weakest_score = dim, sc
                break

    risk_specific: Dict[str, str] = {}
    if total_cost > 0:
        budget_limits = {1: 999999, 2: 70000, 3: 45000, 4: 25000, 5: 15000}
        budget = a.budget_tier or 3
        limit = budget_limits.get(budget, 45000)
        if total_cost > limit:
            risk_specific["cost"] = f"总费用约${total_cost:,}，超出你的预算区间"
        else:
            risk_specific["cost"] = f"总费用约${total_cost:,}，在预算内但性价比一般"
    else:
        risk_specific["cost"] = "费用数据暂缺，无法评估性价比"

    if p.avg_gpa and a.gpa_raw:
        gap = p.avg_gpa - a.gpa_raw
        if gap > 0.1:
            risk_specific["admission"] = f"该项目avg GPA {p.avg_gpa}，你的{a.gpa_raw}有一定差距"
        else:
            risk_specific["admission"] = "录取竞争激烈，需要综合背景支撑"
    else:
        risk_specific["admission"] = "录取数据有限，不确定性较高"

    if not p.is_stem and p.country == "美国" and goal == "stay_abroad":
        risk_specific["visa"] = "非STEM项目，留美仅1年OPT，H1B机会有限"
    elif p.work_visa_duration_months and p.work_visa_duration_months < 12:
        risk_specific["visa"] = f"工签仅{p.work_visa_duration_months}个月，留下难度大"
    else:
        risk_specific["visa"] = "签证/移民路径需要提前规划"

    risk_specific["brand"] = "排名/知名度一般，回国求职可能吃亏"
    risk_specific["career"] = "就业数据一般，需要自己多networking"
    risk_specific["location"] = f"{p.city or '该城市'}产业机会有限，需要考虑毕业去向"
    risk_specific["soft_fit"] = "生活环境与你的偏好有差距，需要适应"
    risk_specific["risk_hedge"] = "兜底能力弱，建议搭配其他保底选项"
    risk_specific["academic_quality"] = "学术资源一般，读博深造可能受限"

    risk = risk_specific.get(weakest_dim, f"{weakest_dim}维度得分较低，需关注")

    # ── "note": one unique insight ──
    note_parts: list[str] = []
    if goal == "stay_abroad" and p.is_stem and p.has_coop:
        note_parts.append("STEM + Co-op组合，留美路径最优解之一")
    elif goal == "credential" and p.qs_ranking and p.qs_ranking <= 30:
        note_parts.append("QS Top30，回国简历含金量极高")
    elif goal == "academic" and getattr(p, "cross_registration", False):
        note_parts.append("支持跨院选课，学术自由度高")
    elif goal == "experience_then_return" and getattr(p, "return_to_china_recognition", None) in ("高", "high"):
        note_parts.append("回国认可度高，海归求职有品牌加分")

    if p.scholarship_rate and p.scholarship_rate > 0.3:
        note_parts.append(f"奖学金率{int(p.scholarship_rate * 100)}%，可以争取")
    if getattr(p, "dual_degree_available", False):
        note_parts.append("提供双学位选项，可增加竞争力")
    top_employers = getattr(p, "top_employers", None) or []
    if top_employers and len(top_employers) >= 3:
        note_parts.append(f"校友雇主包括{'、'.join(top_employers[:3])}")

    note = note_parts[0] if note_parts else f"{p.university}的{p.program_name}，值得深入了解"

    return {"why": why, "risk": risk, "note": note}


# ═══════════════════════════════════════════════════════════════════════
# 选校list分类（冲刺/主申/保底）
# ═══════════════════════════════════════════════════════════════════════

def classify_program(a: models.Assessment, p: models.Program, admission_score: float) -> str:
    """
    基于录取概率分类，不是基于总分。
    社区逻辑：冲刺/主申/保底是录取难度决定的，不是"喜不喜欢"。
    加入项目选拔度惩罚，避免把Harvard归为"主申"。
    """
    # Base thresholds adjusted by program selectivity
    selectivity_penalty = 0
    if p.school_tier in ("HYPMS", "Top10"):
        selectivity_penalty = 20
    elif p.school_tier == "Top20":
        selectivity_penalty = 10
    elif p.school_tier == "Top30":
        selectivity_penalty = 5

    adjusted = admission_score - selectivity_penalty

    if adjusted >= 65:
        return "safety"     # 保底：录取概率高
    elif adjusted >= 40:
        return "target"     # 主申：有竞争力
    else:
        return "reach"      # 冲刺：录取难度大


# ═══════════════════════════════════════════════════════════════════════
# 主匹配函数
# ═══════════════════════════════════════════════════════════════════════

def calculate_match(
    a: models.Assessment, p: models.Program
) -> Dict[str, Any]:
    """
    项目级匹配：一个用户 × 一个项目 → 完整评估结果

    返回：{
        score: 总分,
        breakdown: {各维度分数},
        program_type: reach/target/safety,
        reason: 推荐理由,
        warnings: 风险提示,
    }
    """
    goal = a.inferred_goal_type or "exploring"
    archetype = getattr(a, 'archetype', None) or 'exploring'

    # 各维度打分
    scores = {
        "admission":        score_admission(a, p),
        "career":           score_career(a, p),
        "brand":            score_brand(a, p),
        "visa":             score_visa(a, p),
        "location":         score_location(a, p),
        "cost":             score_cost(a, p),
        "soft_fit":         score_soft_fit(a, p),
        "risk_hedge":       score_risk_hedge(a, p),
        "academic_quality":  score_academic_quality(a, p),
        "field_match":      score_field_match(a, p),
    }

    # 按目标加权（archetype优先，goal_type回退）
    total = 0.0
    for dim, raw_score in scores.items():
        w = _get_weight(archetype, goal, dim)
        total += raw_score * w

    # 用户价值观微调（D模块 tradeoff 信号）
    vw = a.value_weights or {}
    # rank_vs_location: 0=纯排名, 1=纯地理
    rvl = vw.get("rank_vs_location", 0.5)
    total += (scores["location"] - scores["brand"]) * (rvl - 0.5) * 0.1

    # stay_vs_brand: 0=纯留下, 1=纯名气
    svb = vw.get("stay_vs_brand", 0.5)
    total += (scores["brand"] - scores["visa"]) * (svb - 0.5) * 0.1

    # 专业方向严重不匹配时额外惩罚，确保无关项目排到底部
    if scores["field_match"] < 30:
        total -= 15
        # 人文画像 vs 硬理工: 额外重罚 50 分, 把 STEM 推到底部
        # 即便夺得其他维度高分, 也无法翻盘
        if _is_humanities_leaning(a):
            program_field = infer_program_field(p.program_name or "")
            if program_field in _HARD_STEM_FIELDS:
                total -= 50

    total = max(0, min(100, total))

    # 分类
    ptype = classify_program(a, p, scores["admission"])

    # 理由 + 风险
    breakdown_rounded = {k: round(v, 1) for k, v in scores.items()}
    reason = generate_reason(a, p, breakdown_rounded, goal, archetype)
    warnings = generate_warnings(a, p)

    return {
        "score": round(total, 1),
        "breakdown": breakdown_rounded,
        "program_type": ptype,
        "reason": reason,
        "warnings": warnings,
    }


# ═══════════════════════════════════════════════════════════════════════
# 选校list合理性检查
# ═══════════════════════════════════════════════════════════════════════

def check_list_balance(
    recommendations: List[Dict[str, Any]], a: models.Assessment
) -> Dict[str, Any]:
    """
    检查推荐list的冲刺/主申/保底比例是否合理。
    来自社区老手："你这个list太保守了" / "冲刺校太多了，加几个保底"
    """
    counts = {"reach": 0, "target": 0, "safety": 0}
    for r in recommendations:
        t = r.get("program_type", "target")
        counts[t] = counts.get(t, 0) + 1

    total = sum(counts.values()) or 1
    actual_mix = {k: round(v / total, 2) for k, v in counts.items()}

    # 用户期望的配方
    desired = a.application_mix or {"reach": 0.3, "target": 0.4, "safety": 0.3}

    # 检查偏差
    alerts: list[str] = []
    if counts["safety"] == 0:
        alerts.append("危险：你的list没有保底校！强烈建议至少加2个保底")
    if counts["reach"] > total * 0.6:
        alerts.append("冲刺校占比过高(>60%)，全聚德风险大，建议增加主申和保底")
    if counts["safety"] > total * 0.6:
        alerts.append("你的list太保守了，可以适当冲刺1-2个更好的项目")
    if counts["target"] == 0 and total > 3:
        alerts.append("没有主申校，建议增加几个录取概率适中的项目")

    return {
        "actual_mix": actual_mix,
        "desired_mix": desired,
        "counts": counts,
        "alerts": alerts,
    }


# ═══════════════════════════════════════════════════════════════════════
# API 路由
# ═══════════════════════════════════════════════════════════════════════

def _get_latest_assessment(db: Session, user_id: int) -> Optional[models.Assessment]:
    return (
        db.query(models.Assessment)
        .filter(
            models.Assessment.user_id == user_id,
            models.Assessment.assessment_type == "master_fit",
            models.Assessment.status == "submitted",
        )
        .order_by(models.Assessment.updated_at.desc())
        .first()
    )


@router.get("/recommendations")
async def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    max_results: int = Query(20, ge=1, le=100),
    include_safety: bool = Query(True),
    include_reach: bool = Query(True),
):
    """
    获取个性化项目推荐（v3：项目级匹配 + 多维度 + 解释层）
    """
    assessment = _get_latest_assessment(db, current_user.id)
    if not assessment:
        return []

    # 目的地过滤
    dest_pref = set(assessment.destination_preference or [])
    country_map = {
        "US": ["美国"], "UK": ["英国"], "CA": ["加拿大"], "AU": ["澳大利亚"],
        "CA_AU": ["加拿大", "澳大利亚"],   # 前端合并选项 "加拿大/澳洲"
        "HK": ["香港"], "SG": ["新加坡"], "JP": ["日本"],
        "EU": ["德国", "荷兰", "法国", "瑞士", "瑞典", "丹麦", "意大利", "西班牙"],
    }

    query = db.query(models.Program)
    if dest_pref and "ALL" not in dest_pref:
        allowed_countries = []
        for code in dest_pref:
            allowed_countries.extend(country_map.get(code, [code]))
        if allowed_countries:
            query = query.filter(models.Program.country.in_(allowed_countries))

    programs = query.all()

    # 项目级匹配
    recommendations: List[Dict[str, Any]] = []
    for program in programs:
        result = calculate_match(assessment, program)

        if result["program_type"] == "safety" and not include_safety:
            continue
        if result["program_type"] == "reach" and not include_reach:
            continue

        # dealbreaker 一票否决
        dealbreaker = assessment.dealbreaker
        if dealbreaker == "no_recognition" and result["breakdown"].get("brand", 0) < 20:
            continue
        if dealbreaker == "unemployment" and result["breakdown"].get("career", 0) < 20:
            continue
        if dealbreaker == "unsafe" and result["breakdown"].get("soft_fit", 0) < 25:
            continue

        recommendations.append({
            "program_id": program.id,
            "program_name": program.program_name,
            "university": program.university,
            "country": program.country,
            "city": program.city,
            "overall_score": result["score"],
            "program_type": result["program_type"],
            "match_breakdown": result["breakdown"],
            "reason": result["reason"],
            "warnings": result["warnings"],
            "community_verdict": program.community_verdict,
            "community_tags": program.community_tags,
            "community_confidence": program.community_confidence,
        })

    # 排序
    recommendations.sort(key=lambda x: x["overall_score"], reverse=True)
    recommendations = recommendations[:max_results]

    # 选校list合理性检查
    balance = check_list_balance(recommendations, assessment)

    return {
        "recommendations": recommendations,
        "list_balance": balance,
        "decision_profile": assessment.decision_profile_summary,
        "conflicts": assessment.conflicts or [],
        "hidden_risks": assessment.hidden_risks or [],
        "inferred_goal": assessment.inferred_goal_type,
        "goal_confidence": assessment.goal_confidence,
    }
