"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemedShell } from "@/components/themed-shell"

const TRACK_STORAGE_KEY = "wthimf.intendedDirection"
const CAREER_STORAGE_KEY = "wthimf.targetCareer"

// Group directions by category for display
const DIRECTION_GROUPS = [
  {
    label: "公共事务",
    options: [
      { value: "track_1_1", label: "公共政策硕士（MPP）" },
      { value: "track_1_2", label: "公共管理硕士（MPA）" },
      { value: "track_1_3", label: "国际关系 / 国际事务硕士" },
      { value: "track_1_4", label: "非营利管理硕士" },
      { value: "track_1_5", label: "城市规划 / 城市政策硕士" },
    ],
  },
  {
    label: "金融经济",
    options: [
      { value: "track_2_1", label: "金融学硕士（MSF）" },
      { value: "track_2_2", label: "经济学硕士（MAE/MSE）" },
      { value: "track_2_3", label: "会计学硕士（MSA/MAcc）" },
      { value: "track_2_4", label: "量化金融 / 金融工程硕士（MFE）" },
      { value: "track_2_5", label: "房地产金融 / 房地产硕士" },
    ],
  },
  {
    label: "营销传媒",
    options: [
      { value: "track_3_1", label: "整合营销传播硕士（IMC）" },
      { value: "track_3_2", label: "市场营销硕士（MKT/MSM）" },
      { value: "track_3_3", label: "传媒 / 新闻硕士" },
      { value: "track_3_4", label: "公共关系硕士（PR）" },
      { value: "track_3_5", label: "数字媒体 / 新媒体硕士" },
    ],
  },
  {
    label: "量化商科",
    options: [
      { value: "track_4_1", label: "商业分析硕士（BA/MSBA）" },
      { value: "track_4_2", label: "商科向数据科学硕士（DS）" },
      { value: "track_4_3", label: "量化应用经济学硕士" },
      { value: "track_4_4", label: "市场分析 / 营销科学硕士" },
    ],
  },
  {
    label: "管理泛商科",
    options: [
      { value: "track_5_1", label: "管理学硕士（MiM）" },
      { value: "track_5_2", label: "供应链管理硕士" },
      { value: "track_5_3", label: "酒店管理 / 旅游管理硕士" },
      { value: "track_5_4", label: "人力资源管理 / 组织行为学硕士" },
      { value: "track_5_5", label: "创新创业硕士" },
    ],
  },
  {
    label: "教育学",
    options: [
      { value: "track_6_1", label: "教育政策 / 教育管理硕士" },
      { value: "track_6_2", label: "教育科技 / 学习设计与技术硕士" },
      { value: "track_6_3", label: "高等教育 / 学生事务硕士" },
      { value: "track_6_4", label: "课程与教学 / 学前教育硕士" },
      { value: "track_6_5", label: "TESOL / 对外英语教学硕士" },
    ],
  },
  {
    label: "健康社服",
    options: [
      { value: "track_7_1", label: "健康政策与管理硕士" },
      { value: "track_7_2", label: "公共卫生硕士（MPH，非临床）" },
      { value: "track_7_3", label: "社会工作硕士（MSW）" },
      { value: "track_7_4", label: "医疗管理 / 医院管理硕士" },
    ],
  },
  {
    label: "法律合规",
    options: [
      { value: "track_8_1", label: "法学硕士（LLM）" },
      { value: "track_8_2", label: "法律与公共政策硕士" },
      { value: "track_8_3", label: "企业合规 / 合规管理硕士" },
    ],
  },
] as const

