# backend/app/routers/matching.py
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


def _get_latest_assessment(db: Session, user_id: int) -> Optional[models.Assessment]:
    """获取用户最新提交的硕士测评结果"""
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


@router.get("/recommendations", response_model=List[Dict[str, Any]])
async def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    max_results: int = Query(20, ge=1, le=100),
    include_safety: bool = Query(True),
    include_reach: bool = Query(True),
):
    """获取个性化项目推荐，整合测评结果（人格 + 选校偏好）"""
    programs = db.query(models.Program).all()
    assessment = _get_latest_assessment(db, current_user.id)

    recommendations: List[Dict[str, Any]] = []
    for program in programs:
        score, breakdown = calculate_match_score(current_user, program, assessment)
        program_type = classify_program(current_user, program, score)

        if (program_type == "safety" and not include_safety) or (
            program_type == "reach" and not include_reach
        ):
            continue

        recommendations.append(
            {
                "program_id": program.id,
                "program_name": program.program_name,
                "university": program.university,
                "overall_score": score,
                "program_type": program_type,
                "match_breakdown": breakdown,
                "warning_flags": get_warning_flags(current_user, program),
            }
        )

    recommendations.sort(key=lambda x: x["overall_score"], reverse=True)
    return recommendations[:max_results]


def calculate_match_score(
    user: models.User,
    program: models.Program,
    assessment: Optional[models.Assessment] = None,
) -> tuple[float, Dict[str, float]]:
    """计算用户与项目的匹配度，整合测评结果"""
    academic_fit = calculate_academic_fit(user, program)
    career_fit = calculate_career_fit(user, program)
    prerequisite_fit = calculate_prerequisite_fit(user, program)
    preference_fit = calculate_preference_fit(user, program)
    assessment_fit = calculate_assessment_fit(user, program, assessment)

    # 有测评结果时，测评匹配占 25%，否则原逻辑
    if assessment:
        weights = {
            "academic": 0.25,
            "career": 0.25,
            "prerequisite": 0.2,
            "preference": 0.05,
            "assessment": 0.25,
        }
    else:
        weights = {"academic": 0.3, "career": 0.3, "prerequisite": 0.2, "preference": 0.2}
        assessment_fit = 0.0

    total_score = (
        academic_fit * weights["academic"]
        + career_fit * weights["career"]
        + prerequisite_fit * weights["prerequisite"]
        + preference_fit * weights["preference"]
        + assessment_fit * weights.get("assessment", 0)
    )

    breakdown = {
        "academic_fit": round(academic_fit, 2),
        "career_fit": round(career_fit, 2),
        "prerequisite_fit": round(prerequisite_fit, 2),
        "preference_fit": round(preference_fit, 2),
    }
    if assessment:
        breakdown["assessment_fit"] = round(assessment_fit, 2)

    return round(total_score, 2), breakdown


def calculate_academic_fit(user: models.User, program: models.Program) -> float:
    score = 0.0
    if program.avg_gpa and user.gpa:
        gpa_diff = abs(user.gpa - program.avg_gpa)
        score += 30 if gpa_diff <= 0.3 else 20 if gpa_diff <= 0.5 else 10 if gpa_diff <= 0.7 else 0

    if program.avg_gre_quant and user.test_scores and user.test_scores.get("gre_quant"):
        gre_diff = abs(user.test_scores["gre_quant"] - program.avg_gre_quant)
        score += 20 if gre_diff <= 5 else 10 if gre_diff <= 10 else 0

    if program.preferred_background and user.undergraduate_major:
        score += 20 if any(bg in user.undergraduate_major for bg in program.preferred_background) else 5

    return float(min(score, 100.0))


def calculate_career_fit(user: models.User, program: models.Program) -> float:
    user_industries = set((user.target_industries or []))
    program_industries = set((program.employment_industries or []))
    if not user_industries:
        return 0.0
    overlap = user_industries.intersection(program_industries)
    return float(min(100.0, (len(overlap) / len(user_industries)) * 100.0))


def calculate_prerequisite_fit(user: models.User, program: models.Program) -> float:
    required = set(program.prerequisite_courses or [])
    if not required:
        return 100.0
    completed = set()
    for item in (user.prerequisite_completion or []):
        course = (item or {}).get("course")
        if course:
            completed.add(course)
    matched = completed.intersection(required)
    return float(min(100.0, (len(matched) / len(required)) * 100.0))


