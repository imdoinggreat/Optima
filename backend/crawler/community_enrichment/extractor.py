"""
用 DeepSeek 从多源原文片段里抽取结构化信息。

职责严格拆分:
  - extract_claims: 抽 aspect-level claims, **只做抽取不做判断**.
    Verdict 由 aggregator/core.py 用纯 Python 规则聚合, 避免 LLM 当法官.
  - extract_facts : 抽客观事实字段 (country/cost/gpa...) 供 DB 预填.

两个函数共用相同的 docs 源, 但 prompt 和 schema 完全独立, 互不污染.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI  # DeepSeek API 兼容 OpenAI SDK
except ImportError:
    OpenAI = None  # type: ignore

DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"  # 便宜、快，适合结构化抽取


@dataclass
class SourceDoc:
    """喂给 extractor 的单条原文"""
    url: str
    title: str
    text: str
    source_domain: str


CLAIMS_SYSTEM_PROMPT = """你是信息抽取器。**不做总结、不做判断、不做推荐**。只负责把原文里表达的评价拆成原子 claim。

任务：从我提供的多段原文里，抽取关于某个留学项目的 **aspect-level claims** 数组。

严格规则：
1. **只基于我给你的原文**。原文没提到的，绝不生成。
2. 每条 claim 必须:
   - `aspect` 从下面固定集合里选, 不要创造新 aspect
   - `sentiment` ∈ {positive, negative, neutral} (中性谈事实、无褒贬 → neutral)
   - `evidence_quote` 必须是原文原话的短引用 (可省略号但不得改写)
   - `source_index` 是原文段落编号 (从 1 起)
   - `source_type` ∈ {agency, official, personal, community}:
       * agency  = 留学中介公众号/博客 (美化签约项目, 贬低竞品, 降权)
       * official = 学校/项目官方页面
       * personal = 学长学姐个人博客/公众号
       * community = 一亩三分地/知乎/Reddit/豆瓣/小红书/寄托 等论坛
3. **一段原文可以产出多条 claim** (一段话可能同时评价就业和压力)。
4. 不要合并多段原文为一条 claim。claim 越原子越好。
5. 如果原文是中介软文的"推荐", 依然如实抽取但 source_type 标 agency, 让下游去降权。
6. 没 claim 可抽 → 返回空数组 `{"claims": []}`。

aspect 固定集合 (15 个, **这是唯一合法取值**):
  * employment              — 就业强度 / 大厂 offer / 结果
  * cost_roi                — 学费 / 性价比 / 回本
  * workload                — 课业压力 / 内卷度 / 熬夜
  * visa_immigration        — OPT / PSW / 工签 / 移民路径
  * brand_global            — 全球学术/业界品牌, 顶会 / 全球排名
  * brand_china             — 国内认可度 / HR 熟识 / 回国优势
  * curriculum              — 课程实用性 / 技术栈 / 深度 / 理论广度
  * location_opportunity    — 城市资源 / 实习 / 地理便利 / 安全
  * network_outcome         — 校友 / 内推 / networking 对就业的加成
  * chinese_community       — 华人占比 / 中文圈 / 互助氛围
  * practical_exposure      — 真实客户 / agency 合作 / case competition / 产出作品集 / industry mentor
  * digital_analytics_depth — 数据 / SQL / Python / Tableau / ML / A/B 测试等硬技能含量
  * happiness_wellbeing     — 心理健康 / 满意度 / burnout (只在原文明确提及时抽取)
  * diversity_inclusion     — 多元 / 包容 / 歧视体验 (只在原文明确提及时抽取)
  * campus_experience       — 校园资源 / 活动 / 社团 (只在原文明确提及时抽取)

输出严格 JSON, schema:
{
  "claims": [
    {
      "aspect": "employment",
      "sentiment": "positive",
      "evidence_quote": "毕业去大厂的很多",
      "source_index": 1,
      "source_type": "personal"
    },
    ...
  ]
}

