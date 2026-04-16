# backend/app/schemas.py
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import json

# ========== 枚举定义 ==========
class DegreeSubtype(str, Enum):
    MA = "MA"
    MS = "MS"
    MPP = "MPP"
    MPA = "MPA"
    MBA = "MBA"
    MFA = "MFA"
    MEng = "MEng"
    MArch = "MArch"
    MDes = "MDes"
    OTHER = "其他"

class SchoolTier(str, Enum):
    HYPMS = "HYPMS"
    TOP10 = "Top10"
    TOP20 = "Top20"
    TOP30 = "Top30"
    TOP50 = "Top50"
    TOP100 = "Top100"
    OTHER = "其他"

class CourseFlexibility(str, Enum):
    HIGH = "高"
    MEDIUM = "中"
    LOW = "低"

class TechnicalIntensity(str, Enum):
    HARD = "硬核"
    MEDIUM = "适中"
    EASY = "轻松"

class CareerSupport(str, Enum):
    HIGH = "强"
    MEDIUM = "中"
    LOW = "低"

class CompetitionIntensity(str, Enum):
    HIGH = "卷王"
    MEDIUM = "中等"
    LOW = "和谐"

class ResearchExperience(str, Enum):
    NONE = "无"
    COURSE_PROJECT = "课程项目"
    LAB_ASSISTANT = "实验室助理"
    INDEPENDENT_RESEARCH = "独立研究"
    PUBLISHED_PAPER = "发表论文"

class CareerGoal(str, Enum):
    STAY_ABROAD = "留在当地就业"
    EXPERIENCE_THEN_RETURN = "海外经验后回国"
    RETURN_CHINA = "回国就业"
    CONTINUE_STUDY = "继续深造"
    ENTREPRENEUR = "创业"
    UNDECIDED = "未确定"

class ApplicationStatus(str, Enum):
    PLANNING = "规划中"
    PREPARING = "准备材料"
    SUBMITTED = "已提交"
    ADMITTED = "录取中"
    DECIDED = "已决定"

class EmploymentType(str, Enum):
    INTERNSHIP = "实习"
    FULLTIME = "全职"
    PARTTIME = "兼职"

class ActivityType(str, Enum):
    STUDENT_ORG = "学生组织"
    COMPETITION = "竞赛获奖"
    VOLUNTEER = "志愿者"
    LEADERSHIP = "社团领导"
    OTHER = "其他"

class RequirementType(str, Enum):
    MANDATORY = "强制"
    HIGHLY_RECOMMENDED = "强烈推荐"
    RECOMMENDED = "建议"

# ========== 用户相关模型 ==========
class UserBase(BaseModel):
    """用户基础信息模型"""
    email: EmailStr
    nickname: str = Field(..., min_length=1, max_length=50)
    undergraduate_school: str
    undergraduate_major: Optional[str] = None
    gpa: float = Field(..., ge=0.0, le=4.0)
    language_score: str
    
    # 硕士专属字段
    prerequisite_completion: List[Dict[str, Any]] = Field(default=[])
    work_experience_months: int = Field(default=0, ge=0)
    internship_count: int = Field(default=0, ge=0)
    research_experience: ResearchExperience = Field(default=ResearchExperience.NONE)
    target_industries: List[str] = Field(default=[])
    career_goal: CareerGoal = Field(default=CareerGoal.UNDECIDED)
    require_stem: bool = Field(default=True)
    target_salary_usd: Optional[int] = Field(ge=0)
    location_preference: List[str] = Field(default=[])
    program_preference: Dict[str, Any] = Field(default={
        "min_duration": 12,
        "max_duration": 24,
        "max_tuition": 80000,
        "must_stem": False,
        "preferred_destinations": [],
        "technical_intensity": "适中"
    })
    test_scores: Dict[str, Any] = Field(default={
        "gre_verbal": None,
        "gre_quant": None,
        "gre_writing": None,
        "toefl": None,
        "ielts": None
    })
    application_status: ApplicationStatus = Field(default=ApplicationStatus.PLANNING)
    dream_schools: List[str] = Field(default=[])
    safety_schools: List[str] = Field(default=[])

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UndergraduateSchoolTier(str, Enum):
    HYPMS = "HYPMS"
    TOP10 = "Top10"
    TOP20 = "Top20"
    TOP30 = "Top30"
    TOP50 = "Top50"
    TOP100 = "Top100"
    OTHER = "其他"


