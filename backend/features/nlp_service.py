"""
nlp_service.py — 硕士申请者用户向量自动生成服务

把用户画像转化为三个可与项目向量直接计算余弦相似度的子向量：

1. hard_vec    (6维归一化)  — GPA/标化/院校梯队/先修完成度/科研/实习
2. bg_vec      (N维one-hot) — 先修课完成情况 + 行业背景
3. soft_vec    (384维语义)  — 大五人格 + 选校偏好 + 职业目标（sentence-transformers）

最终 user_vector = concat(hard_vec, bg_vec, soft_vec)  (存入 users.skill_self_assessment 的同一行，
或单独存表 —— 当前方案直接在内存中组装，供 matching 服务调用)
"""
from __future__ import annotations

import json
import math
from typing import Any, Dict, List, Optional

import numpy as np

# ─────────────────────────────────────────────────────────────
# 常量与映射表
# ─────────────────────────────────────────────────────────────

# 中国本科院校梯队（影响录取竞争力评估）
SCHOOL_TIER_SCORE: Dict[str, float] = {
    "清北": 1.00, "C9": 0.90, "985": 0.75,
    "211": 0.55, "双一流": 0.40, "其他": 0.22,
}

RESEARCH_SCORE: Dict[str, float] = {
    "无": 0.00, "课程项目": 0.28, "实验室助理": 0.52,
    "独立研究": 0.78, "发表论文": 1.00,
}

# 先修课 one-hot 词汇表（与 MasterApplicationForm 保持一致）
PREREQ_VOCAB: List[str] = [
    "微积分", "线性代数", "概率论与数理统计", "离散数学",
    "数据结构与算法", "数据库系统", "操作系统", "计算机网络",
    "机器学习基础", "深度学习", "Python编程", "R语言",
    "统计学", "经济学原理",
]

# 行业 one-hot 词汇表（与 MasterApplicationForm 保持一致）
INDUSTRY_VOCAB: List[str] = [
    "科技/互联网", "金融/投行", "咨询", "快消/零售",
    "医疗/生物", "教育", "政府/非盈利", "制造业", "其他",
]


# ─────────────────────────────────────────────────────────────
# 硬背景向量（6维，已归一化 0-1）
# ─────────────────────────────────────────────────────────────

def build_hard_vec(user_data: Dict[str, Any]) -> np.ndarray:
    """
    生成 6 维硬背景向量。

    Args:
        user_data: 从 models.User 或 dict 读取的用户字段

    Returns:
        shape (6,) float32 array，值域 [0, 1]
    """
    # GPA 归一化 (0-4 → 0-1)
    gpa = float(user_data.get("gpa") or 0)
    gpa_norm = min(gpa / 4.0, 1.0)

    # 标化成绩
    ts = user_data.get("test_scores") or {}
    if isinstance(ts, str):
        ts = json.loads(ts)
    gre_q = ts.get("gre_quant")
    toefl  = ts.get("toefl")
    ielts  = ts.get("ielts")
    if gre_q is not None:
        test_norm = min(max((float(gre_q) - 130) / 40, 0), 1.0)
    elif toefl is not None:
        test_norm = min(max((float(toefl) - 60) / 50, 0), 1.0)
    elif ielts is not None:
        test_norm = min(max((float(ielts) - 5.0) / 4.0, 0), 1.0)
    else:
        test_norm = 0.0

    # 本科院校梯队
    tier = user_data.get("undergraduate_school_tier") or "其他"
    school_norm = SCHOOL_TIER_SCORE.get(tier, 0.22)

    # 先修课完成度
    prereqs = user_data.get("prerequisite_completion") or []
    if isinstance(prereqs, str):
        prereqs = json.loads(prereqs)
    if prereqs:
        completed = sum(1 for p in prereqs if p.get("completed", False))
        prereq_norm = completed / len(prereqs)
    else:
        prereq_norm = 0.0

    # 科研经历
    research = user_data.get("research_experience") or "无"
    research_norm = RESEARCH_SCORE.get(research, 0.0)

    # 实习经历（每3段 = 满分）
    internship_count = int(user_data.get("internship_count") or 0)
    internship_norm = min(internship_count / 3.0, 1.0)

    return np.array(
        [gpa_norm, test_norm, school_norm, prereq_norm, research_norm, internship_norm],
        dtype=np.float32,
    )


# ─────────────────────────────────────────────────────────────
# 背景 one-hot 向量（先修课 + 行业）
# ─────────────────────────────────────────────────────────────

def build_bg_vec(user_data: Dict[str, Any]) -> np.ndarray:
    """
    生成先修课 + 行业的 one-hot 向量。

    Returns:
        shape (len(PREREQ_VOCAB) + len(INDUSTRY_VOCAB),) float32 array
    """
    prereqs = user_data.get("prerequisite_completion") or []
    if isinstance(prereqs, str):
        prereqs = json.loads(prereqs)
    completed_courses = {
        p.get("course", "") for p in prereqs if p.get("completed", False)
    }

    prereq_vec = np.array(
        [1.0 if c in completed_courses else 0.0 for c in PREREQ_VOCAB],
        dtype=np.float32,
    )

    industries = user_data.get("target_industries") or []
    if isinstance(industries, str):
        industries = json.loads(industries)
    industry_set = set(industries)

    industry_vec = np.array(
        [1.0 if ind in industry_set else 0.0 for ind in INDUSTRY_VOCAB],
        dtype=np.float32,
    )

    return np.concatenate([prereq_vec, industry_vec])