const DIRECTION_OPTIONS = [
  { value: "track_1_1", label: "公共事务 · 公共政策硕士（MPP）" },
  { value: "track_1_2", label: "公共事务 · 公共管理硕士（MPA）" },
  { value: "track_1_3", label: "公共事务 · 国际关系/国际事务硕士（IR/IA）" },
  { value: "track_1_4", label: "公共事务 · 非营利管理硕士" },
  { value: "track_1_5", label: "公共事务 · 城市规划/城市政策硕士" },
  { value: "track_2_1", label: "金融经济 · 金融学硕士（MSF）" },
  { value: "track_2_2", label: "金融经济 · 经济学硕士（MAE/MSE）" },
  { value: "track_2_3", label: "金融经济 · 会计学硕士（MSA/MAcc）" },
  { value: "track_2_4", label: "金融经济 · 量化金融/金融工程硕士（MFE/MSQF）" },
  { value: "track_2_5", label: "金融经济 · 房地产金融/房地产硕士" },
  { value: "track_3_1", label: "营销传媒 · 整合营销传播硕士（IMC）" },
  { value: "track_3_2", label: "营销传媒 · 市场营销硕士（MKT/MSM）" },
  { value: "track_3_3", label: "营销传媒 · 传媒/新闻硕士" },
  { value: "track_3_4", label: "营销传媒 · 公共关系硕士（PR）" },
  { value: "track_3_5", label: "营销传媒 · 数字媒体/新媒体硕士" },
  { value: "track_4_1", label: "量化商科 · 商业分析硕士（BA/MSBA）" },
  { value: "track_4_2", label: "量化商科 · 商科向数据科学硕士（DS）" },
  { value: "track_4_3", label: "量化商科 · 量化应用经济学硕士" },
  { value: "track_4_4", label: "量化商科 · 市场分析/营销科学硕士" },
  { value: "track_5_1", label: "管理泛商科 · 管理学硕士（MiM）" },
  { value: "track_5_2", label: "管理泛商科 · 供应链管理硕士" },
  { value: "track_5_3", label: "管理泛商科 · 酒店管理/旅游管理硕士" },
  { value: "track_5_4", label: "管理泛商科 · 人力资源管理/组织行为学硕士" },
  { value: "track_5_5", label: "管理泛商科 · 创新创业硕士" },
  { value: "track_6_1", label: "教育学 · 教育政策/教育管理硕士" },
  { value: "track_6_2", label: "教育学 · 教育科技/学习设计与技术硕士" },
  { value: "track_6_3", label: "教育学 · 高等教育/学生事务硕士" },
  { value: "track_6_4", label: "教育学 · 课程与教学/学前教育硕士" },
  { value: "track_6_5", label: "教育学 · TESOL/对外英语教学硕士" },
  { value: "track_7_1", label: "健康社服 · 健康政策与管理硕士" },
  { value: "track_7_2", label: "健康社服 · 非临床向公共卫生硕士（MPH）" },
  { value: "track_7_3", label: "健康社服 · 社会工作硕士（MSW）" },
  { value: "track_7_4", label: "健康社服 · 医疗管理/医院管理硕士" },
  { value: "track_8_1", label: "法律合规 · 法学硕士（LLM）" },
  { value: "track_8_2", label: "法律合规 · 法律与公共政策硕士" },
  { value: "track_8_3", label: "法律合规 · 企业合规/合规管理硕士" },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedDirections, setSelectedDirections] = useState<string[]>([])
  const [targetCareer, setTargetCareer] = useState("")

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TRACK_STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as unknown
          setSelectedDirections(Array.isArray(parsed) ? (parsed as string[]) : [stored])
        } catch {
          setSelectedDirections([stored])
        }
      }
      setTargetCareer(window.localStorage.getItem(CAREER_STORAGE_KEY) ?? "")
    } catch {
      // Ignore localStorage failures on initial load.
    }
  }, [])

  const toggleDirection = (value: string) => {
    setSelectedDirections((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const handleContinue = () => {
    try {
      if (selectedDirections.length > 0) {
        window.localStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(selectedDirections))
      }
      if (targetCareer) window.localStorage.setItem(CAREER_STORAGE_KEY, targetCareer)
    } catch {
      // Ignore localStorage failures and continue navigation.
    }
    router.push("/assessment")
  }

  return (
    <ThemedShell title="构建申请档案" backHref="/">
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Quick Profile
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              构建你的申请档案
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-7 text-muted-foreground">
              先用 1 分钟完成基础信息，系统会先按目标职业和细分方向生成更贴近你的测评场景。
            </p>
          </div>

          {/* Basic Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">基础学术信息</CardTitle>
              <CardDescription>用于识别院校背景和申请竞争力基线</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">本科院校</label>
                  <Input placeholder="例如：北京大学 / UC Berkeley" className="w-full" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">本科专业</label>
                  <Input placeholder="例如：金融学 / Computer Science" className="w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">GPA 计分方式</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="计分方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4.0">4.0 分制</SelectItem>
                      <SelectItem value="4.3">4.3 分制</SelectItem>
                      <SelectItem value="100">百分制</SelectItem>
                      <SelectItem value="wes">WES 认证后</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">GPA 数值</label>
                  <Input type="number" step="0.01" placeholder="例如：3.85 / 88" className="w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Direction Multi-select Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">意向申请方向</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    可多选；系统用第一个选择的方向生成 40 道专属测评题的专业场景变量。
                    选得越细，测评越像真实项目环境。
                  </CardDescription>
                </div>
                {selectedDirections.length > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    已选 {selectedDirections.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              {DIRECTION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedDirections.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleDirection(opt.value)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10 font-medium text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Career Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">目标职业方向</CardTitle>
              <CardDescription className="text-sm leading-6">
                系统会优先匹配该职业的主流硕士项目，是最影响推荐精准度的字段
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Select value={targetCareer} onValueChange={setTargetCareer}>
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder="选择你的目标职业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_analyst">商业分析师</SelectItem>
                  <SelectItem value="data_analyst">数据分析师</SelectItem>
                  <SelectItem value="financial_analyst">金融分析师</SelectItem>
                  <SelectItem value="investment_banking">投行 / 财务顾问</SelectItem>
                  <SelectItem value="consultant">管理咨询顾问</SelectItem>
                  <SelectItem value="marketing_manager">品牌 / 市场营销</SelectItem>
                  <SelectItem value="product_manager">产品经理</SelectItem>
                  <SelectItem value="policy_analyst">公共政策分析师</SelectItem>
                  <SelectItem value="researcher">学术研究员</SelectItem>
                  <SelectItem value="other">其他 / 尚未确定</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="pb-4">
            <Button
              size="lg"
              className="w-full"
              onClick={handleContinue}
              disabled={selectedDirections.length === 0}
            >
              {selectedDirections.length === 0
                ? "请先选择至少一个意向方向"
                : `下一步：开启硕士专属测评（${selectedDirections.length} 个方向）`}
            </Button>
          </div>
        </div>
      </main>
    </ThemedShell>
  )
}