class UserUpdate(BaseModel):
    """用户更新模型"""
    nickname: Optional[str] = None
    undergraduate_major: Optional[str] = None
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    language_score: Optional[str] = None
    prerequisite_completion: Optional[List[Dict[str, Any]]] = None
    work_experience_months: Optional[int] = None
    internship_count: Optional[int] = None
    research_experience: Optional[ResearchExperience] = None
    target_industries: Optional[List[str]] = None
    career_goal: Optional[CareerGoal] = None
    require_stem: Optional[bool] = None
    target_salary_usd: Optional[int] = None
    location_preference: Optional[List[str]] = None
    program_preference: Optional[Dict[str, Any]] = None
    test_scores: Optional[Dict[str, Any]] = None
    application_status: Optional[ApplicationStatus] = None
    dream_schools: Optional[List[str]] = None
    safety_schools: Optional[List[str]] = None
    undergraduate_school_tier: Optional[str] = None
    skill_self_assessment: Optional[Dict[str, int]] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ========== 先修课相关模型 ==========
class PrerequisiteBase(BaseModel):
    """先修课基础模型"""
    course_code: str = Field(..., max_length=20)
    course_name_cn: str = Field(..., max_length=100)
    course_name_en: str = Field(..., max_length=100)
    category: str
    difficulty_level: str
    typical_hours: Optional[int] = None
    description: Optional[str] = None
    recommended_majors: List[str] = Field(default=[])
    is_common_requirement: bool = Field(default=False)

class PrerequisiteCreate(PrerequisiteBase):
    pass

class PrerequisiteUpdate(BaseModel):
    course_name_cn: Optional[str] = None
    course_name_en: Optional[str] = None
    category: Optional[str] = None
    difficulty_level: Optional[str] = None
    typical_hours: Optional[int] = None
    description: Optional[str] = None
    recommended_majors: Optional[List[str]] = None
    is_common_requirement: Optional[bool] = None

