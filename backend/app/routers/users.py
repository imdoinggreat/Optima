# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user, get_password_hash, verify_password

router = APIRouter(
    prefix="/api/users",
    tags=["用户管理"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=schemas.UserResponse)
async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """创建新用户"""
    # 检查邮箱是否已存在
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 创建用户
    db_user = models.User(
        email=user.email,
        nickname=user.nickname,
        undergraduate_school=user.undergraduate_school,
        undergraduate_major=user.undergraduate_major,
        gpa=user.gpa,
        language_score=user.language_score,
        prerequisite_completion=user.prerequisite_completion,
        work_experience_months=user.work_experience_months,
        internship_count=user.internship_count,
        research_experience=user.research_experience,
        target_industries=user.target_industries,
        career_goal=user.career_goal,
        require_stem=user.require_stem,
        target_salary_usd=user.target_salary_usd,
        location_preference=user.location_preference,
        program_preference=user.program_preference,
        test_scores=user.test_scores,
        application_status=user.application_status,
        dream_schools=user.dream_schools,
        safety_schools=user.safety_schools
    )
    
    # 设置密码
    db_user.hashed_password = get_password_hash(user.password)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user)
):
    """获取当前用户信息"""
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
async def update_user_info(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新当前用户信息"""
    for field, value in user_update.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/prerequisites", response_model=schemas.UserResponse)
async def update_user_prerequisites(
    prerequisites: List[str],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新用户先修课完成情况"""
    current_user.prerequisite_completion = [
        {"course": course, "completed": True, "grade": "A"} 
        for course in prerequisites
    ]
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/career-goal", response_model=schemas.UserResponse)
async def update_career_goal(
    career_goal: str,
    target_industries: List[str],
    require_stem: bool,
    target_salary_usd: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新用户职业目标"""
    current_user.career_goal = career_goal
    current_user.target_industries = target_industries
    current_user.require_stem = require_stem
    current_user.target_salary_usd = target_salary_usd
    
    db.commit()
    db.refresh(current_user)
    return current_user