只输出 JSON, 不要任何其他文字。不要 markdown, 不要代码块围栏。"""


# 向后兼容: 老 extract_tags 的 prompt 保留为别名, 废弃后续删除
SYSTEM_PROMPT = CLAIMS_SYSTEM_PROMPT


MAX_DOCS_PER_CALL = 10
MAX_CHARS_PER_DOC = 2000

# 复用 aggregator 里的源质量表, 按质量排序后取 top-K 送给 DeepSeek
try:
    from .aggregator.profiles import SOURCE_WEIGHTS as _SRC_W, DEFAULT_SOURCE_WEIGHT as _DEF_W
except Exception:
    _SRC_W, _DEF_W = {}, 0.5


def _rank_docs(docs: List[SourceDoc]) -> List[SourceDoc]:
    """按源质量分从高到低排序。相同质量按文本长度 (信息量) 次排。"""
    def score(d: SourceDoc) -> tuple[float, int]:
        domain = (d.source_domain or "").lower()
        q = _SRC_W.get(domain, _DEF_W)
        return (-q, -len(d.text or ""))
    return sorted(docs, key=score)


def _build_user_prompt(program_name: str, docs: List[SourceDoc]) -> str:
    """限制 docs 数量 + 每条字数, 防止 DeepSeek 超时."""
    ranked = _rank_docs(docs)[:MAX_DOCS_PER_CALL]
    lines = [f"项目：{program_name}", "", f"以下是按源质量排序的 top {len(ranked)} 段原文："]
    for i, d in enumerate(ranked, 1):
        text = (d.text or "")[:MAX_CHARS_PER_DOC]
        lines.append(f"\n━━━ 来源 {i} ━━━")
        lines.append(f"URL: {d.url}")
        lines.append(f"域名: {d.source_domain}")
        lines.append(f"标题: {d.title}")
        lines.append(f"正文:\n{text}")
    lines.append("\n请基于以上原文输出结构化 JSON。")
    return "\n".join(lines)


def extract_claims(
    program_name: str,
    docs: List[SourceDoc],
    api_key: Optional[str] = None,
    model: str = DEEPSEEK_MODEL,
) -> dict:
    """
    调 DeepSeek 抽取 aspect-level claims + source_mix。
    输出:
      {
        "claims": [{aspect, sentiment, evidence_quote, source_url, source_type}, ...],
        "source_mix": {"1point3acres": 3, "zhihu": 2, ...},
        "_meta": {source_count, model, program, attempts}
      }
    docs 为空或全空 → 返回 {"claims": [], "source_mix": {}, "_meta": {"error": ...}}
    """
    usable = [d for d in docs if (d.text or "").strip()]
    if not usable:
        return _empty_claims("无可用原文")

    if OpenAI is None:
        return _empty_claims("openai SDK 未安装")

    key = api_key or os.getenv("DEEPSEEK_API_KEY")
    if not key:
        return _empty_claims("缺少 DEEPSEEK_API_KEY")

    client = OpenAI(
        api_key=key,
        base_url=DEEPSEEK_BASE_URL,
        timeout=180.0,
        max_retries=2,
    )

    last_err: Optional[Exception] = None
    raw_data: Optional[dict] = None
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": CLAIMS_SYSTEM_PROMPT},
                    {"role": "user", "content": _build_user_prompt(program_name, usable)},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=8192,  # 默认 4096, 长 source 项目会被截断成无效 JSON (JHU MSDS 2026-04-15 翻车)
            )
            raw = resp.choices[0].message.content or "{}"
            raw_data = json.loads(raw)
            break
        except Exception as e:
            last_err = e
            logger.warning(f"DeepSeek claims 失败 try{attempt+1}/3 program={program_name}: {e}")

    if raw_data is None:
        logger.error(f"DeepSeek claims 彻底失败 program={program_name}: {last_err}")
        return _empty_claims(f"API 错误: {last_err}")

    # 后处理: 按 source_index 回填 source_url (给 aggregator top_evidence 溯源用) + 构建 source_mix
    claims_in = raw_data.get("claims") or []
    claims_out: list[dict] = []
    source_mix: dict[str, int] = {}
    for c in claims_in:
        idx = c.get("source_index")
        url = ""
        domain = ""
        if isinstance(idx, int) and 1 <= idx <= len(usable):
            doc = usable[idx - 1]
            url = doc.url
            domain = doc.source_domain or ""
        claims_out.append({
            "aspect": c.get("aspect"),
            "sentiment": c.get("sentiment"),
            "evidence_quote": (c.get("evidence_quote") or "").strip(),
            "source_url": url,
            "source_domain": domain,
            "source_type": c.get("source_type", "community"),
        })
        if domain:
            source_mix[domain] = source_mix.get(domain, 0) + 1

    return {
        "claims": claims_out,
        "source_mix": source_mix,
        "_meta": {
            "source_count": len(usable),
            "model": model,
            "program": program_name,
            "claim_count": len(claims_out),
        },
    }


def _empty_claims(reason: str) -> dict:
    return {
        "claims": [],
        "source_mix": {},
        "_meta": {"error": reason},
    }


# 保留废弃函数名作为 thin wrapper, 防止外部直接 import 崩掉; 实际不应再用
def extract_tags(*args, **kwargs) -> dict:
    """DEPRECATED: 请用 extract_claims + aggregator.aggregate_verdict"""
    raise NotImplementedError(
        "extract_tags 已废弃. 新架构: extract_claims → aggregator.aggregate_verdict."
    )


# ─────────────────────────────────────────────────────────
# facts 抽取: DB 扩容时自动预填 programs 表的客观字段
# ─────────────────────────────────────────────────────────

FACTS_SYSTEM_PROMPT = """你是留学项目事实核对助手。任务：从我提供的多段原文里，抽取某个留学项目的**客观事实字段**,
供数据库预填使用。

严格规则：
1. **只基于我给你的原文**。原文没明确提到的字段必须填 null（数值/布尔）或 "unknown"（字符串）。不允许靠先验知识补全。
2. 每个非 null 字段都必须在 `_field_evidence` 里附原文短引用，证明这个数字/类别从哪来。
3. `_field_confidence` 标每个字段的可信度: high / medium / low。
   - high: 原文明确数字或官方原话
   - medium: 原文数字但单一来源 或 多来源一致但略模糊
   - low: 拼凑推断的，不一致的，只在中介宣传稿里提到的