class PrerequisiteResponse(PrerequisiteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ProgramPrerequisiteBase(BaseModel):
    """项目先修课关联模型"""
    program_id: int
    prerequisite_id: int
    requirement_type: RequirementType
    minimum_grade: Optional[str] = None
    alternatives: Optional[List[str]] = None

class ProgramPrerequisiteCreate(ProgramPrerequisiteBase):
    pass

class ProgramPrerequisiteResponse(ProgramPrerequisiteBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ========== 技能相关模型 ==========
class ProgramSkillBase(BaseModel):
    """项目技能基础模型"""
    skill_code: str = Field(..., max_length=20)
    skill_name_cn: str = Field(..., max_length=100)
    skill_name_en: str = Field(..., max_length=100)
    skill_category: str
    onet_code: Optional[str] = None
    description: Optional[str] = None
    typical_programs: List[str] = Field(default=[])

class ProgramSkillCreate(ProgramSkillBase):
    pass

class ProgramSkillUpdate(BaseModel):
    skill_name_cn: Optional[str] = None
    skill_name_en: Optional[str] = None
    skill_category: Optional[str] = None
    onet_code: Optional[str] = None
    description: Optional[str] = None
    typical_programs: Optional[List[str]] = None

class ProgramSkillResponse(ProgramSkillBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ProgramSkillMappingBase(BaseModel):
    """项目技能映射模型"""
    program_id: int
    skill_id: int
    proficiency_level: str
    is_core_skill: bool = Field(default=True)

class ProgramSkillMappingCreate(ProgramSkillMappingBase):
    pass

class ProgramSkillMappingResponse(ProgramSkillMappingBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ========== 工作经历相关模型 ==========
class WorkExperienceBase(BaseModel):
    """工作经历基础模型"""
    company_name: str = Field(..., max_length=200)
    position: str = Field(..., max_length=100)
    industry: Optional[str] = None
    employment_type: EmploymentType
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = Field(default=False)
    description: Optional[str] = None
    skills_gained: List[str] = Field(default=[])

class WorkExperienceCreate(WorkExperienceBase):
    pass

class WorkExperienceUpdate(BaseModel):
    company_name: Optional[str] = None
    position: Optional[str] = None
    industry: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    skills_gained: Optional[List[str]] = None

class WorkExperienceResponse(WorkExperienceBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ========== 课外活动相关模型 ==========
class ExtracurricularBase(BaseModel):
    """课外活动基础模型"""
    activity_type: ActivityType
    organization_name: str = Field(..., max_length=200)
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    achievements: Optional[str] = None

class ExtracurricularCreate(ExtracurricularBase):
    pass

class ExtracurricularUpdate(BaseModel):
    activity_type: Optional[ActivityType] = None
    organization_name: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    achievements: Optional[str] = None

class ExtracurricularResponse(ExtracurricularBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ========== 评估相关模型 ==========
class AssessmentBase(BaseModel):
    """能力评估基础模型"""
    personality_result: Dict[str, Any] = Field(default={})
    skill_scores: Dict[str, float] = Field(default={})

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    personality_result: Optional[Dict[str, Any]] = None
    skill_scores: Optional[Dict[str, float]] = None
    overall_score: Optional[float] = None

class AssessmentResponse(AssessmentBase):
    id: int
    user_id: int
    overall_score: float
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MasterAssessmentStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"


class MasterAssessmentSaveRequest(BaseModel):
    """硕士测评保存/提交请求"""
    ipip_answers: Dict[str, int] = Field(default={})
    preference_answers: Dict[str, float] = Field(default={})
    status: MasterAssessmentStatus = Field(default=MasterAssessmentStatus.DRAFT)


class MasterAssessmentResultResponse(BaseModel):
    id: int
    user_id: int
    assessment_type: str
    status: str
    raw_answers: Dict[str, Any]
    personality_result: Dict[str, float]
    preference_weights: Dict[str, Any]
    overall_score: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ========== 项目相关模型（v3：全球化 + 软性维度） ==========
class ProgramBase(BaseModel):
    """项目基础信息模型"""
    program_name: str = Field(..., min_length=2, max_length=200)
    university: str = Field(..., min_length=2, max_length=200)
    degree_subtype: Optional[str] = None
    is_stem: Optional[bool] = None

    # 全球化定位
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    city_tier: Optional[str] = None
    teaching_language: Optional[str] = None

    # 排名
    qs_ranking: Optional[int] = None
    us_news_ranking: Optional[int] = None
    subject_ranking: Optional[int] = None
    school_tier: Optional[str] = None          # HYPMS/Top10/.../Top100/其他

    # 录取要求
    gre_required: Optional[bool] = None
    avg_gre_verbal: Optional[int] = None
    avg_gre_quant: Optional[int] = None
    avg_gpa: Optional[float] = None
    min_toefl: Optional[int] = None
    min_ielts: Optional[float] = None
    requires_secondary_language: Optional[bool] = None
    application_deadlines: Optional[Dict[str, str]] = Field(default=None)
    application_fee_usd: Optional[int] = None
    rolling_admission: Optional[bool] = None

    # 项目结构
    duration_months: Optional[int] = None
    credits_required: Optional[int] = None
    course_flexibility: Optional[str] = None
    cross_registration: Optional[bool] = None
    technical_intensity: Optional[str] = None
    dual_degree_available: Optional[bool] = None
    internship_required: Optional[bool] = None
    capstone_required: Optional[bool] = None
    has_coop: Optional[bool] = None
    exchange_opportunities: Optional[bool] = None
    concentrations: Optional[List[str]] = None
    prerequisite_courses: Optional[List[str]] = None
    preferred_background: Optional[List[str]] = None
    admission_rounds: Optional[List[str]] = None
    cpt_policy: Optional[str] = None

    # 经济
    total_cost_usd: Optional[int] = None
    living_cost_usd: Optional[int] = None
    scholarship_rate: Optional[float] = None
    average_scholarship_usd: Optional[int] = None

    # 就业
    career_support: Optional[str] = None
    employment_rate_3month: Optional[float] = None
    avg_starting_salary_usd: Optional[int] = None
    employment_industries: Optional[List[str]] = None
    top_employers: Optional[List[str]] = None
    interview_required: Optional[bool] = None

    # 班级生态
    cohort_size: Optional[int] = None
    international_ratio: Optional[float] = None
    chinese_student_ratio: Optional[float] = None
    class_avg_size: Optional[int] = None
    faculty_student_ratio: Optional[float] = None
    peer_quality_score: Optional[float] = None
    competition_intensity: Optional[str] = None  # 低/中/高/极高
    program_popularity: Optional[float] = None

    # 签证与移民
    post_grad_work_visa: Optional[str] = None
    work_visa_duration_months: Optional[int] = None
    immigration_friendly: Optional[str] = None  # 低/中/高
    pr_pathway_score: Optional[float] = None
    return_to_china_recognition: Optional[str] = None  # 低/中/高

    # 软性维度
    academic_pressure: Optional[str] = None     # 低/中/高/极高
    social_culture: Optional[str] = None
    campus_safety: Optional[str] = None         # 低/中/高
    city_livability: Optional[float] = None
    chinese_community_support: Optional[str] = None
    cultural_distance: Optional[str] = None     # 低/中/高
    political_climate: Optional[str] = None
    isolation_risk: Optional[str] = None        # 低/中/高

    # 资源链接
    program_website: Optional[str] = None
    linkedin_alumni_url: Optional[str] = None
    employment_report_url: Optional[str] = None


class ProgramCreate(ProgramBase):
    pass


class ProgramUpdate(BaseModel):
    """所有字段可选的更新模型"""
    program_name: Optional[str] = None
    university: Optional[str] = None
    degree_subtype: Optional[str] = None
    is_stem: Optional[bool] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    city_tier: Optional[str] = None
    teaching_language: Optional[str] = None
    qs_ranking: Optional[int] = None
    us_news_ranking: Optional[int] = None
    subject_ranking: Optional[int] = None
    school_tier: Optional[str] = None
    gre_required: Optional[bool] = None
    avg_gre_verbal: Optional[int] = None
    avg_gre_quant: Optional[int] = None
    avg_gpa: Optional[float] = None
    min_toefl: Optional[int] = None
    min_ielts: Optional[float] = None
    requires_secondary_language: Optional[bool] = None
    application_deadlines: Optional[Dict[str, str]] = None
    application_fee_usd: Optional[int] = None
    rolling_admission: Optional[bool] = None
    duration_months: Optional[int] = None
    credits_required: Optional[int] = None
    course_flexibility: Optional[str] = None
    cross_registration: Optional[bool] = None
    technical_intensity: Optional[str] = None
    dual_degree_available: Optional[bool] = None
    internship_required: Optional[bool] = None
    capstone_required: Optional[bool] = None
    has_coop: Optional[bool] = None
    exchange_opportunities: Optional[bool] = None
    concentrations: Optional[List[str]] = None
    prerequisite_courses: Optional[List[str]] = None
    preferred_background: Optional[List[str]] = None
    admission_rounds: Optional[List[str]] = None
    cpt_policy: Optional[str] = None
    total_cost_usd: Optional[int] = None
    living_cost_usd: Optional[int] = None
    scholarship_rate: Optional[float] = None
    average_scholarship_usd: Optional[int] = None
    career_support: Optional[str] = None
    employment_rate_3month: Optional[float] = None
    avg_starting_salary_usd: Optional[int] = None
    employment_industries: Optional[List[str]] = None
    top_employers: Optional[List[str]] = None
    interview_required: Optional[bool] = None
    cohort_size: Optional[int] = None
    international_ratio: Optional[float] = None
    chinese_student_ratio: Optional[float] = None
    class_avg_size: Optional[int] = None
    faculty_student_ratio: Optional[float] = None
    peer_quality_score: Optional[float] = None
    competition_intensity: Optional[str] = None
    program_popularity: Optional[float] = None
    post_grad_work_visa: Optional[str] = None
    work_visa_duration_months: Optional[int] = None
    immigration_friendly: Optional[str] = None
    pr_pathway_score: Optional[float] = None
    return_to_china_recognition: Optional[str] = None
    academic_pressure: Optional[str] = None
    social_culture: Optional[str] = None
    campus_safety: Optional[str] = None
    city_livability: Optional[float] = None
    chinese_community_support: Optional[str] = None
    cultural_distance: Optional[str] = None
    political_climate: Optional[str] = None
    isolation_risk: Optional[str] = None
    program_website: Optional[str] = None
    linkedin_alumni_url: Optional[str] = None
    employment_report_url: Optional[str] = None


class ProgramResponse(ProgramBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ========== 看板数据模型 ==========
class RadarData(BaseModel):
    """雷达图数据模型"""
    subject: str
    score: float
    fullMark: int = 100
    
    model_config = ConfigDict(from_attributes=True)

class DashboardResponse(BaseModel):
    """个人画像看板数据响应模型"""
    radar_data: List[RadarData]
    overall_score: float
    match_programs: List[Dict[str, Any]]
    application_status: Dict[str, int]
    last_updated: datetime

# ========== 搜索响应模型 ==========
class SearchResult(BaseModel):
    """搜索结果模型"""
    id: int
    program_name: str
    university: str
    degree_subtype: str
    is_stem: bool
    match_score: float
    
    model_config = ConfigDict(from_attributes=True)

class SearchResponse(BaseModel):
    """搜索响应模型"""
    query: str
    total: int
    page: int
    limit: int
    results: List[SearchResult]

# ========== 匹配算法模型 ==========
class MatchScore(BaseModel):
    """匹配分数模型"""
    program_id: int
    program_name: str
    university: str
    overall_score: float = Field(..., ge=0, le=100)
    score_breakdown: Dict[str, float] = Field(default={
        "academic_fit": 0.0,
        "career_fit": 0.0,
        "prerequisite_fit": 0.0,
        "background_fit": 0.0,
        "preference_fit": 0.0
    })
    match_reasons: List[str] = Field(default=[])
    warning_flags: List[str] = Field(default=[])
    is_safety: bool = Field(default=False)
    is_target: bool = Field(default=False)
    is_reach: bool = Field(default=False)
    
    model_config = ConfigDict(from_attributes=True)

class RecommendationRequest(BaseModel):
    """推荐请求模型"""
    user_id: int
    max_results: int = Field(default=20, ge=1, le=100)
    include_safety: bool = Field(default=True)
    include_reach: bool = Field(default=True)
    filters: Optional[Dict[str, Any]] = Field(default={})

# ========== 健康检查模型 ==========
class HealthResponse(BaseModel):
    """健康检查响应模型"""
    status: str
    timestamp: str
    service: str
    version: str = "1.0.0"
    database_status: str = "connected"

# ========== 认证相关模型 ==========
class Token(BaseModel):
    """Token响应模型"""
    access_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    """Token数据模型"""
    user_id: Optional[int] = None
    email: Optional[str] = None
    is_admin: Optional[bool] = False

class LoginRequest(BaseModel):
    """登录请求模型"""
    email: EmailStr
    password: str


# ========== 画像看板数据模型 ==========

class HardBackgroundRadar(BaseModel):
    """硬背景竞争力雷达图数据"""
    gpa_score: float = Field(..., ge=0, le=100, description="GPA竞争力 0-100")
    test_score: float = Field(..., ge=0, le=100, description="标化成绩 0-100")
    school_tier_score: float = Field(..., ge=0, le=100, description="本科院校梯队 0-100")
    prereq_completion: float = Field(..., ge=0, le=100, description="先修课完成度 0-100")
    research_score: float = Field(..., ge=0, le=100, description="科研经历 0-100")
    internship_score: float = Field(..., ge=0, le=100, description="实习经历 0-100")
    overall: float = Field(..., ge=0, le=100, description="综合硬背景分")


class PersonalityRadar(BaseModel):
    """大五人格雷达图数据（0-100）"""
    openness: float
    conscientiousness: float
    agreeableness: float
    has_assessment: bool = False


class PreferenceWeights(BaseModel):
    """选校偏好权重面板数据"""
    academic_weight: float
    career_weight: float
    risk_tolerance: float
    interdisciplinary_openness: float
    application_mix: Dict[str, float]
    large_city_preference: float
    small_city_preference: float
    large_program_preference: float
    small_cohort_preference: float


class CareerSkillMatch(BaseModel):
    """目标职业与能力匹配面板"""
    target_career: str
    match_score: float = Field(..., ge=0, le=100)
    skills: Dict[str, int]
    skill_gaps: List[str]
    career_radar: List[Dict[str, Any]]


class UserProfileResponse(BaseModel):
    """用户完整画像数据"""
    id: int
    nickname: str
    hard_background: HardBackgroundRadar
    personality: PersonalityRadar
    preferences: PreferenceWeights
    career_match: CareerSkillMatch
    overall_competitiveness: float = Field(..., ge=0, le=100)
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


class SkillSelfAssessmentUpdate(BaseModel):
    """技能自评更新"""
    skills: Dict[str, int] = Field(..., description="技能名 -> 熟练度 1-5")