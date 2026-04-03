# backend/app/routers/programs.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/api/programs",
    tags=["项目管理"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

@router.get("/", response_model=List[schemas.ProgramResponse])
async def get_programs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    is_stem: Optional[bool] = None,
    degree_subtype: Optional[str] = None,
    school_tier: Optional[str] = None,
    technical_intensity: Optional[str] = None,
    duration_months: Optional[int] = None,
    min_popularity: Optional[float] = Query(0, ge=0, le=1)
):
    """获取项目列表（支持筛选）"""
    query = db.query(models.Program)
    
    if is_stem is not None:
        query = query.filter(models.Program.is_stem == is_stem)
    if degree_subtype:
        query = query.filter(models.Program.degree_subtype == degree_subtype)
    if school_tier:
        query = query.filter(models.Program.school_tier == school_tier)
    if technical_intensity:
        query = query.filter(models.Program.technical_intensity == technical_intensity)
    if duration_months:
        query = query.filter(models.Program.duration_months == duration_months)
    if min_popularity:
        query = query.filter(models.Program.program_popularity >= min_popularity)
    
    programs = query.offset(skip).limit(limit).all()
    return programs

@router.get("/search/advanced", response_model=List[schemas.ProgramResponse])
async def advanced_search(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="搜索关键词"),
    is_stem: Optional[bool] = Query(None, description="STEM认证"),
    min_scholarship_rate: Optional[float] = Query(None, ge=0, le=1, description="最低奖学金比例"),
    max_total_cost: Optional[int] = Query(None, gt=0, description="最高总费用"),
    career_support: Optional[str] = Query(None, description="就业服务级别"),
    technical_intensity: Optional[str] = Query(None, description="技术强度"),
    duration_months: Optional[int] = Query(None, gt=0, description="项目时长"),
    school_tier: Optional[str] = Query(None, description="学校梯队"),
    require_gre: Optional[bool] = Query(None, description="是否要求GRE"),
    skip: int = 0,
    limit: int = 20
):
    """硕士项目高级搜索"""
    query = db.query(models.Program)
    
    if q:
        query = query.filter(
            models.Program.program_name.ilike(f"%{q}%") |
            models.Program.university.ilike(f"%{q}%")
        )
    if is_stem is not None:
        query = query.filter(models.Program.is_stem == is_stem)
    if min_scholarship_rate:
        query = query.filter(models.Program.scholarship_rate >= min_scholarship_rate)
    if max_total_cost:
        query = query.filter(models.Program.total_cost_usd <= max_total_cost)
    if career_support:
        query = query.filter(models.Program.career_support == career_support)
    if technical_intensity:
        query = query.filter(models.Program.technical_intensity == technical_intensity)
    if duration_months:
        query = query.filter(models.Program.duration_months == duration_months)
    if school_tier:
        query = query.filter(models.Program.school_tier == school_tier)
    if require_gre is not None:
        query = query.filter(models.Program.gre_required == require_gre)
    
    programs = query.offset(skip).limit(limit).all()
    return programs

@router.get("/{program_id}", response_model=schemas.ProgramResponse)
async def get_program(
    program_id: int,
    db: Session = Depends(get_db)
):
    """根据ID获取项目详情"""
    program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"项目 ID {program_id} 不存在"
        )
    return program

@router.post("/", response_model=schemas.ProgramResponse)
async def create_program(
    program: schemas.ProgramCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """创建新项目（需要管理员权限）"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限创建项目"
        )

    db_program = models.Program(**program.model_dump())
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

@router.put("/{program_id}", response_model=schemas.ProgramResponse)
async def update_program(
    program_id: int,
    program_update: schemas.ProgramUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新项目信息"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限更新项目"
        )

    db_program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not db_program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"项目 ID {program_id} 不存在"
        )

    for field, value in program_update.model_dump(exclude_unset=True).items():
        setattr(db_program, field, value)

    db.commit()
    db.refresh(db_program)
    return db_program

@router.get("/{program_id}/prerequisite-analysis")
async def analyze_prerequisites(
    program_id: int,
    user_prerequisites: List[str] = Query(...),
    db: Session = Depends(get_db)
):
    """分析用户先修课与项目要求的匹配度"""
    program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    required_courses = set(program.prerequisite_courses or [])
    user_courses_set = set(user_prerequisites)
    
    matched = user_courses_set.intersection(required_courses)
    missing = required_courses - user_courses_set
    extra = user_courses_set - required_courses
    
    match_percentage = (len(matched) / len(required_courses)) * 100 if required_courses else 100
    
    return {
        "program_id": program_id,
        "program_name": program.program_name,
        "required_courses": list(required_courses),
        "user_courses": list(user_courses_set),
        "matched_courses": list(matched),
        "missing_courses": list(missing),
        "extra_courses": list(extra),
        "match_percentage": round(match_percentage, 2),
        "warning_level": "high" if match_percentage < 50 else "medium" if match_percentage < 80 else "low"
    }

@router.get("/{program_id}/career-path-match")
async def career_path_match(
    program_id: int,
    target_industries: List[str] = Query(...),
    db: Session = Depends(get_db)
):
    """匹配项目就业行业与用户目标行业"""
    program = db.query(models.Program).filter(models.Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    program_industries = set(program.employment_industries or [])
    user_industries = set(target_industries)
    
    overlap = program_industries.intersection(user_industries)
    match_percentage = (len(overlap) / len(user_industries)) * 100 if user_industries else 0
    
    return {
        "program_industries": list(program_industries),
        "user_industries": list(user_industries),
        "overlap_industries": list(overlap),
        "match_percentage": round(match_percentage, 2),
        "top_employers": program.top_employers or [],
        "employment_rate": program.employment_rate_3month
    }