def calculate_preference_fit(user: models.User, program: models.Program) -> float:
    pref = user.program_preference or {}
    score = 0.0

    must_stem = pref.get("must_stem")
    if must_stem is True and program.is_stem:
        score += 40
    elif must_stem is True and not program.is_stem:
        score += 0
    else:
        score += 20

    max_tuition = pref.get("max_tuition")
    if max_tuition and program.total_cost_usd:
        score += 40 if program.total_cost_usd <= max_tuition else 10
    else:
        score += 20

    return float(min(100.0, score))


def calculate_assessment_fit(
    user: models.User,
    program: models.Program,
    assessment: Optional[models.Assessment],
) -> float:
    """
    基于测评结果（26 题：人格 + 选校偏好）计算项目匹配度。
    使用 preference_weights：城市偏好、规模偏好、学术/职业、跨学科开放度等。
    """
    if not assessment or not assessment.preference_weights:
        return 50.0  # 无测评时给中性分

    pw = assessment.preference_weights
    scores: list[float] = []

    # 小班偏好 vs 项目规模（cohort_size 越小越符合 small_cohort_preference 高）
    small_cohort = float(pw.get("small_cohort_preference", 0.5))
    if program.cohort_size is not None:
        # cohort_size < 50 视为小班，> 150 视为大班
        if program.cohort_size <= 50:
            cohort_match = small_cohort  # 用户偏好小班，项目是小班
        elif program.cohort_size >= 150:
            cohort_match = 1.0 - small_cohort  # 用户偏好小班，项目是大班，不匹配
        else:
            cohort_match = 0.5 + (small_cohort - 0.5) * 0.5  # 中等规模
        scores.append(cohort_match * 100)
    else:
        scores.append(50.0)

    # 跨学科开放度 vs 课程自由度
    inter = float(pw.get("interdisciplinary_openness", 0.5))
    if program.course_flexibility:
        flex_low = program.course_flexibility.lower() in ("低", "low", "固定", "fixed")
        flex_high = program.course_flexibility.lower() in ("高", "high", "灵活", "flexible")
        if flex_high:
            flex_match = inter  # 用户开放 + 项目灵活
        elif flex_low:
            flex_match = 1.0 - inter  # 用户开放 + 项目固定，不匹配
        else:
            flex_match = 0.5
        scores.append(flex_match * 100)
    elif program.cross_registration is True:
        scores.append(inter * 100)  # 支持跨院选课，与跨学科偏好正相关
    else:
        scores.append(50.0)

    # 学术 vs 职业权重：academic_weight 高则偏好学术导向项目
    academic_w = float(pw.get("academic_weight", 0.5))
    # 项目就业率高、capstone 为主 → 更偏职业；论文要求高 → 更偏学术
    # 简化：有 capstone_required 且 employment_rate 高 → 职业导向
    if program.capstone_required and program.employment_rate_3month:
        career_oriented = program.employment_rate_3month >= 0.85
        if career_oriented:
            acad_match = 1.0 - academic_w  # 职业导向项目，用户偏学术则不匹配
        else:
            acad_match = 0.5
        scores.append(acad_match * 100)
    else:
        scores.append(50.0)

    # 人格开放性：高开放性用户更适合跨学科、课程自由的项目
    pr = assessment.personality_result or {}
    openness = float(pr.get("openness", 0.5))
    if program.cross_registration or (
        program.course_flexibility
        and program.course_flexibility.lower() in ("高", "high", "灵活", "flexible")
    ):
        scores.append(openness * 100)
    else:
        scores.append(50.0)

    return float(min(100.0, sum(scores) / len(scores))) if scores else 50.0


def classify_program(user: models.User, program: models.Program, score: float) -> str:
    # naive tiers: reach/target/safety by score
    if score >= 75:
        return "target"
    if score >= 55:
        return "safety"
    return "reach"


def get_warning_flags(user: models.User, program: models.Program) -> List[str]:
    flags: List[str] = []
    if program.gre_required and (not user.test_scores or not user.test_scores.get("gre_quant")):
        flags.append("GRE缺失：该项目可能要求GRE")
    if program.is_stem is False and user.require_stem:
        flags.append("非STEM：与您的STEM偏好冲突")
    return flags