# ─────────────────────────────────────────────────────────────
# 软特质向量（384 维语义，依赖 sentence-transformers）
# ─────────────────────────────────────────────────────────────

def _build_soft_text(user_data: Dict[str, Any], personality: Optional[Dict[str, float]] = None,
                     preferences: Optional[Dict[str, Any]] = None) -> str:
    """
    把用户画像拼接成自然语言文本，用于语义编码。
    不依赖 sentence-transformers 的纯文本版本，可单独调用。
    """
    lines: List[str] = []

    career_goal = user_data.get("career_goal") or "未确定"
    lines.append(f"职业目标：{career_goal}")

    industries = user_data.get("target_industries") or []
    if isinstance(industries, str):
        industries = json.loads(industries)
    if industries:
        lines.append(f"目标行业：{', '.join(industries)}")

    if personality:
        o = personality.get("openness", 0.5)
        c = personality.get("conscientiousness", 0.5)
        a = personality.get("agreeableness", 0.5)
        lines.append(
            f"性格：开放性{o:.2f}，尽责性{c:.2f}，宜人性{a:.2f}"
        )

    if preferences:
        aw = preferences.get("academic_weight", 0.5)
        cw = preferences.get("career_weight", 0.5)
        inter = preferences.get("interdisciplinary_openness", 0.5)
        lines.append(
            f"偏好：学术权重{aw:.2f}，就业权重{cw:.2f}，跨学科{inter:.2f}"
        )

    return " ".join(lines)


def build_soft_vec(
    user_data: Dict[str, Any],
    personality: Optional[Dict[str, float]] = None,
    preferences: Optional[Dict[str, Any]] = None,
) -> np.ndarray:
    """
    生成 384 维语义向量。

    若 sentence-transformers 未安装，回退到基于数值的 20 维向量（补零到 384 维），
    确保函数签名稳定，不会因缺包而崩溃。
    """
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        text = _build_soft_text(user_data, personality, preferences)
        vec = model.encode(text, normalize_embeddings=True)
        return vec.astype(np.float32)
    except ImportError:
        return _build_soft_vec_fallback(user_data, personality, preferences)


def _build_soft_vec_fallback(
    user_data: Dict[str, Any],
    personality: Optional[Dict[str, float]],
    preferences: Optional[Dict[str, Any]],
) -> np.ndarray:
    """384 维占位向量（当 sentence-transformers 不可用时）"""
    raw: List[float] = []

    p = personality or {}
    raw += [
        float(p.get("openness", 0.5)),
        float(p.get("conscientiousness", 0.5)),
        float(p.get("agreeableness", 0.5)),
    ]

    pw = preferences or {}
    raw += [
        float(pw.get("academic_weight", 0.5)),
        float(pw.get("career_weight", 0.5)),
        float(pw.get("risk_tolerance", 0.5)),
        float(pw.get("interdisciplinary_openness", 0.5)),
        float(pw.get("large_city_preference", 0.5)),
        float(pw.get("small_cohort_preference", 0.5)),
    ]

    # 职业目标 one-hot (5类)
    career_map = {
        "留美就业": 0, "回国就业": 1, "继续深造": 2, "创业": 3, "未确定": 4
    }
    career = user_data.get("career_goal") or "未确定"
    career_oh = [0.0] * 5
    career_oh[career_map.get(career, 4)] = 1.0
    raw += career_oh

    vec = np.array(raw, dtype=np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm

    full = np.zeros(384, dtype=np.float32)
    full[:len(vec)] = vec
    return full


# ─────────────────────────────────────────────────────────────
# 主入口：生成完整用户向量
# ─────────────────────────────────────────────────────────────

def build_user_vector(
    user_data: Dict[str, Any],
    personality: Optional[Dict[str, float]] = None,
    preferences: Optional[Dict[str, Any]] = None,
    include_soft: bool = False,
) -> Dict[str, Any]:
    """
    生成完整用户向量字典。

    Returns:
        {
            "hard_vec": List[float],      # 6 维
            "bg_vec":   List[float],      # len(PREREQ_VOCAB)+len(INDUSTRY_VOCAB) 维
            "soft_vec": List[float],      # 384 维（include_soft=True 时才计算）
            "user_vector": List[float],   # 全量拼接（include_soft=True）
        }
    """
    hard = build_hard_vec(user_data)
    bg = build_bg_vec(user_data)

    result: Dict[str, Any] = {
        "hard_vec": hard.tolist(),
        "bg_vec": bg.tolist(),
    }

    if include_soft:
        soft = build_soft_vec(user_data, personality, preferences)
        result["soft_vec"] = soft.tolist()
        result["user_vector"] = np.concatenate([hard, bg, soft]).tolist()
    else:
        result["user_vector"] = np.concatenate([hard, bg]).tolist()

    return result


# ─────────────────────────────────────────────────────────────
# 余弦相似度工具
# ─────────────────────────────────────────────────────────────

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """计算两个向量的余弦相似度，值域 [-1, 1]"""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    na = np.linalg.norm(va)
    nb = np.linalg.norm(vb)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))
