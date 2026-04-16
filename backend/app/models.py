# backend/app/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime, Text
from sqlalchemy import ForeignKey, Table
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

# 关联表定义
program_prerequisites = Table(
    'program_prerequisites',
    Base.metadata,
    Column('program_id', Integer, ForeignKey('programs.id'), primary_key=True),
    Column('prerequisite_id', Integer, ForeignKey('prerequisites.id'), primary_key=True),
    Column('requirement_type', String(20)),
    Column('minimum_grade', String(10)),
    Column('alternatives', JSON)
)

program_skill_mapping = Table(
    'program_skill_mapping',
    Base.metadata,
    Column('program_id', Integer, ForeignKey('programs.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('program_skills.id'), primary_key=True),
    Column('proficiency_level', String(20)),
    Column('is_core_skill', Boolean, default=True)
)

class User(Base):
    """用户表模型"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    is_admin = Column(Boolean, default=False)
    nickname = Column(String(100))
    undergraduate_school = Column(String(255))
    undergraduate_major = Column(String(100))
    gpa = Column(Float)
    language_score = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 硕士专属字段
    prerequisite_completion = Column(JSON, default=list)
    work_experience_months = Column(Integer, default=0)
    internship_count = Column(Integer, default=0)
    research_experience = Column(String(50))
    target_industries = Column(JSON, default=list)
    career_goal = Column(String(50))
    require_stem = Column(Boolean, default=True)
    target_salary_usd = Column(Integer)
    location_preference = Column(JSON, default=list)
    program_preference = Column(JSON, default={
        "min_duration": 12,
        "max_duration": 24,
        "max_tuition": 80000,
        "must_stem": False,
        "preferred_destinations": [],
        "technical_intensity": "适中"
    })
    test_scores = Column(JSON, default={
        "gre_verbal": None,
        "gre_quant": None,
        "gre_writing": None,
        "toefl": None,
        "ielts": None
    })
    application_status = Column(String(50), default="规划中")
    dream_schools = Column(JSON, default=list)
    safety_schools = Column(JSON, default=list)
    # 本科院校梯队（用于硬背景竞争力计算）
    undergraduate_school_tier = Column(String(20), nullable=True)
    # 技能自评（key: 技能名, value: 熟练度1-5）
    skill_self_assessment = Column(JSON, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    work_experiences = relationship("WorkExperience", back_populates="user")
    extracurriculars = relationship("Extracurricular", back_populates="user")
    assessments = relationship("Assessment", back_populates="user")

class Program(Base):
    """硕士项目表模型（v3：全球化 + 软性维度）"""
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    program_name = Column(String(255), nullable=False)
    university = Column(String(255), nullable=False)
    difficulty_rating = Column(Integer)
    match_tags = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── 基础信息 ──
    degree_subtype = Column(String(20))           # MA/MS/MBA/MPP/MPA/MEng/LLM
    is_stem = Column(Boolean, default=False)
    country = Column(String(50))                   # 新增：国家
    region = Column(String(50))                    # 新增：地区（美东/美西/英格兰/欧陆等）
    city = Column(String(100))                     # 新增：城市
    city_tier = Column(String(20))                 # 新增：大都市/中等城市/大学城
    concentrations = Column(JSON, default=list)
    prerequisite_courses = Column(JSON, default=list)
    preferred_background = Column(JSON, default=list)
    admission_rounds = Column(JSON, default=list)
    teaching_language = Column(String(20), default="English")  # 新增：授课语言
    cpt_policy = Column(String(100))

    # ── 排名 ──
    qs_ranking = Column(Integer)                   # 新增：QS综合排名
    us_news_ranking = Column(Integer)              # 新增：US News排名
    subject_ranking = Column(Integer)              # 新增：专业排名
    school_tier = Column(String(20))               # HYPMS/Top10/Top20/Top30/Top50/Top100/100+
    program_popularity = Column(Float, default=0)

    # ── 录取要求（项目级匹配用） ──
    gre_required = Column(Boolean, default=True)
    avg_gre_verbal = Column(Integer)
    avg_gre_quant = Column(Integer)
    avg_gpa = Column(Float)
    min_toefl = Column(Integer)                    # 新增
    min_ielts = Column(Float)                      # 新增
    requires_secondary_language = Column(Boolean, default=False)  # 新增：需要小语种
    application_deadlines = Column(JSON, default={})
    application_fee_usd = Column(Integer)
    rolling_admission = Column(Boolean, default=False)

    # ── 项目结构 ──
    duration_months = Column(Integer)
    credits_required = Column(Integer)
    course_flexibility = Column(String(10))        # 低/中/高
    cross_registration = Column(Boolean, default=False)
    technical_intensity = Column(String(10))
    dual_degree_available = Column(Boolean, default=False)
    internship_required = Column(Boolean, default=False)
    capstone_required = Column(Boolean, default=True)
    has_coop = Column(Boolean, default=False)      # 新增：Co-op项目
    exchange_opportunities = Column(Boolean, default=False)  # 新增

    # ── 经济 ──
    total_cost_usd = Column(Integer)
    living_cost_usd = Column(Integer)
    scholarship_rate = Column(Float)
    average_scholarship_usd = Column(Integer)

    # ── 就业 ──
    career_support = Column(String(20))
    employment_rate_3month = Column(Float)
    avg_starting_salary_usd = Column(Integer)
    employment_industries = Column(JSON, default=list)
    top_employers = Column(JSON, default=list)
    interview_required = Column(Boolean, default=False)

    # ── 班级生态 ──
    cohort_size = Column(Integer)
    international_ratio = Column(Float)
    chinese_student_ratio = Column(Float)          # 新增：中国学生比例
    class_avg_size = Column(Integer)
    faculty_student_ratio = Column(Float)
    peer_quality_score = Column(Float)
    competition_intensity = Column(String(10))     # 低/中/高/极高

    # ── 签证与移民（新增维度） ──
    post_grad_work_visa = Column(String(100))      # OPT/PSW/Search Year/蓝卡等
    work_visa_duration_months = Column(Integer)    # 工签时长
    immigration_friendly = Column(String(10))      # 低/中/高（该国移民友好度）
    pr_pathway_score = Column(Float)               # 0-1 永居路径可行性
    return_to_china_recognition = Column(String(10))  # 低/中/高（回国认可度）

    # ── 软性维度（新增，用于性格-学校匹配） ──
    # 这些字段可以由爬虫数据/人工标注填充
    academic_pressure = Column(String(10))         # 低/中/高/极高（学业压力/内卷度）
    social_culture = Column(String(20))            # networking导向/学术安静/party school
    campus_safety = Column(String(10))             # 低/中/高
    city_livability = Column(Float)                # 0-1 城市宜居度
    chinese_community_support = Column(String(10))  # 低/中/高（华人社区成熟度）
    cultural_distance = Column(String(10))         # 低/中/高（与中国文化距离）
    political_climate = Column(String(20))         # liberal/moderate/conservative
    isolation_risk = Column(String(10))            # 低/中/高（孤独感风险）

    # ── 社区舆情（来自 crawler/community_enrichment POC） ──
    community_verdict = Column(Text)                # 过来人一句话总结
    community_tags = Column(JSON)                   # 完整 tags 结构（strengths/concerns/red_flags/evidence...）
    community_confidence = Column(Float)            # 0-1
    community_updated_at = Column(DateTime(timezone=True))

    # ── 资源链接 ──
    program_website = Column(String(500))
    linkedin_alumni_url = Column(String(500))
    employment_report_url = Column(String(500))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    prerequisites = relationship("Prerequisite", secondary=program_prerequisites, back_populates="programs")
    skills = relationship("ProgramSkill", secondary=program_skill_mapping, back_populates="programs")

class Prerequisite(Base):
    """先修课表模型"""
    __tablename__ = "prerequisites"
    
    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(20), unique=True, nullable=False)
    course_name_cn = Column(String(100), nullable=False)
    course_name_en = Column(String(100), nullable=False)
    category = Column(String(50))
    difficulty_level = Column(String(20))
    typical_hours = Column(Integer)
    description = Column(Text)
    recommended_majors = Column(JSON, default=list)
    is_common_requirement = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    programs = relationship("Program", secondary=program_prerequisites, back_populates="prerequisites")

class ProgramSkill(Base):
    """项目技能表模型"""
    __tablename__ = "program_skills"
    
    id = Column(Integer, primary_key=True, index=True)
    skill_code = Column(String(20), unique=True, nullable=False)
    skill_name_cn = Column(String(100), nullable=False)
    skill_name_en = Column(String(100), nullable=False)
    skill_category = Column(String(50))
    onet_code = Column(String(20))
    description = Column(Text)
    typical_programs = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    programs = relationship("Program", secondary=program_skill_mapping, back_populates="skills")

class WorkExperience(Base):
    """工作经历表模型"""
    __tablename__ = "work_experiences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String(200), nullable=False)
    position = Column(String(100), nullable=False)
    industry = Column(String(100))
    employment_type = Column(String(20))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_current = Column(Boolean, default=False)
    description = Column(Text)
    skills_gained = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", back_populates="work_experiences")

class Extracurricular(Base):
    """课外活动表模型"""
    __tablename__ = "extracurriculars"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String(50))
    organization_name = Column(String(200), nullable=False)
    role = Column(String(100))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    description = Column(Text)
    achievements = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", back_populates="extracurriculars")

class Assessment(Base):
    """测评结果表（v3：多信号推断 + 冲突检测 + 解释层）"""
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    assessment_type = Column(String(50), default="master_fit")
    status = Column(String(20), default="draft")       # draft / submitted
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── 原始答案 ──
    raw_answers = Column(JSON, default=dict)            # {A1: "a", B2: 3.6, C1: "b", ...}

    # ── 推断引擎输出 ──

    # 目标推断（多信号）
    inferred_goal_type = Column(String(30))             # stay_abroad/experience_then_return/credential/academic/exploring
    goal_confidence = Column(Float)                     # 0-1，多信号一致程度
    goal_hypothesis = Column(String(30))                # A1的原始回答（初始假设）
    fallback_strategy = Column(String(30))              # brand_hedge/mobility/academic/none/cost_sensitive
    destination_preference = Column(JSON, default=list)  # ["US","UK","HK",...]

    # 专业方向
    undergrad_field = Column(String(30))                # 本科专业大类
    target_fields = Column(JSON, default=list)          # 目标申请方向（多选）

    # 新增背景信息
    class_rank = Column(String(20))                     # top5/top15/top30/top50/below50/unknown
    work_years = Column(String(10))                     # none/lt1/1_3/3_5/5plus
    gre_tier = Column(String(20))                       # gre_325plus/gre_315/gre_305/gmat_700plus/gmat_650/no_gre
    personal_context = Column(JSON, default=list)       # ["working","married","career_switch",...]
    is_cross_major = Column(Boolean, default=False)

    # 驱动力与画像
    drive = Column(String(20))                          # career/academic/creative/impact/growth/unsure
    priority = Column(String(20))                       # alumni_network/faculty/community/resources/social_focus/employment
    archetype = Column(String(20))                      # career/academic/creative/social_impact/exploring

    # 背景快照（原始值，不归一化）
    school_tier = Column(String(20))                    # 本科段位原始值
    gpa_raw = Column(Float)
    experience_tags = Column(JSON, default=list)        # ["intern_1","research","publication"]
    language_tier = Column(String(10))                  # a/b/c/d/e
    has_secondary_language = Column(Boolean, default=False)
    budget_tier = Column(Integer)                       # 1-5

    # 性格-环境适配（可匹配变量）
    city_preference = Column(String(20))                # large/medium/small/any
    chinese_ratio_pref = Column(String(20))             # low/moderate/high/any
    lifestyle_floor = Column(Float)                     # 0-1
    safety_weight = Column(Float)                       # 0-1
    independence_level = Column(Float)                  # 0-1
    culture_openness = Column(Float)                    # 0-1

    # 性格-风险提示变量（不用于筛选，用于warning）
    extraversion = Column(Float)                        # 0-1
    stress_tolerance = Column(Float)                    # 0-1

    # 价值观权衡
    value_weights = Column(JSON, default=dict)          # {rank_vs_location: 0.4, rank_vs_cost: 0.6, ...}

    # 风险画像（三信号加权）
    variance_tolerance = Column(Float)                  # 0-1 方差容忍
    downside_tolerance = Column(Float)                  # 0-1 失败成本承受
    risk_profile = Column(String(20))                   # aggressive/balanced/conservative

    # 选校配方
    application_mix = Column(JSON, default=dict)        # {reach: 0.3, target: 0.4, safety: 0.3}
    destination_diversity = Column(String(20))          # single/multi/max
    rank_importance = Column(Integer)                   # 1-10
    dealbreaker = Column(String(30))                    # no_recognition/unemployment/bad_experience/unsafe/no_learning

    # 目的地特定信号
    destination_signals = Column(JSON, default=dict)    # {h1b_tolerance: 0.5, psw_plan: "...", ...}

    # ── 冲突检测输出 ──
    conflicts = Column(JSON, default=list)              # [{type, desc, insight, impact}, ...]

    # ── 解释层输出 ──
    decision_profile_summary = Column(Text)             # "高风险偏好 + 留美导向 + 就业优先"
    hidden_risks = Column(JSON, default=list)           # ["你的抗压偏低但目标院校多为高压", ...]

    # ── 兼容旧版（渐进迁移） ──
    personality_result = Column(JSON)
    skill_scores = Column(JSON, default=dict)
    overall_score = Column(Float)
    preference_weights = Column(JSON, default=dict)

    # 关系
    user = relationship("User", back_populates="assessments")