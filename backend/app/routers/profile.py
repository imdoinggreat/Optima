"""
/api/v1/user/profile — 用户完整画像接口

返回硕士申请者的四维竞争力数据：
1. 硬背景雷达（GPA/标化/院校/先修/科研/实习）
2. 人格适配雷达（大五三维度）
3. 选校偏好权重
4. 目标职业技能匹配
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/user", tags=["用户画像"])

# ── 本科院校梯队（中国本科）→ 竞争力分 ─────────────────────────────────────────
_SCHOOL_TIER_SCORE: Dict[str, float] = {
    "清北": 100,
    "C9": 90,
    "985": 75,
    "211": 55,
    "双一流": 40,
    "其他": 22,
}

# ── 科研经历 → 分 ─────────────────────────────────────────────────────────────
_RESEARCH_SCORE: Dict[str, float] = {
    "无": 0,
    "课程项目": 28,
    "实验室助理": 52,
    "独立研究": 78,
    "发表论文": 100,
}

# ── 目标职业定义（职业名 → 所需技能权重 1-5）────────────────────────────────
CAREER_SKILL_MATRIX: Dict[str, Dict[str, int]] = {
    "数据科学家": {
        "编程能力": 5, "统计/机器学习": 5, "数据分析": 5,
        "批判性思维": 4, "量化建模": 4, "写作表达": 2,
        "商业分析": 3, "团队协作": 3, "项目管理": 2, "沟通演讲": 3,
    },
    "商业分析师": {
        "商业分析": 5, "数据分析": 4, "沟通演讲": 4,
        "项目管理": 4, "批判性思维": 4, "编程能力": 3,
        "统计/机器学习": 3, "写作表达": 3, "团队协作": 4, "量化建模": 2,
    },
    "产品经理": {
        "沟通演讲": 5, "项目管理": 5, "商业分析": 4,
        "团队协作": 5, "批判性思维": 4, "数据分析": 3,
        "编程能力": 2, "写作表达": 3, "统计/机器学习": 2, "量化建模": 2,
    },
    "金融分析师": {
        "量化建模": 5, "统计/机器学习": 4, "商业分析": 4,
        "批判性思维": 5, "数据分析": 4, "编程能力": 3,
        "写作表达": 3, "沟通演讲": 3, "项目管理": 3, "团队协作": 3,
    },
    "管理咨询": {
        "批判性思维": 5, "沟通演讲": 5, "商业分析": 5,
        "项目管理": 4, "写作表达": 4, "数据分析": 3,
        "团队协作": 4, "编程能力": 2, "统计/机器学习": 2, "量化建模": 3,
    },
    "科研/学术": {
        "统计/机器学习": 5, "批判性思维": 5, "写作表达": 5,
        "量化建模": 4, "数据分析": 4, "编程能力": 4,
        "团队协作": 2, "项目管理": 2, "商业分析": 1, "沟通演讲": 3,
    },
}

# 职业目标字段值 → CAREER_SKILL_MATRIX key 映射
_CAREER_GOAL_MAP: Dict[str, str] = {
    "留美就业": "商业分析师",
    "回国就业": "商业分析师",
    "继续深造": "科研/学术",
    "创业": "产品经理",
    "未确定": "商业分析师",
}

# 默认技能熟练度（未填时假设 2/5）
_DEFAULT_SKILL_LEVEL = 2

ALL_SKILLS = list(next(iter(CAREER_SKILL_MATRIX.values())).keys())


def _compute_hard_background(user: models.User) -> schemas.HardBackgroundRadar:
    # GPA
    gpa_score = round(min((user.gpa or 0) / 4.0 * 100, 100), 1)

    # 标化成绩：优先 GRE Quant，其次 TOEFL
    ts = user.test_scores or {}
    gre_q = ts.get("gre_quant")
    toefl = ts.get("toefl")
    ielts = ts.get("ielts")

    if gre_q is not None:
        test_score = round(min(max((gre_q - 130) / 40 * 100, 0), 100), 1)
    elif toefl is not None:
        test_score = round(min(max((toefl - 60) / 50 * 100, 0), 100), 1)
    elif ielts is not None:
        test_score = round(min(max((ielts - 5.0) / 4.0 * 100, 0), 100), 1)
    else:
        test_score = 0.0

    # 本科院校梯队
    tier = user.undergraduate_school_tier or "其他"
    school_tier_score = _SCHOOL_TIER_SCORE.get(tier, 22)

    # 先修课完成度
    prereqs = user.prerequisite_completion or []
    if prereqs:
        completed = sum(1 for p in prereqs if p.get("completed", False))
        prereq_completion = round(completed / len(prereqs) * 100, 1)
    else:
        prereq_completion = 0.0

    # 科研经历
    research_score = _RESEARCH_SCORE.get(user.research_experience or "无", 0)

    # 实习经历
    internship_count = user.internship_count or 0
    internship_score = round(min(internship_count / 3.0, 1.0) * 100, 1)

    scores = [gpa_score, test_score, school_tier_score,
              prereq_completion, research_score, internship_score]
    overall = round(sum(scores) / len(scores), 1)

    return schemas.HardBackgroundRadar(
        gpa_score=gpa_score,
        test_score=test_score,
        school_tier_score=school_tier_score,
        prereq_completion=prereq_completion,
        research_score=research_score,
        internship_score=internship_score,
        overall=overall,
    )


def _compute_personality(user: models.User) -> schemas.PersonalityRadar:
    assessment = (
        user.assessments[-1]
        if user.assessments
        else None
    )
    if assessment and assessment.personality_result:
        pr = assessment.personality_result
        return schemas.PersonalityRadar(
            openness=round(pr.get("openness", 0.5) * 100, 1),
            conscientiousness=round(pr.get("conscientiousness", 0.5) * 100, 1),
            agreeableness=round(pr.get("agreeableness", 0.5) * 100, 1),
            has_assessment=True,
        )
    return schemas.PersonalityRadar(
        openness=50.0, conscientiousness=50.0, agreeableness=50.0,
        has_assessment=False,
    )


def _compute_preferences(user: models.User) -> schemas.PreferenceWeights:
    assessment = user.assessments[-1] if user.assessments else None
    if assessment and assessment.preference_weights:
        pw = assessment.preference_weights
        return schemas.PreferenceWeights(
            academic_weight=round(pw.get("academic_weight", 0.5) * 100, 1),
            career_weight=round(pw.get("career_weight", 0.5) * 100, 1),
            risk_tolerance=round(pw.get("risk_tolerance", 0.5) * 100, 1),
            interdisciplinary_openness=round(pw.get("interdisciplinary_openness", 0.5) * 100, 1),
            application_mix=pw.get("application_mix", {
                "reach_ratio": 0.3, "target_ratio": 0.4, "safety_ratio": 0.3
            }),
            large_city_preference=round(pw.get("large_city_preference", 0.5) * 100, 1),
            small_city_preference=round(pw.get("small_city_preference", 0.5) * 100, 1),
            large_program_preference=round(pw.get("large_program_preference", 0.5) * 100, 1),
            small_cohort_preference=round(pw.get("small_cohort_preference", 0.5) * 100, 1),
        )
    return schemas.PreferenceWeights(
        academic_weight=50.0, career_weight=50.0,
        risk_tolerance=50.0, interdisciplinary_openness=50.0,
        application_mix={"reach_ratio": 0.3, "target_ratio": 0.4, "safety_ratio": 0.3},
        large_city_preference=50.0, small_city_preference=50.0,
        large_program_preference=50.0, small_cohort_preference=50.0,
    )


def _compute_career_match(user: models.User) -> schemas.CareerSkillMatch:
    career_goal = user.career_goal or "未确定"
    target_career = _CAREER_GOAL_MAP.get(career_goal, "商业分析师")

    skills = {s: _DEFAULT_SKILL_LEVEL for s in ALL_SKILLS}
    stored = user.skill_self_assessment or {}
    for k, v in stored.items():
        if k in skills:
            skills[k] = max(1, min(5, int(v)))

    required = CAREER_SKILL_MATRIX[target_career]

    # 匹配分 = 加权覆盖率（用户得分/要求得分，上限1）
    total_weight = sum(required.values())
    weighted_match = sum(
        min(skills.get(sk, 1) / req, 1.0) * req
        for sk, req in required.items()
    )
    match_score = round(weighted_match / total_weight * 100, 1)

    skill_gaps = [
        sk for sk, req in required.items()
        if skills.get(sk, 1) < req
    ]

    career_radar: List[Dict[str, Any]] = [
        {
            "skill": sk,
            "user_score": skills.get(sk, _DEFAULT_SKILL_LEVEL),
            "required": required.get(sk, 0),
            "fullMark": 5,
        }
        for sk in ALL_SKILLS
    ]

    return schemas.CareerSkillMatch(
        target_career=target_career,
        match_score=match_score,
        skills=skills,
        skill_gaps=skill_gaps,
        career_radar=career_radar,
    )


@router.get("/profile", response_model=schemas.UserProfileResponse)
async def get_user_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    返回用户完整申请竞争力画像，包含四个维度：
    1. 硬背景雷达（GPA/标化/院校/先修/科研/实习）
    2. 人格适配雷达（大五三维度）
    3. 选校偏好权重
    4. 目标职业技能匹配
    """
    hard_background = _compute_hard_background(current_user)
    personality = _compute_personality(current_user)
    preferences = _compute_preferences(current_user)
    career_match = _compute_career_match(current_user)

    overall = round(
        (hard_background.overall * 0.4 + personality.openness * 0.2 +
         career_match.match_score * 0.4),
        1,
    )

    last_updated = (
        current_user.updated_at
        if current_user.updated_at
        else datetime.now(timezone.utc)
    )

    return schemas.UserProfileResponse(
        id=current_user.id,
        nickname=current_user.nickname or "用户",
        hard_background=hard_background,
        personality=personality,
        preferences=preferences,
        career_match=career_match,
        overall_competitiveness=overall,
        last_updated=last_updated,
    )


@router.put("/skills", response_model=schemas.UserProfileResponse)
async def update_skill_assessment(
    payload: schemas.SkillSelfAssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """更新用户技能自评，并返回最新画像"""
    current_user.skill_self_assessment = {
        k: max(1, min(5, int(v))) for k, v in payload.skills.items()
    }
    db.commit()
    db.refresh(current_user)

    hard_background = _compute_hard_background(current_user)
    personality = _compute_personality(current_user)
    preferences = _compute_preferences(current_user)
    career_match = _compute_career_match(current_user)
    overall = round(
        (hard_background.overall * 0.4 + personality.openness * 0.2 +
         career_match.match_score * 0.4),
        1,
    )

    return schemas.UserProfileResponse(
        id=current_user.id,
        nickname=current_user.nickname or "用户",
        hard_background=hard_background,
        personality=personality,
        preferences=preferences,
        career_match=career_match,
        overall_competitiveness=overall,
        last_updated=current_user.updated_at or datetime.now(timezone.utc),
    )
