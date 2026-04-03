from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/assessments", tags=["硕士测评"])


# 模块 1：12 道学业适配题，采用两难迫选后映射到 1/5 分。
# 统一保持 reverse=False，因为前端已按高分选项做方向映射。
IPIP_KEY: dict[str, tuple[str, bool]] = {
    "q1":  ("openness",          False),
    "q2":  ("conscientiousness", False),
    "q3":  ("agreeableness",     False),
    "q4":  ("openness",          False),
    "q5":  ("openness",          False),
    "q6":  ("conscientiousness", False),
    "q7":  ("conscientiousness", False),
    "q8":  ("conscientiousness", False),
    "q9":  ("agreeableness",     False),
    "q10": ("openness",          False),
    "q11": ("agreeableness",     False),
    "q12": ("openness",          False),
}


def _clamp_1_5(value: Any) -> int:
    try:
        num = int(value)
    except (TypeError, ValueError):
        return 3
    return max(1, min(5, num))


def _normalize_likert(value: int, reverse: bool = False) -> float:
    score = 6 - value if reverse else value
    return round((score - 1) / 4, 4)


def score_personality(ipip_answers: Dict[str, int]) -> Dict[str, float]:
    buckets: dict[str, list[float]] = {
        "openness": [],
        "conscientiousness": [],
        "agreeableness": [],
    }
    for key, (trait, reverse) in IPIP_KEY.items():
        buckets[trait].append(_normalize_likert(_clamp_1_5(ipip_answers.get(key)), reverse))

    return {
        "openness": round(sum(buckets["openness"]) / len(buckets["openness"]), 4),
        "conscientiousness": round(sum(buckets["conscientiousness"]) / len(buckets["conscientiousness"]), 4),
        "agreeableness": round(sum(buckets["agreeableness"]) / len(buckets["agreeableness"]), 4),
    }


def score_preferences(pref: Dict[str, float]) -> Dict[str, Any]:
    def val(name: str, default: float = 3.0) -> float:
        try:
            num = float(pref.get(name, default))
        except (TypeError, ValueError):
            num = default
        return max(1.0, min(5.0, num))

    has_new_forced_choice = any(f"pq{i}" in pref for i in range(1, 21))

    if has_new_forced_choice:
        def avg(keys: list[str], default: float = 3.0) -> float:
            values = [val(key, default) for key in keys]
            return sum(values) / len(values) if values else default

        # 14 题版本：pq1-pq14（保留的 key）
        risk = avg(["pq3", "pq7"])
        academic = avg(["pq5", "pq11"])
        city = avg(["pq1", "pq9"])
        cohort = avg(["pq2"])
        interdisciplinary = avg(["pq6", "pq10", "pq12", "pq14"])

        risk_norm = (risk - 1) / 4
        academic_norm = (academic - 1) / 4
        city_norm = (city - 1) / 4
        cohort_norm = (cohort - 1) / 4
        inter_norm = (interdisciplinary - 1) / 4

        safety_ratio = round(max(0.1, 0.5 - 0.3 * risk_norm), 4)
        reach_ratio = round(max(0.1, 0.2 + 0.4 * risk_norm), 4)
        target_ratio = round(max(0.2, 1.0 - safety_ratio - reach_ratio), 4)
        ratio_sum = safety_ratio + target_ratio + reach_ratio

        return {
            "risk_tolerance": round(risk_norm, 4),
            "application_mix": {
                "reach_ratio": round(reach_ratio / ratio_sum, 4),
                "target_ratio": round(target_ratio / ratio_sum, 4),
                "safety_ratio": round(safety_ratio / ratio_sum, 4),
            },
            "academic_weight": round(academic_norm, 4),
            "career_weight": round(1 - academic_norm, 4),
            "large_city_preference": round(city_norm, 4),
            "small_city_preference": round(1 - city_norm, 4),
            "large_program_preference": round(1 - cohort_norm, 4),
            "small_cohort_preference": round(cohort_norm, 4),
            "interdisciplinary_openness": round(inter_norm, 4),
        }

    risk = (val("risk_1") + val("risk_2")) / 2
    academic = (val("academic_1") + val("academic_2")) / 2
    city = (val("city_1") + val("city_2")) / 2
    cohort = (val("cohort_1") + val("cohort_2")) / 2
    interdisciplinary = (val("interdisciplinary_1") + val("interdisciplinary_2")) / 2

    risk_norm = (risk - 1) / 4
    academic_norm = (academic - 1) / 4
    city_norm = (city - 1) / 4
    cohort_norm = (cohort - 1) / 4
    inter_norm = (interdisciplinary - 1) / 4

    # 风险偏好映射成冲刺/匹配/保底比例
    safety_ratio = round(max(0.1, 0.5 - 0.3 * risk_norm), 4)
    reach_ratio = round(max(0.1, 0.2 + 0.4 * risk_norm), 4)
    target_ratio = round(max(0.2, 1.0 - safety_ratio - reach_ratio), 4)
    ratio_sum = safety_ratio + target_ratio + reach_ratio

    return {
        "risk_tolerance": round(risk_norm, 4),
        "application_mix": {
            "reach_ratio": round(reach_ratio / ratio_sum, 4),
            "target_ratio": round(target_ratio / ratio_sum, 4),
            "safety_ratio": round(safety_ratio / ratio_sum, 4),
        },
        "academic_weight": round(academic_norm, 4),
        "career_weight": round(1 - academic_norm, 4),
        "large_city_preference": round(city_norm, 4),
        "small_city_preference": round(1 - city_norm, 4),
        "large_program_preference": round(1 - cohort_norm, 4),
        "small_cohort_preference": round(cohort_norm, 4),
        "interdisciplinary_openness": round(inter_norm, 4),
    }


def _default_result(user_id: int) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "id": 0,
        "user_id": user_id,
        "assessment_type": "master_fit",
        "status": "draft",
        "raw_answers": {"ipip_answers": {}, "preference_answers": {}},
        "personality_result": {
            "openness": 0.5,
            "conscientiousness": 0.5,
            "agreeableness": 0.5,
        },
        "preference_weights": {
            "risk_tolerance": 0.5,
            "application_mix": {
                "reach_ratio": 0.3,
                "target_ratio": 0.4,
                "safety_ratio": 0.3,
            },
            "academic_weight": 0.5,
            "career_weight": 0.5,
            "large_city_preference": 0.5,
            "small_city_preference": 0.5,
            "large_program_preference": 0.5,
            "small_cohort_preference": 0.5,
            "interdisciplinary_openness": 0.5,
        },
        "overall_score": 0.5,
        "created_at": now,
        "updated_at": now,
    }


@router.get("/me", response_model=schemas.MasterAssessmentResultResponse)
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


@router.put("/me", response_model=schemas.MasterAssessmentResultResponse)
async def save_my_assessment(
    payload: schemas.MasterAssessmentSaveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    personality_result = score_personality(payload.ipip_answers)
    preference_weights = score_preferences(payload.preference_answers)
    overall_score = round(
        (
            personality_result["openness"]
            + personality_result["conscientiousness"]
            + personality_result["agreeableness"]
            + preference_weights["academic_weight"]
            + preference_weights["interdisciplinary_openness"]
        )
        / 5,
        4,
    )

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

    assessment.status = payload.status.value
    assessment.raw_answers = {
        "ipip_answers": payload.ipip_answers,
        "preference_answers": payload.preference_answers,
    }
    assessment.personality_result = personality_result
    assessment.skill_scores = personality_result
    assessment.preference_weights = preference_weights
    assessment.overall_score = overall_score

    db.commit()
    db.refresh(assessment)
    return assessment
