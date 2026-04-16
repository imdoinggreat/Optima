"""
Aspect taxonomy + weight profiles.

Versioning: 改任何 aspect / weight 都要 bump AGGREGATOR_VERSION,
这样 DB 里存的 verdict 可以标注来自哪个 aggregator 版本。
"""
from __future__ import annotations

AGGREGATOR_VERSION = 2  # v2: +practical_exposure +digital_analytics_depth

# ─────────────────────────────────────────────────────────
# Taxonomy
# ─────────────────────────────────────────────────────────
ASPECTS_CORE = [
    "employment",              # 就业强度 / 大厂 offer 率 / 结果
    "cost_roi",                # 学费 / 性价比 / 回本
    "workload",                # 课业压力 / 内卷
    "visa_immigration",        # OPT / PSW / 工签 / 移民
    "brand_global",            # 全球学术声誉 / 顶会认可
    "brand_china",             # 国内市场认可 / HR 熟识度
    "curriculum",              # 课程实用性 / 技术栈新旧 / 深度
    "location_opportunity",    # 城市资源 / 实习地理便利
    "network_outcome",         # 校友 / 内推 / networking 就业杠杆
    "chinese_community",       # 华人占比 / 中文圈氛围
    "practical_exposure",      # 实战项目 / 真实客户 / agency / case comp / 作品集产出
    "digital_analytics_depth", # 数据分析 / SQL / Python / ML / Tableau 硬技能
]

ASPECTS_SOFT = [
    "happiness_wellbeing",   # 心理健康 / 满意度 / burnout
    "diversity_inclusion",   # 多元 / 包容 / 歧视体验
    "campus_experience",     # 校园资源 / 活动 / 社团
]

ASPECTS_ALL = ASPECTS_CORE + ASPECTS_SOFT


# 每个 aspect 的中文显示名 (pros/cons 渲染用)
ASPECT_LABEL_ZH = {
    "employment": "就业",
    "cost_roi": "性价比",
    "workload": "课业压力",
    "visa_immigration": "工签/移民",
    "brand_global": "全球品牌",
    "brand_china": "国内认可",
    "curriculum": "课程质量",
    "location_opportunity": "地理资源",
    "network_outcome": "校友网络",
    "chinese_community": "华人氛围",
    "practical_exposure": "实战曝光",
    "digital_analytics_depth": "硬技能",
    "happiness_wellbeing": "心理/幸福感",
    "diversity_inclusion": "多元包容",
    "campus_experience": "校园体验",
}


# ─────────────────────────────────────────────────────────
# Weight profiles (sum ≈ 1.0 per profile)
# ─────────────────────────────────────────────────────────
def _pad(weights: dict[str, float]) -> dict[str, float]:
    """补齐 ASPECTS_ALL 里没显式赋值的 aspect = 0, 方便写 profile 时只列非零项。"""
    full = {a: 0.0 for a in ASPECTS_ALL}
    full.update(weights)
    return full


PROFILES: dict[str, dict[str, float]] = {
    # 通用默认: 适合没做过详细测评的用户
    "default": _pad({
        "employment":              0.25,
        "cost_roi":                0.17,
        "workload":                0.11,
        "visa_immigration":        0.09,
        "curriculum":              0.08,
        "brand_global":            0.07,
        "brand_china":             0.06,
        "network_outcome":         0.05,
        "location_opportunity":    0.05,
        "practical_exposure":      0.03,
        "digital_analytics_depth": 0.02,
        "chinese_community":       0.02,
    }),

    # 就业导向: 进大厂 / 留美 / 快速回本
    "employment_focused": _pad({
        "employment":              0.32,
        "network_outcome":         0.14,
        "cost_roi":                0.14,
        "visa_immigration":        0.09,
        "workload":                0.07,
        "curriculum":              0.06,
        "practical_exposure":      0.05,
        "digital_analytics_depth": 0.05,
        "brand_global":            0.04,
        "location_opportunity":    0.02,
        "brand_china":             0.01,
        "chinese_community":       0.01,
    }),

    # 回国发展: 牌子 > 能力 / 认知社会优先
    "return_to_china": _pad({
        "brand_china":             0.28,
        "employment":              0.18,
        "cost_roi":                0.14,
        "workload":                0.09,
        "curriculum":              0.07,
        "brand_global":            0.07,
        "practical_exposure":      0.05,
        "chinese_community":       0.05,
        "location_opportunity":    0.03,
        "digital_analytics_depth": 0.02,
        "network_outcome":         0.01,
        "visa_immigration":        0.01,
    }),

    # Marketing 导向: 重牌子重实战重就业, 传统 mkt / 品牌方路径
    # 典型用户: Northwestern IMC / USC Annenberg / UK mkt / 欧洲 mkt / HK mkt
    "marketing_track": _pad({
        "brand_china":             0.20,
        "employment":              0.17,
        "practical_exposure":      0.13,  # mkt 的核心差异点
        "network_outcome":         0.10,
        "cost_roi":                0.09,
        "brand_global":            0.08,
        "location_opportunity":    0.08,
        "curriculum":              0.05,
        "digital_analytics_depth": 0.05,  # mkt analytics 派的加分项
        "workload":                0.03,
        "visa_immigration":        0.01,
        "chinese_community":       0.01,
    }),

    # 体验/生活导向: 显式 opt-in soft 维度才激活
    "lifestyle": _pad({
        "happiness_wellbeing":     0.20,
        "location_opportunity":    0.14,
        "workload":                0.14,
        "diversity_inclusion":     0.10,
        "campus_experience":       0.10,
        "employment":              0.10,
        "cost_roi":                0.07,
        "curriculum":              0.06,
        "practical_exposure":      0.04,
        "brand_global":            0.03,
        "network_outcome":         0.02,
    }),
}


def validate_profiles() -> None:
    """Sanity check: 每个 profile 权重和应 ≈ 1.0, 覆盖所有 aspect."""
    for name, w in PROFILES.items():
        total = sum(w.values())
        assert 0.98 <= total <= 1.02, f"profile {name} 权重和 = {total}"
        missing = set(ASPECTS_ALL) - set(w.keys())
        assert not missing, f"profile {name} 缺 aspect: {missing}"


# Import-time self-check
validate_profiles()


# ─────────────────────────────────────────────────────────
# Source quality weights (for confidence computation)
# ─────────────────────────────────────────────────────────
SOURCE_WEIGHTS = {
    "1point3acres":  0.95,
    "1point3acres.com": 0.95,
    "instant.1point3acres.cn": 0.95,
    "reddit":        0.90,
    "reddit.com":    0.90,
    "zhihu":         0.85,
    "zhihu.com":     0.85,
    "zhuanlan.zhihu.com": 0.85,
    "douban":        0.70,
    "douban.com":    0.70,
    "m.douban.com":  0.70,
    "xiaohongshu":   0.65,
    "xhs":           0.65,
    "personal_blog": 0.60,
    "wechat":        0.55,
    "mp.weixin.qq.com": 0.55,
    "official":      0.40,  # 官方资料客观但缺负面
    "agency":        0.25,  # 中介软文
}
DEFAULT_SOURCE_WEIGHT = 0.50  # 未知源兜底