4. 币种统一换算成 USD (用常识汇率，人民币 ÷ 7、英镑 × 1.25、港币 ÷ 7.8、欧元 × 1.1)。
5. **不要脑补**。不确定宁可填 null。

输出严格 JSON，schema：
{
  "country": "美国|英国|加拿大|澳大利亚|新加坡|香港|德国|荷兰|法国|瑞士|日本|unknown",
  "region": "美东|美中|美西|美南|英格兰|苏格兰|欧陆|港澳|unknown",
  "city": "城市名 或 unknown",
  "degree_subtype": "MS|MA|MBA|MPP|MPA|MEng|LLM|MPhil|PhD|unknown",
  "is_stem": true | false | null,
  "duration_months": 整数 或 null,
  "teaching_language": "English|Chinese|Other|unknown",
  "total_cost_usd": 整数(学费+生活费粗估) 或 null,
  "tuition_only_usd": 整数(仅学费) 或 null,
  "min_toefl": 整数 或 null,
  "min_ielts": 数字 或 null,
  "gre_required": true | false | null,
  "avg_gpa": 小数 或 null,
  "post_grad_work_visa": "OPT 36月|OPT 12月|PSW 2年|Search Year 18月|蓝卡|unknown",
  "work_visa_duration_months": 整数 或 null,
  "has_coop": true | false | null,
  "internship_required": true | false | null,
  "capstone_required": true | false | null,
  "chinese_student_ratio_numeric": 0.0-1.0 小数 或 null,
  "cohort_size": 整数(该届总人数) 或 null,
  "employment_rate_3month": 0.0-1.0 小数 或 null,
  "avg_starting_salary_usd": 整数 或 null,
  "_field_confidence": {
    "country": "high|medium|low",
    "city": "...",
    "degree_subtype": "...",
    "duration_months": "...",
    "total_cost_usd": "...",
    "min_toefl": "...",
    "gre_required": "...",
    "avg_gpa": "...",
    "post_grad_work_visa": "..."
  },
  "_field_evidence": {
    "country": "原文短引用 或 空串",
    "city": "...",
    "duration_months": "...",
    "total_cost_usd": "...",
    "min_toefl": "...",
    "gre_required": "...",
    "avg_gpa": "...",
    "post_grad_work_visa": "...",
    "cohort_size": "...",
    "employment_rate_3month": "...",
    "avg_starting_salary_usd": "..."
  }
}

只输出 JSON，不要任何其他文字。"""


def extract_facts(
    program_name: str,
    docs: List[SourceDoc],
    api_key: Optional[str] = None,
    model: str = DEEPSEEK_MODEL,
) -> dict:
    """客观事实抽取。单独一次调用，和 extract_tags 并列。"""
    usable = [d for d in docs if (d.text or "").strip()]
    if not usable:
        return _empty_facts("无可用原文")

    if OpenAI is None:
        return _empty_facts("openai SDK 未安装")

    key = api_key or os.getenv("DEEPSEEK_API_KEY")
    if not key:
        return _empty_facts("缺少 DEEPSEEK_API_KEY")

    client = OpenAI(
        api_key=key,
        base_url=DEEPSEEK_BASE_URL,
        timeout=180.0,
        max_retries=2,
    )

    last_err: Optional[Exception] = None
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": FACTS_SYSTEM_PROMPT},
                    {"role": "user", "content": _build_user_prompt(program_name, usable)},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,   # 事实抽取比 tags 更低温
                max_tokens=8192,
            )
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(raw)
            data["_meta"] = {
                "source_count": len(usable),
                "model": model,
                "program": program_name,
                "attempts": attempt + 1,
            }
            return data
        except Exception as e:
            last_err = e
            logger.warning(f"DeepSeek facts 失败 try{attempt+1}/3 program={program_name}: {e}")

    logger.error(f"DeepSeek facts 彻底失败 program={program_name}: {last_err}")
    return _empty_facts(f"API 错误: {last_err}")


def _empty_facts(reason: str) -> dict:
    return {
        "country": "unknown",
        "region": "unknown",
        "city": "unknown",
        "degree_subtype": "unknown",
        "is_stem": None,
        "duration_months": None,
        "teaching_language": "unknown",
        "total_cost_usd": None,
        "tuition_only_usd": None,
        "min_toefl": None,
        "min_ielts": None,
        "gre_required": None,
        "avg_gpa": None,
        "post_grad_work_visa": "unknown",
        "work_visa_duration_months": None,
        "has_coop": None,
        "internship_required": None,
        "capstone_required": None,
        "chinese_student_ratio_numeric": None,
        "cohort_size": None,
        "employment_rate_3month": None,
        "avg_starting_salary_usd": None,
        "_field_confidence": {},
        "_field_evidence": {},
        "_meta": {"error": reason},
    }
