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
        "must_stem": True,
        "preferred_regions": ["美东", "美西"],
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
    """硕士项目表模型"""
    __tablename__ = "programs"
    
    id = Column(Integer, primary_key=True, index=True)
    program_name = Column(String(255), nullable=False)
    university = Column(String(255), nullable=False)
    difficulty_rating = Column(Integer)
    match_tags = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 硕士专属字段
    degree_subtype = Column(String(20))
    is_stem = Column(Boolean, default=False)
    cpt_policy = Column(String(100))
    concentrations = Column(JSON, default=list)
    prerequisite_courses = Column(JSON, default=list)
    preferred_background = Column(JSON, default=list)
    admission_rounds = Column(JSON, default=list)
    cohort_size = Column(Integer)
    international_ratio = Column(Float)
    employment_industries = Column(JSON, default=list)
    top_employers = Column(JSON, default=list)
    school_tier = Column(String(20))
    program_popularity = Column(Float, default=0)
    
    # 课程自由度与硬核度
    course_flexibility = Column(String(10))
    cross_registration = Column(Boolean, default=False)
    technical_intensity = Column(String(10))
    
    # 真实成本
    total_cost_usd = Column(Integer)
    living_cost_usd = Column(Integer)
    scholarship_rate = Column(Float)
    average_scholarship_usd = Column(Integer)
    
    # 就业服务
    career_support = Column(String(20))
    interview_required = Column(Boolean, default=False)
    
    # 录取要求
    gre_required = Column(Boolean, default=True)
    avg_gre_verbal = Column(Integer)
    avg_gre_quant = Column(Integer)
    avg_gpa = Column(Float)
    application_deadlines = Column(JSON, default={})
    application_fee_usd = Column(Integer)
    rolling_admission = Column(Boolean, default=False)
    
    # 项目结构
    dual_degree_available = Column(Boolean, default=False)
    employment_rate_3month = Column(Float)
    avg_starting_salary_usd = Column(Integer)
    internship_required = Column(Boolean, default=False)
    capstone_required = Column(Boolean, default=True)
    duration_months = Column(Integer)
    credits_required = Column(Integer)
    
    # 班级生态
    class_avg_size = Column(Integer)
    faculty_student_ratio = Column(Float)
    peer_quality_score = Column(Float)
    competition_intensity = Column(String(10))
    
    # 资源链接
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
    """能力评估表模型"""
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    personality_result = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 新增硕士专属评估字段
    skill_scores = Column(JSON, default=dict)
    overall_score = Column(Float)
    assessment_type = Column(String(50), default="master_fit")
    status = Column(String(20), default="draft")
    raw_answers = Column(JSON, default=dict)
    preference_weights = Column(JSON, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", back_populates="assessments")