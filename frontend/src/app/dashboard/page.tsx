"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ThemedShell } from "@/components/themed-shell"
import { useDesignStyle } from "@/lib/design-style-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { getUserProfile, getProgramRecommendations, type UserProfile } from "@/lib/api"
import { AlertCircle, CheckCircle2, TrendingUp, Target, Brain, Sliders, Briefcase, GraduationCap } from "lucide-react"

// ── 辅助组件 ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max = 100, color = "bg-foreground" }: {
  label: string
  value: number
  max?: number
  color?: string
}) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SectionCard({ icon, title, subtitle, children }: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export interface ProgramRecommendation {
  program_id: number
  program_name: string
  university: string
  overall_score: number
  program_type: string
  match_breakdown: {
    academic_fit?: number
    career_fit?: number
    prerequisite_fit?: number
    preference_fit?: number
    assessment_fit?: number
  }
  warning_flags: string[]
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [recommendations, setRecommendations] = useState<ProgramRecommendation[]>([])
  const [recsLoading, setRecsLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { style } = useDesignStyle()

  const radarColors = useMemo(() => {
    switch (style) {
      case "retro":     return { hard: "#000080", personality: "#000080", career: "#000080" }
      case "vaporwave": return { hard: "#FF00FF", personality: "#00FFFF", career: "#FF00FF" }
      case "terminal":  return { hard: "#33ff00", personality: "#33ff00", career: "#33ff00" }
      case "healing":   return { hard: "#8B7355", personality: "#6B8F71", career: "#8B7355" }
      default:          return { hard: "#0f172a", personality: "#6366f1", career: "#0052FF" }
    }
  }, [style])

  const gridStroke = useMemo(() => {
    switch (style) {
      case "retro":     return "#808080"
      case "vaporwave": return "#2D1B4E"
      case "terminal":  return "#1f521f"
      case "healing":   return "#D4C9B8"
      default:          return "#e2e8f0"
    }
  }, [style])

  const axisTickFill = useMemo(() => {
    switch (style) {
      case "retro":     return "#000000"
      case "vaporwave": return "#E0E0E0"
      case "terminal":  return "#33ff00"
      case "healing":   return "#8B7355"
      default:          return "#64748b"
    }
  }, [style])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserProfile()
        setProfile(data)
      } catch (err) {
        setError("加载画像失败，请确认已填写基础信息并完成测评")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    const loadRecs = async () => {
      setRecsLoading(true)
      try {
        const data = await getProgramRecommendations({ max_results: 12 })
        setRecommendations(data)
      } catch {
        setRecommendations([])
      } finally {
        setRecsLoading(false)
      }
    }
    void loadRecs()
  }, [])

  // Module 1: 硬背景雷达数据
  const hardRadarData = useMemo(() => {
    if (!profile) return []
    const hb = profile.hard_background
    return [
      { subject: "GPA", A: hb.gpa_score, fullMark: 100 },
      { subject: "标化成绩", A: hb.test_score, fullMark: 100 },
      { subject: "本科院校", A: hb.school_tier_score, fullMark: 100 },
      { subject: "先修课程", A: hb.prereq_completion, fullMark: 100 },
      { subject: "科研经历", A: hb.research_score, fullMark: 100 },
      { subject: "实习经历", A: hb.internship_score, fullMark: 100 },
    ]
  }, [profile])

  // Module 2: 人格雷达数据
  const personalityRadarData = useMemo(() => {
    if (!profile) return []
    const p = profile.personality
    return [
      { subject: "开放性", A: p.openness, fullMark: 100 },
      { subject: "尽责性", A: p.conscientiousness, fullMark: 100 },
      { subject: "宜人性", A: p.agreeableness, fullMark: 100 },
    ]
  }, [profile])

  // Module 4: 职业能力雷达（只展示目标职业所需的技能）
  const careerRadarData = useMemo(() => {
    if (!profile) return []
    return profile.career_match.career_radar.map((d) => ({
      subject: d.skill,
      用户: d.user_score,
      要求: d.required,
      fullMark: 5,
    }))
  }, [profile])

  if (isLoading) {
    return (
      <ThemedShell title="申请竞争力画像" backHref="/">
        <main className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent mx-auto" />
            <p className="text-muted-foreground text-sm">正在生成你的申请竞争力画像…</p>
          </div>
        </main>
      </ThemedShell>
    )
  }

  if (error || !profile) {
    return (
      <ThemedShell title="申请竞争力画像" backHref="/">
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertCircle className="h-5 w-5" />
                还没有完整画像
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {error ?? "请先完成硕士专属测评和基础信息填写，系统才能生成与选校策略绑定的竞争力画像。"}
              </p>
              <div className="flex gap-2">
                <Link href="/assessment"><Button>完成测评</Button></Link>
                <Link href="/master-profile"><Button variant="outline">填写背景</Button></Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </ThemedShell>
    )
  }

  const pref = profile.preferences
  const cm = profile.career_match

  return (
    <ThemedShell title="申请竞争力画像" backHref="/">
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* 顶部总览 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {profile.nickname} 的申请竞争力画像
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              综合竞争力得分 ·
              <span className="ml-1 font-semibold text-foreground text-base">
                {profile.overall_competitiveness.toFixed(1)}
              </span>
              <span className="text-muted-foreground/60">/100</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/assessment"><Button variant="outline" size="sm">重做测评</Button></Link>
            <Link href="/master-profile"><Button variant="outline" size="sm">更新背景</Button></Link>
            <Link href="/skill-assessment"><Button size="sm">技能自评</Button></Link>
          </div>
        </div>

        {/* ── 为你推荐的项目（优先展示） ── */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">为你推荐的项目</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  基于你的测评结果、硬背景与偏好自动匹配，按契合度排序
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="py-12 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">正在根据你的画像匹配项目…</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-10 px-4 rounded-xl bg-muted/50 text-center">
                <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">暂无推荐项目</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  请确认：① 已完成测评并提交；② 系统已导入项目库。若项目库为空，请联系管理员导入硕士项目数据。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.program_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{rec.program_name}</p>
                      <p className="text-sm text-muted-foreground">{rec.university}</p>
                      {rec.match_breakdown && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {typeof rec.match_breakdown.academic_fit === "number" && (
                            <span>硬背景 {rec.match_breakdown.academic_fit.toFixed(0)}</span>
                          )}
                          {typeof rec.match_breakdown.assessment_fit === "number" && (
                            <span>测评契合 {rec.match_breakdown.assessment_fit.toFixed(0)}</span>
                          )}
                          {typeof rec.match_breakdown.career_fit === "number" && rec.match_breakdown.career_fit > 0 && (
                            <span>职业 {rec.match_breakdown.career_fit.toFixed(0)}</span>
                          )}
                          {typeof rec.match_breakdown.prerequisite_fit === "number" && (
                            <span>先修 {rec.match_breakdown.prerequisite_fit.toFixed(0)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge
                        variant={
                          rec.program_type === "reach"
                            ? "default"
                            : rec.program_type === "target"
                            ? "outline"
                            : "default"
                        }
                        className="capitalize"
                      >
                        {rec.program_type === "reach" ? "冲刺" : rec.program_type === "target" ? "匹配" : "保底"}
                      </Badge>
                      <span className="text-lg font-bold text-foreground tabular-nums w-12 text-right">
                        {rec.overall_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 主看板四模块 */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── 模块1：硬背景竞争力雷达图 ── */}
          <SectionCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="硬背景竞争力"
            subtitle={`综合得分 ${profile.hard_background.overall.toFixed(1)} / 100`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={hardRadarData}>
                <PolarGrid stroke={gridStroke} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: axisTickFill, fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="硬背景"
                  dataKey="A"
                  stroke={radarColors.hard}
                  fill={radarColors.hard}
                  fillOpacity={0.25}
                />
                <Tooltip
                  formatter={(value) => [
                    typeof value === "number" ? value.toFixed(1) : String(value ?? ""),
                    "",
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
              <ScoreBar label="GPA" value={profile.hard_background.gpa_score} />
              <ScoreBar label="标化成绩" value={profile.hard_background.test_score} />
              <ScoreBar label="本科院校" value={profile.hard_background.school_tier_score} />
              <ScoreBar label="先修课程" value={profile.hard_background.prereq_completion} />
              <ScoreBar label="科研经历" value={profile.hard_background.research_score} />
              <ScoreBar label="实习经历" value={profile.hard_background.internship_score} />
            </div>
          </SectionCard>

          {/* ── 模块2：人格与适配倾向雷达图 ── */}
          <SectionCard
            icon={<Brain className="h-5 w-5" />}
            title="人格与适配倾向"
            subtitle="基于 IPIP-NEO 大五人格测评"
          >
            {!profile.personality.has_assessment && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                尚未完成测评，当前显示默认值，
                <Link href="/assessment" className="font-semibold underline text-foreground">立即测评</Link>
              </div>
            )}
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={personalityRadarData}>
                <PolarGrid stroke={gridStroke} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: axisTickFill, fontSize: 13 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="人格"
                  dataKey="A"
                  stroke={radarColors.personality}
                  fill={radarColors.personality}
                  fillOpacity={0.25}
                />
                <Tooltip
                  formatter={(value) => [
                    typeof value === "number" ? value.toFixed(1) : String(value ?? ""),
                    "",
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              <ScoreBar label="开放性（越高越倾向跨学科/创新）" value={profile.personality.openness} color="bg-indigo-500" />
              <ScoreBar label="尽责性（越高越适合高强度项目）" value={profile.personality.conscientiousness} color="bg-indigo-500" />
              <ScoreBar label="宜人性（越高越适合协作型项目）" value={profile.personality.agreeableness} color="bg-indigo-500" />
            </div>
          </SectionCard>

          {/* ── 模块3：选校偏好权重面板 ── */}
          <SectionCard
            icon={<Sliders className="h-5 w-5" />}
            title="选校偏好权重"
            subtitle="基于偏好测评自动生成，影响项目匹配权重"
          >
            {!profile.personality.has_assessment && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                完成测评后权重将自动更新
              </div>
            )}
            <div className="space-y-4">
              {/* 学术 vs 就业 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">学术 vs 就业导向</p>
                <div className="flex rounded-full overflow-hidden h-5 text-xs font-semibold">
                  <div
                    className="flex items-center justify-center bg-foreground text-background"
                    style={{ width: `${pref.academic_weight}%` }}
                  >
                    {pref.academic_weight > 15 && `学术 ${Math.round(pref.academic_weight)}`}
                  </div>
                  <div
                    className="flex items-center justify-center bg-muted text-muted-foreground"
                    style={{ width: `${pref.career_weight}%` }}
                  >
                    {pref.career_weight > 15 && `就业 ${Math.round(pref.career_weight)}`}
                  </div>
                </div>
              </div>

              {/* 冲刺/匹配/保底比例 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">选校策略分布</p>
                <div className="flex rounded-full overflow-hidden h-5 text-xs font-semibold">
                  <div
                    className="flex items-center justify-center bg-rose-500 text-white"
                    style={{ width: `${Math.round(pref.application_mix.reach_ratio * 100)}%` }}
                  >
                    {pref.application_mix.reach_ratio > 0.1 && `冲 ${Math.round(pref.application_mix.reach_ratio * 100)}%`}
                  </div>
                  <div
                    className="flex items-center justify-center bg-emerald-500 text-white"
                    style={{ width: `${Math.round(pref.application_mix.target_ratio * 100)}%` }}
                  >
                    {pref.application_mix.target_ratio > 0.1 && `匹 ${Math.round(pref.application_mix.target_ratio * 100)}%`}
                  </div>
                  <div
                    className="flex items-center justify-center bg-muted-foreground/40 text-background"
                    style={{ width: `${Math.round(pref.application_mix.safety_ratio * 100)}%` }}
                  >
                    {pref.application_mix.safety_ratio > 0.1 && `保 ${Math.round(pref.application_mix.safety_ratio * 100)}%`}
                  </div>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-rose-500" />冲刺</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />匹配</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />保底</span>
                </div>
              </div>

              {/* 其他偏好 */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">跨学科开放度</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {Math.round(pref.interdisciplinary_openness)}
                    <span className="text-xs text-muted-foreground/60 font-normal">/100</span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">风险偏好</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {Math.round(pref.risk_tolerance)}
                    <span className="text-xs text-muted-foreground/60 font-normal">/100</span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">城市偏好</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {pref.large_city_preference >= pref.small_city_preference ? "大城市" : "小城市"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">班级规模偏好</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {pref.small_cohort_preference >= pref.large_program_preference ? "小而精" : "大项目"}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── 模块4：目标职业与能力匹配面板 ── */}
          <SectionCard
            icon={<Briefcase className="h-5 w-5" />}
            title="目标职业能力匹配"
            subtitle={`目标：${cm.target_career} · 匹配度 ${cm.match_score.toFixed(1)}%`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${cm.match_score}%` }}
                />
              </div>
              <span className="text-sm font-bold text-accent w-12 text-right">
                {cm.match_score.toFixed(0)}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={careerRadarData}>
                <PolarGrid stroke={gridStroke} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: axisTickFill, fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                <Radar name="我的水平" dataKey="用户" stroke={radarColors.career} fill={radarColors.career} fillOpacity={0.3} />
                <Radar name="职业要求" dataKey="要求" stroke="hsl(45,40%,55%)" fill="hsl(45,40%,55%)" fillOpacity={0.15} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>

            {cm.skill_gaps.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">待提升技能</p>
                <div className="flex flex-wrap gap-1.5">
                  {cm.skill_gaps.map((sk) => (
                    <Badge key={sk} variant="outline" className="text-xs border-primary/30 text-foreground bg-primary/8">
                      {sk}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {cm.skill_gaps.length === 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/8 border border-accent/20 px-3 py-2 text-xs text-accent">
                <CheckCircle2 className="h-4 w-4" />
                你的技能已覆盖目标职业所有要求！
              </div>
            )}

            <div className="mt-3 text-right">
              <Link href="/skill-assessment">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  更新技能自评 →
                </Button>
              </Link>
            </div>
          </SectionCard>

        </div>

        {/* 底部操作 */}
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/assessment"><Button variant="outline">重新做测评</Button></Link>
          <Link href="/master-profile"><Button variant="outline">完善硕士档案</Button></Link>
          <Link href="/skill-assessment"><Button>更新技能自评</Button></Link>
        </div>
      </div>
    </main>
    </ThemedShell>
  )
}
