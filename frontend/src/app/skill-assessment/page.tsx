"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getUserProfile, updateSkillAssessment, type UserProfile } from "@/lib/api"
import { CheckCircle2, ChevronLeft } from "lucide-react"
import { ThemedShell } from "@/components/themed-shell"
import { useDesignStyle } from "@/lib/design-style-context"

// 技能定义（与 backend profile.py 的 ALL_SKILLS 一致）
const ALL_SKILLS = [
  "编程能力",
  "统计/机器学习",
  "数据分析",
  "批判性思维",
  "写作表达",
  "团队协作",
  "项目管理",
  "商业分析",
  "量化建模",
  "沟通演讲",
] as const

const SKILL_DESCRIPTIONS: Record<string, string> = {
  "编程能力": "Python / R / SQL 等编程语言的实际开发经验",
  "统计/机器学习": "统计建模、机器学习算法理解与应用",
  "数据分析": "数据清洗、探索性分析、可视化呈现",
  "批判性思维": "逻辑推理、论证分析、问题拆解能力",
  "写作表达": "学术写作、报告撰写、文字表达能力",
  "团队协作": "跨职能团队合作、冲突协调经验",
  "项目管理": "项目规划、进度把控、资源协调",
  "商业分析": "商业模型理解、市场分析、战略思维",
  "量化建模": "金融建模、运筹优化、定量分析",
  "沟通演讲": "口头表达、路演汇报、利益相关方沟通",
}

const LEVEL_LABELS = ["", "入门了解", "有限实践", "熟练掌握", "较强经验", "专业精通"]
const LEVEL_COLORS = [
  "",
  "bg-slate-200 text-slate-600",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
]

export default function SkillAssessmentPage() {
  const router = useRouter()
  const { style } = useDesignStyle()
  const [skills, setSkills] = useState<Record<string, number>>(
    Object.fromEntries(ALL_SKILLS.map((s) => [s, 2]))
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserProfile()
        setProfile(data)
        if (data.career_match.skills) {
          setSkills((prev) => ({ ...prev, ...data.career_match.skills }))
        }
      } catch {
        // 未填写信息时使用默认值
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const handleLevelChange = (skill: string, level: number) => {
    setSkills((prev) => ({ ...prev, [skill]: level }))
    setSaved(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSkillAssessment(skills)
      setSaved(true)
      setTimeout(() => router.push("/dashboard"), 1200)
    } catch (err) {
      console.error("保存失败:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <ThemedShell title="技能自评" backHref="/dashboard">
        <main className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </main>
      </ThemedShell>
    )
  }

  const targetCareer = profile?.career_match.target_career ?? "商业分析师"

  // Theme-aware active button style for skill levels
  const activeStyle = {
    retro:     "bg-[#000080] text-white",
    vaporwave: "bg-[#FF00FF] text-white shadow-[0_0_10px_rgba(255,0,255,0.5)]",
    terminal:  "bg-[#33ff00] text-[#0a0a0a]",
    minimal:   "bg-slate-900 text-white shadow-sm scale-110",
    healing:   "bg-[hsl(36,28%,68%)] text-[hsl(0,0%,12%)] shadow-sm rounded-full",
  }[style] ?? "bg-slate-900 text-white"
  const inactiveStyle = {
    retro:     "bg-[#c0c0c0] text-black border border-[#808080]",
    vaporwave: "bg-transparent text-[#E0E0E0] border border-[#2D1B4E]",
    terminal:  "bg-[#0d1a0d] text-[#1f521f] border border-[#1f521f]",
    minimal:   "bg-slate-100 text-slate-400 hover:bg-slate-200",
    healing:   "bg-transparent text-[hsl(0,0%,45%)] border border-[hsl(38,20%,84%)] rounded-full",
  }[style] ?? "bg-slate-100 text-slate-400"

  return (
    <ThemedShell title="技能自评" backHref="/dashboard">
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-foreground">技能与先修课自评</h1>
          <p className="text-muted-foreground text-sm mt-1">
            诚实评估你的核心技能熟练度，系统会计算你与目标职业
            <Badge variant="outline" className="mx-1 text-xs">{targetCareer}</Badge>
            的匹配度
          </p>
        </div>

        {/* 熟练度说明 */}
        <div className="flex flex-wrap gap-2">
          {LEVEL_LABELS.slice(1).map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLORS[i + 1]}`}
            >
              {i + 1} — {label}
            </span>
          ))}
        </div>

        {/* 技能评分卡片 */}
        <div className="space-y-3">
          {ALL_SKILLS.map((skill) => {
            const level = skills[skill] ?? 2
            return (
              <Card key={skill} className="border-slate-200">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{skill}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {SKILL_DESCRIPTIONS[skill]}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() => handleLevelChange(skill, v)}
                          className={`
                            w-8 h-8 text-sm font-semibold transition-all
                            ${level === v ? activeStyle : inactiveStyle}
                          `}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 当前等级标签 */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all duration-300"
                        style={{ width: `${(level / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${LEVEL_COLORS[level]}`}>
                      {LEVEL_LABELS[level]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 保存按钮 */}
        <div className="sticky bottom-6 flex justify-center">
          <Button
            onClick={handleSave}
            disabled={isSaving || saved}
            className="w-full max-w-xs shadow-lg"
            size="lg"
          >
            {saved ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                已保存，跳转画像…
              </span>
            ) : isSaving ? (
              "保存中…"
            ) : (
              "保存并更新画像"
            )}
          </Button>
        </div>

      </div>
    </main>
    </ThemedShell>
  )
}
