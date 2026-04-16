// ============================================================================
// V3 Assessment Question Bank
// ~45 base questions across 6 modules + 2 academic-track alternatives.
// ============================================================================

export type QuestionType = "single" | "multi" | "slider" | "tradeoff" | "two_level"

export interface QuestionOption {
  value: string
  label: string
}

export interface SliderConfig {
  min: number
  max: number
  step: number
}

export interface TwoLevelOption {
  category: string
  categoryLabel: string
  options: QuestionOption[]
}

export interface Question {
  id: string
  module: string
  moduleLabel: string
  type: QuestionType
  question: string
  options?: QuestionOption[]
  twoLevelOptions?: TwoLevelOption[]
  sliderConfig?: SliderConfig
  /** For E-module only: which destination values from A3 trigger this question */
  destinationTrigger?: string[]
}

// ---------------------------------------------------------------------------
// Module A: 终极目标 (Goal) — 3 questions
// ---------------------------------------------------------------------------

const MODULE_A: Question[] = [
  {
    id: "A1",
    module: "A",
    moduleLabel: "终极目标",
    type: "single",
    question: "毕业后你最理想的状态是？",
    options: [
      { value: "a", label: "留在留学目的地工作生活" },
      { value: "b", label: "积累1-2年海外经验后回国" },
      { value: "c", label: "尽快回国提升学历" },
      { value: "d", label: "继续读博/学术" },
      { value: "e", label: "还没想好" },
    ],
  },
  {
    id: "A2",
    module: "A",
    moduleLabel: "终极目标",
    type: "single",
    question: "如果Plan A失败，你的底线是？",
    options: [
      { value: "a", label: "学校牌子回国也能用" },
      { value: "b", label: "能转去其他国家" },
      { value: "c", label: "能申到博" },
      { value: "d", label: "没想过Plan B" },
      { value: "e", label: "只要不亏太多钱" },
    ],
  },
  {
    id: "A3",
    module: "A",
    moduleLabel: "终极目标",
    type: "multi",
    question: "你考虑的目的地？",
    options: [
      { value: "US", label: "美国" },
      { value: "UK", label: "英国" },
      { value: "HK", label: "香港" },
      { value: "SG", label: "新加坡" },
      { value: "EU", label: "欧洲大陆" },
      { value: "CA_AU", label: "加拿大/澳洲" },
      { value: "JP", label: "日本" },
      { value: "ALL", label: "都可以" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Module B: 背景快照 (Background) — 11 questions
// ---------------------------------------------------------------------------

const MODULE_B: Question[] = [
  {
    id: "B0_field",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "你的本科专业大类？",
    options: [
      { value: "cs_ee", label: "计算机/电子/电气/信息工程" },
      { value: "mech_civil", label: "机械/土木/航空等工科" },
      { value: "math_stat", label: "数学/统计" },
      { value: "finance_econ", label: "金融/经济" },
      { value: "business", label: "管理/商科/会计" },
      { value: "media_comm", label: "传媒/广告/新闻" },
      { value: "education", label: "教育学" },
      { value: "social_sci", label: "社会学/心理学/政治学" },
      { value: "law", label: "法学" },
      { value: "language_lit", label: "语言/文学/翻译" },
      { value: "science", label: "物理/化学/生物等理科" },
      { value: "art_design", label: "艺术/设计" },
      { value: "health", label: "医学/公共卫生" },
      { value: "other", label: "其他" },
    ],
  },
  {
    id: "B0_target",
    module: "B",
    moduleLabel: "背景快照",
    type: "two_level",
    question: "你想申请的硕士方向？（先选大类，再选细分）",
    twoLevelOptions: [
      {
        category: "eng_tech",
        categoryLabel: "工程与技术",
        options: [
          { value: "cs", label: "计算机/软件工程" },
          { value: "ds_ba", label: "数据科学/商业分析" },
          { value: "ee", label: "电子/电气工程" },
          { value: "mech", label: "机械/航空/材料工程" },
          { value: "civil_env", label: "土木/环境工程" },
          { value: "energy_sustain", label: "能源/可持续发展" },
          { value: "biomed_eng", label: "生物医学工程" },
        ],
      },
      {
        category: "biz_fin",
        categoryLabel: "商业与金融",
        options: [
          { value: "finance", label: "金融/金融工程" },
          { value: "econ", label: "经济学" },
          { value: "mba_mgmt", label: "MBA/管理学" },
          { value: "marketing", label: "市场营销" },
          { value: "accounting", label: "会计" },
          { value: "supply_chain", label: "供应链/运营管理" },
        ],
      },
      {
        category: "social_policy",
        categoryLabel: "社会科学与公共事务",
        options: [
          { value: "policy", label: "公共政策/公共管理" },
          { value: "ir", label: "国际关系/国际事务" },
          { value: "dev_studies", label: "发展学/全球发展" },
          { value: "sociology", label: "社会学" },
          { value: "psychology", label: "心理学/认知科学" },
          { value: "social_work", label: "社会工作" },
        ],
      },
      {
        category: "humanities",
        categoryLabel: "人文学科与批判理论",
        options: [
          { value: "cultural_studies", label: "文化研究/批判理论" },
          { value: "gender_queer", label: "性别研究/酷儿理论" },
          { value: "philosophy", label: "哲学" },
          { value: "comp_lit", label: "比较文学" },
          { value: "history", label: "历史学" },
          { value: "area_studies", label: "区域研究(东亚/中东/非洲等)" },
          { value: "linguistics", label: "语言学/翻译" },
          { value: "digital_humanities", label: "数字人文" },
        ],
      },
      {
        category: "arts_creative",
        categoryLabel: "艺术、设计与创作",
        options: [
          { value: "fine_art", label: "纯艺术(MFA)" },
          { value: "design", label: "设计(交互/平面/工业/服务)" },
          { value: "film_media", label: "电影/影视制作" },
          { value: "music_perf", label: "音乐/表演艺术" },
          { value: "creative_writing", label: "创意写作" },
          { value: "architecture", label: "建筑" },
          { value: "media_comm", label: "传媒/新闻/数字媒体" },
        ],
      },
      {
        category: "science_math",
        categoryLabel: "自然科学与数学",
        options: [
          { value: "math_stat", label: "数学/统计" },
          { value: "physics", label: "物理学" },
          { value: "chemistry", label: "化学" },
          { value: "biology", label: "生物学" },
          { value: "env_science", label: "环境科学" },
        ],
      },
      {
        category: "health_life",
        categoryLabel: "健康与生命科学",
        options: [
          { value: "public_health", label: "公共卫生/流行病学" },
          { value: "health_mgmt", label: "健康管理/医疗管理" },
          { value: "biotech", label: "生物技术/生物信息" },
          { value: "nursing", label: "护理/全球健康" },
        ],
      },
      {
        category: "edu_law",
        categoryLabel: "教育与法律",
        options: [
          { value: "education", label: "教育学/TESOL" },
          { value: "ed_tech", label: "教育科技/学习设计" },
          { value: "law", label: "法学(LLM)" },
          { value: "human_rights", label: "人权法/社会公正" },
        ],
      },
      {
        category: "unsure",
        categoryLabel: "跨学科/不确定",
        options: [
          { value: "interdisciplinary", label: "跨学科项目" },
          { value: "undecided", label: "还没想清楚" },
        ],
      },
    ],
  },
  {
    id: "B1",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "本科院校",
    options: [
      { value: "a", label: "清北/C9" },
      { value: "b", label: "985" },
      { value: "c", label: "211/双一流" },
      { value: "d", label: "双非/普本" },
      { value: "e", label: "海本QS前100" },
      { value: "f", label: "海本QS100-300" },
      { value: "g", label: "海本300+" },
    ],
  },
  {
    id: "B2_scale",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "你的GPA是什么分制？",
    options: [
      { value: "4.0", label: "4.0 制" },
      { value: "5.0", label: "5.0 制" },
      { value: "100", label: "百分制" },
    ],
  },
  {
    id: "B2",
    module: "B",
    moduleLabel: "背景快照",
    type: "slider",
    question: "你的GPA大约是多少？",
    sliderConfig: { min: 2.0, max: 4.0, step: 0.1 },
  },
  {
    id: "B3",
    module: "B",
    moduleLabel: "背景快照",
    type: "multi",
    question: "经历",
    options: [
      { value: "intern_1", label: "1段实习" },
      { value: "intern_2plus", label: "2段及以上实习" },
      { value: "fulltime", label: "全职工作经验" },
      { value: "research", label: "科研经历" },
      { value: "publication", label: "论文发表" },
      { value: "student_org", label: "学生组织/社团骨干" },
      { value: "competition", label: "竞赛获奖" },
      { value: "volunteer", label: "志愿者/公益" },
      { value: "startup", label: "创业经历" },
      { value: "patent", label: "专利" },
      { value: "portfolio", label: "作品集" },
      { value: "self_project", label: "个人项目/开源贡献" },
      { value: "ngo_social", label: "NGO/社会组织经历" },
      { value: "gap_experience", label: "Gap Year相关经历" },
      { value: "freelance", label: "自由职业/独立工作" },
      { value: "none", label: "暂无" },
    ],
  },
  {
    id: "B4",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "语言",
    options: [
      { value: "a", label: "托福105+/雅思7.5+" },
      { value: "b", label: "95-104/7.0" },
      { value: "c", label: "85-94/6.5" },
      { value: "d", label: "还没考托福雅思" },
      { value: "e", label: "有小语种B2+" },
      { value: "f", label: "海本/英语环境，无需语言成绩" },
      { value: "g", label: "CET-6 550+/有英语基础，计划考" },
    ],
  },
  {
    id: "B5",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "总预算",
    options: [
      { value: "a", label: "100万+" },
      { value: "b", label: "60-100万" },
      { value: "c", label: "30-60万" },
      { value: "d", label: "30万以下" },
      { value: "e", label: "需要奖学金" },
    ],
  },
  {
    id: "B2b",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "你的GPA在年级中大约排多少？",
    options: [
      { value: "top5", label: "前5%" },
      { value: "top15", label: "前5%-15%" },
      { value: "top30", label: "前15%-30%" },
      { value: "top50", label: "前30%-50%" },
      { value: "below50", label: "50%以后" },
      { value: "unknown", label: "不清楚" },
    ],
  },
  {
    id: "B3b",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "你的全职工作经验有多久？",
    options: [
      { value: "none", label: "无全职工作经验" },
      { value: "lt1", label: "1年以下（含实习）" },
      { value: "1_3", label: "1-3年" },
      { value: "3_5", label: "3-5年" },
      { value: "5plus", label: "5年以上" },
    ],
  },
  {
    id: "B4b",
    module: "B",
    moduleLabel: "背景快照",
    type: "single",
    question: "GRE/GMAT 情况",
    options: [
      { value: "gre_325plus", label: "GRE 325+" },
      { value: "gre_315", label: "GRE 315-324" },
      { value: "gre_305", label: "GRE 305-314" },
      { value: "gmat_700plus", label: "GMAT 700+" },
      { value: "gmat_650", label: "GMAT 650-699" },
      { value: "no_gre", label: "还没考/不需要" },
    ],
  },
  {
    id: "B6",
    module: "B",
    moduleLabel: "背景快照",
    type: "multi",
    question: "以下哪些描述适用于你？（可多选）",
    options: [
      { value: "working", label: "目前在职" },
      { value: "married", label: "已婚/有伴侣需同行" },
      { value: "has_children", label: "有子女/照护责任" },
      { value: "age_30plus", label: "30岁以上" },
      { value: "gap_year", label: "有Gap Year经历" },
      { value: "career_switch", label: "计划跨专业/转行申请" },
      { value: "parent_driven", label: "家人主导留学决策" },
      { value: "none", label: "以上都不适用" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Module C: 性格-环境匹配 (Personality-Environment Fit) — 9 questions
// ---------------------------------------------------------------------------

const MODULE_C: Question[] = [
  {
    id: "C1",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "城市环境偏好",
    options: [
      { value: "a", label: "国际大都市" },
      { value: "b", label: "中等城市" },
      { value: "c", label: "大学城/小镇" },
      { value: "d", label: "无所谓" },
    ],
  },
  {
    id: "C2",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "班级中国人比例偏好",
    options: [
      { value: "a", label: "越少越好" },
      { value: "b", label: "有一些就好" },
      { value: "c", label: "多也没关系" },
      { value: "d", label: "不在意" },
    ],
  },
  {
    id: "C3",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "生活舒适度底线",
    options: [
      { value: "a", label: "需要中餐/华人超市" },
      { value: "b", label: "基本便利就行" },
      { value: "c", label: "可以忍受" },
      { value: "d", label: "最重要" },
    ],
  },
  {
    id: "C4",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "你对留学目的地的治安和人身安全有多在意？",
    options: [
      { value: "a", label: "非常在意" },
      { value: "b", label: "比较在意" },
      { value: "c", label: "不太在意" },
      { value: "d", label: "完全不在意" },
    ],
  },
  {
    id: "C5",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "独立生活能力",
    options: [
      { value: "a", label: "享受独立" },
      { value: "b", label: "可以但希望有圈子" },
      { value: "c", label: "有点担心" },
      { value: "d", label: "很担心" },
    ],
  },
  {
    id: "C6",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "文化冲击态度",
    options: [
      { value: "a", label: "期待" },
      { value: "b", label: "可接受" },
      { value: "c", label: "有点怕" },
      { value: "d", label: "很怕" },
    ],
  },
  {
    id: "C7",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "社交能量",
    options: [
      { value: "a", label: "充沛爱networking" },
      { value: "b", label: "可以但会累" },
      { value: "c", label: "内向小圈子" },
      { value: "d", label: "社恐" },
    ],
  },
  {
    id: "C8",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "single",
    question: "抗压能力",
    options: [
      { value: "a", label: "压力就是动力" },
      { value: "b", label: "能扛但焦虑" },
      { value: "c", label: "能避就避" },
      { value: "d", label: "会崩溃" },
    ],
  },
  {
    id: "C_identity",
    module: "C",
    moduleLabel: "性格-环境匹配",
    type: "multi",
    question: "以下哪些因素会影响你选择留学目的地？（可多选）",
    options: [
      { value: "lgbtq", label: "LGBTQ+友好的社会环境" },
      { value: "racial_diversity", label: "种族/文化多元性" },
      { value: "religious", label: "宗教设施和社区" },
      { value: "disability", label: "残障支持和无障碍设施" },
      { value: "mental_health", label: "心理健康/咨询资源" },
      { value: "asian_community", label: "华人/亚裔社群规模" },
      { value: "none", label: "以上都不是特别考虑的" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Module D: 价值取舍 (Value Tradeoffs) — 11 questions
// ---------------------------------------------------------------------------

const MODULE_D: Question[] = [
  {
    id: "D_drive",
    module: "D",
    moduleLabel: "价值取舍",
    type: "single",
    question: "你读硕士最核心的驱动力是什么？",
    options: [
      { value: "career", label: "职业发展/转型" },
      { value: "academic", label: "学术研究/知识追求" },
      { value: "growth", label: "个人成长/人生体验" },
      { value: "creative", label: "创作/作品产出" },
      { value: "impact", label: "社会影响力/改变世界" },
      { value: "unsure", label: "还没想清楚" },
    ],
  },
  {
    id: "D_priority",
    module: "D",
    moduleLabel: "价值取舍",
    type: "single",
    question: "选项目时，以下哪个对你最重要？",
    options: [
      { value: "alumni_network", label: "校友在行业中的影响力" },
      { value: "faculty", label: "教授的研究方向和质量" },
      { value: "community", label: "同学群体的多元性和氛围" },
      { value: "resources", label: "创作/实践资源（工作室、实验室）" },
      { value: "social_focus", label: "项目对社会议题的关注度" },
      { value: "employment", label: "就业数据和career service" },
    ],
  },
  {
    id: "D1",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "排名 vs 地理位置",
    options: [
      { value: "A", label: "排名高但偏远" },
      { value: "B", label: "排名低但核心城市" },
    ],
  },
  {
    id: "D2",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "排名 vs 省钱",
    options: [
      { value: "A", label: "Top30无奖80万+" },
      { value: "B", label: "Top80半奖40万" },
    ],
  },
  {
    id: "D3",
    module: "D",
    moduleLabel: "价值取舍",
    type: "single",
    question: "留下来 vs 回国名气",
    options: [
      { value: "A", label: "留下来最重要，学校名气其次" },
      { value: "B", label: "两者都想要，最好兼顾" },
      { value: "C", label: "名气最重要，留不留无所谓" },
      { value: "D", label: "都不是最重要的，我更看重体验和成长" },
    ],
  },
  {
    id: "D4",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "学术 vs 就业",
    options: [
      { value: "A", label: "课程硬核有科研" },
      { value: "B", label: "实践有Co-op" },
    ],
  },
  {
    id: "D5",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "1年 vs 2年",
    options: [
      { value: "A", label: "1年省时省钱" },
      { value: "B", label: "2年多体验" },
    ],
  },
  {
    id: "D6",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "你更愿意怎么申请？",
    options: [
      { value: "A", label: "集中火力申一个特别难但特别好的项目（可能全拒也可能大奖）" },
      { value: "B", label: "分散申一堆稳妥的项目（每个都还行但没有惊喜）" },
    ],
  },
  {
    id: "D7",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "如果申请结果不理想，你能接受什么？",
    options: [
      { value: "A", label: "哪怕gap也要冲最好" },
      { value: "B", label: "宁可不那么好也要有学上" },
    ],
  },
  {
    id: "D8",
    module: "D",
    moduleLabel: "价值取舍",
    type: "single",
    question: "确定性 vs 上限",
    options: [
      { value: "a", label: "确定的最好结果" },
      { value: "b", label: "冒险博更高" },
      { value: "c", label: "看情况冲1-2个" },
    ],
  },
  {
    id: "D9",
    module: "D",
    moduleLabel: "价值取舍",
    type: "single",
    question: "假设毕业后意外拿到一个当地不错的工作offer，你会？",
    options: [
      { value: "a", label: "肯定留下，这不就是我想要的吗" },
      { value: "b", label: "认真考虑，看具体情况" },
      { value: "c", label: "大概率还是回国，出来就是读个书" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Module E: 目的地专项 (Destination-specific) — dynamic, max 6 shown
// ---------------------------------------------------------------------------

const MODULE_E: Question[] = [
  // ALL — high-level filter
  {
    id: "E_ALL",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "选目的地时，以下哪个因素对你最重要？",
    destinationTrigger: ["ALL"],
    options: [
      { value: "immigration", label: "能移民/拿永居" },
      { value: "cost", label: "省钱/性价比高" },
      { value: "safety", label: "安全、文化熟悉" },
      { value: "prestige", label: "学术声誉/学校排名" },
      { value: "unsure", label: "说不清楚" },
    ],
  },
  // US
  {
    id: "E_US1",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "H1B不确定性",
    destinationTrigger: ["US"],
    options: [
      { value: "a", label: "能接受" },
      { value: "b", label: "需要STEM缓冲" },
      { value: "c", label: "最怕这个" },
    ],
  },
  {
    id: "E_US2",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "更看重美国的",
    destinationTrigger: ["US"],
    options: [
      { value: "a", label: "高薪+技术" },
      { value: "b", label: "学术+读博" },
      { value: "c", label: "多元文化" },
    ],
  },
  // UK
  {
    id: "E_UK1",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "1年制太短？",
    destinationTrigger: ["UK"],
    options: [
      { value: "a", label: "不介意" },
      { value: "b", label: "有点担心但G5还好" },
      { value: "c", label: "很介意" },
    ],
  },
  {
    id: "E_UK2",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "PSW打算",
    destinationTrigger: ["UK"],
    options: [
      { value: "a", label: "认真找工留英" },
      { value: "b", label: "实习1年再回国" },
      { value: "c", label: "不指望" },
    ],
  },
  // HK / SG
  {
    id: "E_HK1",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "选港新原因",
    destinationTrigger: ["HK", "SG"],
    options: [
      { value: "a", label: "离家近" },
      { value: "b", label: "性价比" },
      { value: "c", label: "亚洲金融中心" },
      { value: "d", label: "英美平替" },
    ],
  },
  {
    id: "E_HK2",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "长期留港新？",
    destinationTrigger: ["HK", "SG"],
    options: [
      { value: "a", label: "目标永居" },
      { value: "b", label: "待几年看看" },
      { value: "c", label: "大概率回国" },
    ],
  },
  // EU
  {
    id: "E_EU1",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "选欧陆原因",
    destinationTrigger: ["EU"],
    options: [
      { value: "a", label: "免学费" },
      { value: "b", label: "移民友好" },
      { value: "c", label: "WLB" },
      { value: "d", label: "特定专业强" },
    ],
  },
  {
    id: "E_EU2",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "接受学当地语言？",
    destinationTrigger: ["EU"],
    options: [
      { value: "a", label: "愿意" },
      { value: "b", label: "纯英语" },
      { value: "c", label: "基础生活用语可以" },
    ],
  },
  // CA / AU
  {
    id: "E_CA1",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "选加澳原因",
    destinationTrigger: ["CA_AU"],
    options: [
      { value: "a", label: "移民PR" },
      { value: "b", label: "安全稳定" },
      { value: "c", label: "英美备选" },
      { value: "d", label: "特定学校" },
    ],
  },
  // JP
  {
    id: "E_JP1",
    module: "E",
    moduleLabel: "目的地专项",
    type: "single",
    question: "日语水平",
    destinationTrigger: ["JP"],
    options: [
      { value: "a", label: "N1/N2" },
      { value: "b", label: "N3-N4" },
      { value: "c", label: "不会打算学" },
      { value: "d", label: "选英语项目" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Module F: 选校配置 (List Config) — 4 questions
// ---------------------------------------------------------------------------

const MODULE_F: Question[] = [
  {
    id: "F1",
    module: "F",
    moduleLabel: "选校配置",
    type: "single",
    question: "选校list风格",
    options: [
      { value: "a", label: "激进型" },
      { value: "b", label: "均衡型" },
      { value: "c", label: "稳妥型" },
      { value: "d", label: "系统自动" },
    ],
  },
  {
    id: "F2",
    module: "F",
    moduleLabel: "选校配置",
    type: "single",
    question: "目的地多样性",
    options: [
      { value: "a", label: "同一国家" },
      { value: "b", label: "2-3个国家" },
      { value: "c", label: "越多元越好" },
    ],
  },
  {
    id: "F3",
    module: "F",
    moduleLabel: "选校配置",
    type: "slider",
    question: "排名重要性",
    sliderConfig: { min: 1, max: 10, step: 1 },
  },
  {
    id: "F4",
    module: "F",
    moduleLabel: "选校配置",
    type: "single",
    question: "最不能接受的？",
    options: [
      { value: "a", label: "学校没人听过" },
      { value: "b", label: "毕业后找不到工作" },
      { value: "c", label: "花钱但体验差" },
      { value: "d", label: "不安全" },
      { value: "e", label: "学不到东西" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Aggregated exports
// ---------------------------------------------------------------------------

const MODULE_MAP: Record<string, Question[]> = {
  A: MODULE_A,
  B: MODULE_B,
  C: MODULE_C,
  D: MODULE_D,
  E: MODULE_E,
  F: MODULE_F,
}

/** All ~45 base questions (E-module contains all 11 destination-specific variants). */
export const ALL_QUESTIONS: Question[] = [
  ...MODULE_A,
  ...MODULE_B,
  ...MODULE_C,
  ...MODULE_D,
  ...MODULE_E,
  ...MODULE_F,
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Flattens two-level options into a flat array of values for B0_target */
export function flattenTwoLevelValues(twoLevelOptions: TwoLevelOption[]): string[] {
  return twoLevelOptions.flatMap(cat => cat.options.map(o => o.value))
}

/**
 * Returns all questions belonging to a given module.
 * For module E, returns ALL destination questions (use getDestinationQuestions
 * to filter by selected destinations).
 */
export function getModuleQuestions(moduleId: string): Question[] {
  return MODULE_MAP[moduleId] ?? []
}

/**
 * Returns the E-module questions that should be shown based on the user's
 * selected destinations from A3.
 *
 * If the user selected "ALL", only the E_ALL high-level filter question is
 * returned. Otherwise only questions whose destinationTrigger overlaps with
 * the selected destinations are included, capped at 6.
 */
export function getDestinationQuestions(destinations: string[]): Question[] {
  if (!destinations || destinations.length === 0) return []

  const hasAll = destinations.includes("ALL")

  const matched = MODULE_E.filter((q) => {
    if (!q.destinationTrigger) return false
    if (hasAll) return q.destinationTrigger.includes("ALL")
    return q.destinationTrigger.some((d) => destinations.includes(d))
  })

  // Cap at 6
  return matched.slice(0, 6)
}

/**
 * Builds the payload object for PUT /api/v1/assessments/me.
 *
 * Takes the raw answers map (keyed by question id, e.g. { A1: "a", B2: 3.5 })
 * and structures them into the backend-expected shape.
 */
export function buildV3Payload(
  answers: Record<string, any>
): Record<string, any> {
  const payload: Record<string, any> = {
    version: 3,
    modules: {} as Record<string, Record<string, any>>,
  }

  for (const q of ALL_QUESTIONS) {
    const value = answers[q.id]
    if (value === undefined || value === null) continue

    if (!payload.modules[q.module]) {
      payload.modules[q.module] = {}
    }
    payload.modules[q.module][q.id] = value
  }

  return payload
}

// ---------------------------------------------------------------------------
// Academic-track alternative questions
// ---------------------------------------------------------------------------

/**
 * Alternative questions used when A1 = academic (d).
 * Keys correspond to the base question IDs they replace.
 */
export const ACADEMIC_ALTERNATIVES: Record<string, Question> = {
  D2: {
    id: "D2_academic",
    module: "D",
    moduleLabel: "价值取舍",
    type: "tradeoff",
    question: "导师 vs 学校排名",
    options: [
      { value: "A", label: "导师方向完美匹配，但学校排名一般" },
      { value: "B", label: "学校排名顶尖，但导师方向不太匹配" },
    ],
  },
  D5: {
    id: "D5_academic",
    module: "D",
    moduleLabel: "价值取舍",
    type: "single",
    question: "你能接受的博士年限？",
    options: [
      { value: "a", label: "4年以内最好" },
      { value: "b", label: "5年可以接受" },
      { value: "c", label: "只要项目好，年限不是问题" },
    ],
  },
}

/**
 * Returns module questions with academic-track substitutions applied.
 * When isAcademic is true, D2 is replaced with D2_academic and D5 with D5_academic.
 */
export function getModuleQuestionsWithTrack(moduleId: string, isAcademic: boolean): Question[] {
  const questions = getModuleQuestions(moduleId)
  if (!isAcademic || moduleId !== "D") return questions

  return questions.map((q) => {
    if (q.id === "D2" && ACADEMIC_ALTERNATIVES["D2"]) return ACADEMIC_ALTERNATIVES["D2"]
    if (q.id === "D5" && ACADEMIC_ALTERNATIVES["D5"]) return ACADEMIC_ALTERNATIVES["D5"]
    return q
  })
}
