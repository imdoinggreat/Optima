"""
相关性过滤：在喂给 DeepSeek 之前干掉跨域噪音。

为什么必须在本地做而不是让 LLM 过滤：
  - POC 第一次跑 NEU Align：50 条结果里 44 条是垃圾（ARM 汇编 .align
    指令、2+5 计算器、NYT 纵横字谜、鼻塞医疗文章）
  - 这些垃圾占了 ~75% 的 token，DeepSeek 虽然能识别并忽略，但：
      1. 成本高 4x
      2. 噪音太多时信号会被稀释（confidence 下降）
      3. 全量几百个 program 跑起来不经济

策略：
  必须同时满足两个条件才喂 DeepSeek
  1. 文本里有"学校/项目"锚点（school/program 别名 OR 模糊匹配）
  2. 文本里有"留学语境"锚点（硕士/留学/申请/offer/就业/回国/...）
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List, Sequence

# 通用留学语境锚词。必须命中至少一个。
CONTEXT_ANCHORS = [
    "留学", "硕士", "研究生", "offer", "申请", "就业", "回国",
    "项目", "录取", "毕业", "转码", "劝退", "工签", "PR",
    "CS", "金融", "转专业", "海投", "校友", "学费",
]

# 已知垃圾域名（命中直接丢弃，不看内容）
BLACKLIST_DOMAINS = {
    "nytcrosswordanswers.org",
    "fractioncalculator.pro",
    "calc-online.xyz",
    "calculeitor.com",
    "biologyinsights.com",
    "neurolaunch.com",
    "health.clevelandclinic.org",
    "entsheffield.co.uk",
    "maestrolabs.com",
    "trello.com",
    "kimi.com",
    "google.com",
    "www.google.com",
    "vk.com",
    "tiktok.com",
    "youtube.com",
    "www.youtube.com",
    "bbc.com",
    "www.bbc.com",
    # 注意：不把 blog.csdn.net 列入——CSDN 上也有真留学分享，
    # 让 relevance 锚词匹配去处理技术文噪音
}

# 已知高质量域名（命中给 boost，过滤更宽松）
WHITELIST_DOMAINS = {
    "1point3acres.com", "www.1point3acres.com", "blog.1point3acres.com",
    "gter.net", "bbs.gter.net",
    "chasedream.com", "forum.chasedream.com",
    "douban.com", "www.douban.com",
    "zhihu.com", "www.zhihu.com",
    "xiaohongshu.com",
    "mp.weixin.qq.com",
    "shuiyuan.sjtu.edu.cn",
    "thegradcafe.com", "forum.thegradcafe.com",
}


@dataclass
class ProgramAliases:
    """一个 program 的所有命中关键词变体"""
    school: List[str]      # e.g. ["NEU", "Northeastern", "东北大学"]
    program: List[str]     # e.g. ["Align", "CS Align", "MSCS Align"]
    min_school_hits: int = 1   # 文本至少命中这么多 school 别名
    min_program_hits: int = 1  # 文本至少命中这么多 program 别名

    def all_terms(self) -> List[str]:
        return list(self.school) + list(self.program)


def _count_hits(text: str, terms: Sequence[str]) -> int:
    """大小写不敏感，计算 text 中命中了几个不同的 term"""
    if not text:
        return 0
    low = text.lower()
    hits = 0
    for t in terms:
        if t and t.lower() in low:
            hits += 1
    return hits


def is_relevant(
    text: str,
    domain: str,
    aliases: ProgramAliases,
    context_anchors: Sequence[str] = CONTEXT_ANCHORS,
) -> tuple[bool, str]:
    """
    宽松策略（v2）：
      - 黑名单域名硬拒（纵横字谜、计算器、医疗网站等跨域噪音）
      - 其余只要 (任一 school 或 program 别名命中) AND (任一 context 锚词命中)
      - 依赖 DeepSeek 做最终的信号识别——第一轮证明它能做好
      - 目标不是零噪音，是去掉"明显跨域"垃圾，别把真信号也砍了
    """
    dom = (domain or "").lower().lstrip("www.")

    # 黑名单直接拒
    for bad in BLACKLIST_DOMAINS:
        if bad in dom:
            return False, f"blacklist:{bad}"

    if not text or len(text) < 200:
        return False, "text_too_short"

    school_hits = _count_hits(text, aliases.school)
    program_hits = _count_hits(text, aliases.program)
    context_hits = _count_hits(text, context_anchors)

    # 放宽阈值：学校或项目之一 + 任一语境锚词
    has_entity = (school_hits >= 1) or (program_hits >= 1)
    has_context = context_hits >= 1

    if has_entity and has_context:
        return True, f"OK(s={school_hits},p={program_hits},c={context_hits})"
    return False, f"REJECT(s={school_hits},p={program_hits},c={context_hits})"


def build_enhanced_queries(
    base_keywords: List[str],
    aliases: ProgramAliases,
) -> List[str]:
    """
    Query 增强策略：
      base_keywords 已自带学校/项目名称 (如 "NEU Align 就业")
      默认追加 v2 锚词 "硕士 留学", search/项目 = 2 × len(seeds).

      历史: 原来还有 v3 "研究生 申请", 样本 9 个项目实测 v3 只额外贡献
      ~20% 相关源但要多花 33% 预算, 已砍掉 (2026-04-14).

      WEB_SEARCH_STRICT_BUDGET=1 进一步砍 v2, 只留 v1, 相关覆盖降到 46%.
      只在预算极紧时用.
    """
    strict = os.getenv("WEB_SEARCH_STRICT_BUDGET", "").strip() in ("1", "true", "yes")
    out: List[str] = []
    for kw in base_keywords:
        out.append(kw)                        # v1: 原始
        if not strict:
            out.append(f"{kw} 硕士 留学")     # v2: 留学锚词
    # 去重保序
    seen = set()
    dedup = []
    for q in out:
        q = re.sub(r"\s+", " ", q).strip()
        if q and q not in seen:
            seen.add(q)
            dedup.append(q)
    return dedup
