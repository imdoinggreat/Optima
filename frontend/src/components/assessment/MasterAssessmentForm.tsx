"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, AlertTriangle, Target, Shield, GraduationCap, MapPin, TrendingUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
// Progress replaced with custom copper bar
import { Slider } from "@/components/ui/slider"
import {
  ALL_QUESTIONS,
  getModuleQuestions,
  getModuleQuestionsWithTrack,
  getDestinationQuestions,
  buildV3Payload,
  flattenTwoLevelValues,
} from "@/lib/master-question-bank"

// ── Types ────────────────────────────────────────────────────────────────────

interface TwoLevelOption {
  category: string
  categoryLabel: string
  options: { value: string; label: string }[]
}

interface V3Question {
  id: string
  module: string
  moduleLabel: string
  type: "single" | "multi" | "slider" | "tradeoff" | "two_level"
  question: string
  options?: { value: string; label: string }[]
  twoLevelOptions?: TwoLevelOption[]
  sliderConfig?: { min: number; max: number; step: number }
  destinationTrigger?: string[]
}

interface Conflict {
  type: string
  desc: string
  insight: string
}

interface AssessmentResult {
  decision_profile: string
  conflicts: Conflict[]
  hidden_risks: string[]
  risk_profile: string
  application_mix: {
    reach: number
    target: number
    safety: number
  }
}

interface ProgramRec {
  program_id: number
  program_name: string
  university: string
  country: string
  city: string
  overall_score: number
  program_type: "reach" | "target" | "safety"
  reason: { why: string; risk: string; note: string } | string
  warnings: string[]
  match_breakdown: Record<string, number>
}

interface RecommendationResponse {
  recommendations: ProgramRec[]
  list_balance: {
    actual_mix: Record<string, number>
    counts: Record<string, number>
    alerts: string[]
  }
  decision_profile: string
  conflicts: Conflict[]
  hidden_risks: string[]
  inferred_goal: string
  goal_confidence: number
}

type AnswerValue = string | string[] | number

// ── Constants ────────────────────────────────────────────────────────────────

const MODULE_IDS = ["A", "B", "C", "D", "E", "F"] as const
const MODULE_LABELS: Record<string, string> = {
  A: "终极目标",
  B: "背景快照",
  C: "性格适配",
  D: "价值权衡",
  E: "目的地",
  F: "选校配方",
}

function getUserId(): string {
  if (typeof window === "undefined") return "1"
  return localStorage.getItem("optima.userId") || "1"
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SingleChoice({
  question,
  value,
  onChange,
}: {
  question: V3Question
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      {question.options?.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-200 ${
            value === opt.value
              ? "border border-[#E8E4DE] shadow-sm"
              : "border border-[#E8E4DE] bg-white hover:bg-[#FDFCFA]"
          }`}
          style={value === opt.value ? { borderLeft: "3px solid #B87333", background: "#FBF7F2" } : {}}
        >
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              value === opt.value
                ? "text-white"
                : "text-[#8A8A8A]"
            }`}
            style={{ background: value === opt.value ? "#B87333" : "#E8E4DE" }}
          >
            {i + 1}
          </span>
          <span className="text-[15px] leading-7" style={{ color: "#4A4A4A" }}>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

function MultiChoice({
  question,
  value,
  onChange,
}: {
  question: V3Question
  value: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  return (
    <div className="space-y-3">
      {question.options?.map((opt, i) => {
        const checked = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-200 ${
              checked
                ? "border border-[#E8E4DE] shadow-sm"
                : "border border-[#E8E4DE] bg-white hover:bg-[#FDFCFA]"
            }`}
            style={checked ? { borderLeft: "3px solid #B87333", background: "#FBF7F2" } : {}}
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} />
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                checked
                  ? "text-white"
                  : "text-[#8A8A8A]"
              }`}
              style={{ background: checked ? "#B87333" : "#E8E4DE" }}
            >
              {i + 1}
            </span>
            <span className="text-[15px] leading-7" style={{ color: "#4A4A4A" }}>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SliderQuestion({
  question,
  value,
  onChange,
  overrideConfig,
}: {
  question: V3Question
  value: number | undefined
  onChange: (v: number) => void
  overrideConfig?: { min: number; max: number; step: number }
}) {
  const config = overrideConfig ?? question.sliderConfig ?? { min: 0, max: 100, step: 1 }
  const current = value ?? Math.round((config.min + config.max) / 2 * 10) / 10

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{config.min}</span>
        <span className="text-3xl font-bold tabular-nums" style={{ color: "#B87333" }}>{current}</span>
        <span className="text-sm text-muted-foreground">{config.max}</span>
      </div>
      <Slider
        min={config.min}
        max={config.max}
        step={config.step}
        value={[current]}
        onValueChange={(vals) => onChange(vals[0])}
        className="w-full"
      />
    </div>
  )
}

function TradeoffChoice({
  question,
  value,
  onChange,
}: {
  question: V3Question
  value: string | undefined
  onChange: (v: string) => void
}) {
  const options = question.options ?? []
  const optA = options[0]
  const optB = options[1]
  if (!optA || !optB) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[optA, optB].map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative flex flex-col gap-3 rounded-2xl p-6 text-left transition-all duration-200 ${
            value === opt.value
              ? "border border-[#E8E4DE] shadow-md"
              : "border border-[#E8E4DE] bg-white hover:bg-[#FDFCFA] hover:shadow-sm"
          }`}
          style={value === opt.value ? { borderLeft: "3px solid #B87333", background: "#FBF7F2" } : {}}
        >
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              value === opt.value
                ? "text-white"
                : "text-[#8A8A8A]"
            }`}
            style={{ background: value === opt.value ? "#B87333" : "#E8E4DE" }}
          >
            {opt.value}
          </span>
          <p className="text-[15px] leading-8" style={{ color: "#4A4A4A" }}>{opt.label}</p>
        </button>
      ))}
    </div>
  )
}

function TwoLevelChoice({
  question,
  value,
  onChange,
}: {
  question: V3Question
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const categories = question.twoLevelOptions ?? []

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  // Count selected per category
  const countByCategory = (cat: TwoLevelOption) =>
    cat.options.filter(o => value.includes(o.value)).length

  return (
    <div className="space-y-4">
      {/* Category row */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = countByCategory(cat)
          const isExpanded = expandedCategory === cat.category
          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                isExpanded
                  ? "border-[#B87333] font-medium text-[#0A0A0A]"
                  : count > 0
                    ? "border-[#B87333]/40 text-[#0A0A0A]"
                    : "border-[#E8E4DE] bg-white text-[#8A8A8A] hover:border-[#B87333]/40"
              }`}
              style={isExpanded ? { background: "#FBF7F2" } : count > 0 ? { background: "#FBF7F2" } : {}}
            >
              {cat.categoryLabel}
              {count > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "#B87333" }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Expanded options */}
      {expandedCategory && (
        <div className="rounded-xl border border-[#E8E4DE] p-4" style={{ background: "#FDFCFA" }}>
          <div className="space-y-2">
            {categories
              .find(c => c.category === expandedCategory)
              ?.options.map((opt) => {
                const checked = value.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all duration-200 ${
                      checked
                        ? "border-[#E8E4DE] shadow-sm"
                        : "border-[#E8E4DE] bg-white hover:bg-[#FDFCFA]"
                    }`}
                    style={checked ? { borderLeft: "3px solid #B87333", background: "#FBF7F2" } : {}}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} />
                    <span style={{ color: "#4A4A4A" }}>{opt.label}</span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Selected summary */}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          已选 {value.length} 个方向
        </p>
      )}
    </div>
  )
}

const TYPE_CONFIG = {
  reach:  { label: "冲刺", color: "text-[#C45C4A]", bg: "border-[#C45C4A]/30", bgStyle: { background: "rgba(196,92,74,0.08)" }, dot: "bg-[#C45C4A]", hint: "录取难度较大，建议作为冲刺目标" },
  target: { label: "主申", color: "text-[#B87333]", bg: "border-[#B87333]/30", bgStyle: { background: "rgba(184,115,51,0.08)" }, dot: "bg-[#B87333]", hint: "录取概率适中，推荐主申" },
  safety: { label: "保底", color: "text-[#5A8A6A]", bg: "border-[#5A8A6A]/30", bgStyle: { background: "rgba(90,138,106,0.08)" }, dot: "bg-[#5A8A6A]", hint: "录取概率较高，适合保底" },
} as const

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "强匹配", color: "text-[#5A8A6A]" }
  if (score >= 65) return { label: "较匹配", color: "text-[#B87333]" }
  if (score >= 50) return { label: "一般", color: "text-[#8A8A8A]" }
  return { label: "弱匹配", color: "text-[#C45C4A]" }
}

function ProgramCard({ rec }: { rec: ProgramRec }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = TYPE_CONFIG[rec.program_type]
  const scoreInfo = getScoreLabel(rec.overall_score)
  const reason = typeof rec.reason === "object" && rec.reason !== null ? rec.reason : null
  const reasonStr = typeof rec.reason === "string" ? rec.reason : null

  return (
    <Card className="rounded-2xl overflow-hidden border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start gap-4 p-5">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className={`text-base font-bold ${scoreInfo.color}`} style={{ fontFamily: "var(--font-dm-serif, Georgia, serif)" }}>{scoreInfo.label}</span>
          <span className="text-lg font-semibold tabular-nums" style={{ color: "#4A4A4A" }}>{Math.round(rec.overall_score)}</span>
          <span className="text-[10px]" style={{ color: "#8A8A8A" }}>匹配分</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${cfg.bg} ${cfg.color} border text-[10px]`} style={cfg.bgStyle}>{cfg.label}</Badge>
            <span className="text-[10px] text-muted-foreground">{cfg.hint}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{rec.city}, {rec.country}
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-semibold leading-6" style={{ color: "#0A0A0A", fontFamily: "var(--font-dm-serif, Georgia, serif)" }}>{rec.university}</h3>
          <p className="text-sm text-muted-foreground leading-5">{rec.program_name}</p>
          {/* Structured reason: why */}
          {reason ? (
            <>
              <p className="mt-2 text-xs text-green-700">
                <TrendingUp className="mb-0.5 mr-1 inline h-3 w-3" />
                {reason.why}
              </p>
              {reason.risk && (
                <p className="mt-1.5 text-xs text-amber-600">
                  <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                  {reason.risk}
                </p>
              )}
            </>
          ) : reasonStr ? (
            <p className="mt-2 text-xs text-muted-foreground">
              <TrendingUp className="mb-0.5 mr-1 inline h-3 w-3" />
              {reasonStr}
            </p>
          ) : null}
          {rec.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {rec.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600">
                  <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />{w}
                </p>
              ))}
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      {expanded && (
        <div className="border-t border-[#E8E4DE] px-5 py-4 space-y-4" style={{ background: "#FDFCFA" }}>
          {/* Note from reason */}
          {reason?.note && (
            <p className="text-xs text-muted-foreground italic">
              <GraduationCap className="mb-0.5 mr-1 inline h-3 w-3" />
              {reason.note}
            </p>
          )}
          <p className="text-xs font-semibold text-muted-foreground">各维度得分</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Object.entries(rec.match_breakdown).map(([dim, score]) => {
              const names: Record<string, string> = {
                admission: "录取", career: "就业", brand: "排名", visa: "签证",
                location: "地理", cost: "性价比", soft_fit: "环境", risk_hedge: "兜底",
                academic_quality: "学术",
              }
              return (
                <div key={dim} className="text-center">
                  <p className="text-lg font-semibold tabular-nums text-foreground">{Math.round(score)}</p>
                  <p className="text-[10px] text-muted-foreground">{names[dim] ?? dim}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

function ProgramCardCarousel({ programs, type }: { programs: ProgramRec[]; type: "reach" | "target" | "safety" }) {
  const [idx, setIdx] = useState(0)
  const cfg = TYPE_CONFIG[type]

  if (programs.length === 0) return null
  const current = programs[idx]

  return (
    <div className="space-y-3">
      {/* Category header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <h2 className={`text-lg font-semibold ${cfg.color}`}>
            {cfg.label}（{programs.length}）
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums" style={{ color: "#8A8A8A", fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>
            {idx + 1} / {programs.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx(Math.min(programs.length - 1, idx + 1))}
            disabled={idx === programs.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Single program card */}
      <ProgramCard key={current.program_id} rec={current} />
    </div>
  )
}

function ResultCard({ result, onRestart }: { result: AssessmentResult; onRestart: () => void }) {
  const [recs, setRecs] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const userId = getUserId()
        const res = await fetch("/api/matching/recommendations?max_results=20", {
          headers: { "X-User-Id": userId },
        })
        if (res.ok) {
          setRecs(await res.json())
        }
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const grouped = useMemo(() => {
    if (!recs) return { reach: [], target: [], safety: [] }
    const g: Record<string, ProgramRec[]> = { reach: [], target: [], safety: [] }
    for (const r of recs.recommendations) {
      (g[r.program_type] ??= []).push(r)
    }
    return g
  }, [recs])

  return (
    <div style={{ background: "#FAF8F5", minHeight: "100vh", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")` }}>
    <div className="mx-auto max-w-4xl space-y-6 pb-20 pt-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#0A0A0A", fontFamily: "var(--font-dm-serif, Georgia, serif)" }}>你的选校推荐</h1>
          <p className="mt-1 text-sm" style={{ color: "#4A4A4A" }}>{result.decision_profile}</p>
        </div>
        <Button variant="outline" onClick={onRestart} className="border-[#E8E4DE] hover:bg-[#FDFCFA]" style={{ color: "#4A4A4A" }}>重新测评</Button>
      </div>

      {/* Decision insights — always visible, before program list (v3 core) */}
      {(result.conflicts?.length > 0 || result.hidden_risks?.length > 0) && (
        <Card className="rounded-2xl border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#0A0A0A" }}>
              <Target className="h-5 w-5" style={{ color: "#B87333" }} />
              决策洞察
              {result.conflicts.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{result.conflicts.length} 个发现</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.conflicts.map((c, i) => (
              <div key={i} className="space-y-1.5 rounded-xl border border-[#E8E4DE] p-4">
                <Badge variant="outline">{c.type === "dual_track_strategy" ? "双轨策略" : c.type}</Badge>
                <p className="text-sm text-foreground">{c.desc}</p>
                <p className="text-xs text-muted-foreground">{c.insight}</p>
              </div>
            ))}
            {result.hidden_risks.map((r, i) => (
              <div key={`r-${i}`} className="flex items-start gap-2 rounded-xl border border-[#E8E4DE] p-4">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#C45C4A]" />
                <p className="text-sm text-foreground">{r}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      {recs && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#C45C4A]/30 p-4 text-center" style={{ background: "rgba(196,92,74,0.08)" }}>
            <p className="text-2xl font-bold text-[#C45C4A]" style={{ fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>{grouped.reach.length}</p>
            <p className="text-xs" style={{ color: "#8A8A8A" }}>冲刺 Reach</p>
          </div>
          <div className="rounded-xl border border-[#B87333]/30 p-4 text-center" style={{ background: "rgba(184,115,51,0.08)" }}>
            <p className="text-2xl font-bold text-[#B87333]" style={{ fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>{grouped.target.length}</p>
            <p className="text-xs" style={{ color: "#8A8A8A" }}>主申 Target</p>
          </div>
          <div className="rounded-xl border border-[#5A8A6A]/30 p-4 text-center" style={{ background: "rgba(90,138,106,0.08)" }}>
            <p className="text-2xl font-bold text-[#5A8A6A]" style={{ fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>{grouped.safety.length}</p>
            <p className="text-xs" style={{ color: "#8A8A8A" }}>保底 Safety</p>
          </div>
        </div>
      )}

      {/* List balance alerts */}
      {recs?.list_balance?.alerts?.map((alert, i) => (
        <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="mb-0.5 mr-1.5 inline h-4 w-4" />{alert}
        </div>
      ))}

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center" style={{ color: "#8A8A8A" }}>
          <GraduationCap className="mx-auto mb-3 h-8 w-8 animate-pulse" style={{ color: "#B87333" }} />
          正在匹配项目...
        </div>
      )}

      {/* Program recommendations by type – card carousel */}
      {!loading && recs && (
        <>
          {(["reach", "target", "safety"] as const).map((type) => (
            <ProgramCardCarousel key={type} programs={grouped[type]} type={type} />
          ))}
        </>
      )}

      {!loading && recs && recs.recommendations.length === 0 && (
        <Card className="rounded-2xl border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <CardContent className="py-12 text-center" style={{ color: "#8A8A8A" }}>
            暂无匹配项目。请检查目的地选择或调整筛选条件。
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  )
}

// ── Main Form ────────────────────────────────────────────────────────────────

export default function MasterAssessmentForm() {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [result, setResult] = useState<AssessmentResult | null>(null)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive destination selections from A3 answer
  const selectedDestinations = useMemo(() => {
    const a3 = answers["A3"]
    if (Array.isArray(a3)) return a3 as string[]
    if (typeof a3 === "string") return [a3]
    return []
  }, [answers])

  // Detect academic track from A1 answer
  const isAcademic = answers["A1"] === "d" || answers["D_drive"] === "academic"

  // Build the question list for each module, with E being dynamic
  const moduleQuestions = useMemo(() => {
    const map: Record<string, V3Question[]> = {}
    for (const mid of MODULE_IDS) {
      if (mid === "E") {
        map[mid] = selectedDestinations.length > 0
          ? (getDestinationQuestions(selectedDestinations) as V3Question[])
          : (getModuleQuestions("E") as V3Question[])
      } else if (mid === "D") {
        map[mid] = getModuleQuestionsWithTrack("D", isAcademic) as V3Question[]
      } else {
        map[mid] = getModuleQuestions(mid) as V3Question[]
      }
    }
    return map
  }, [selectedDestinations, isAcademic])

  // Flat list of ALL questions across all modules
  const flatQuestions = useMemo(() => {
    return MODULE_IDS.flatMap((mid) => moduleQuestions[mid] ?? [])
  }, [moduleQuestions])

  const currentQ = flatQuestions[currentQuestionIdx]
  const currentModule = currentQ?.module

  const topRef = useRef<HTMLDivElement>(null)

  const isAnswered = useCallback((qid: string): boolean => {
    const a = answers[qid]
    if (a === undefined || a === null) return false
    if (Array.isArray(a)) return a.length > 0
    if (typeof a === "string") return a !== ""
    return true
  }, [answers])

  // Jump to first unanswered question in module; fall back to first question if all answered
  const goToModule = useCallback((moduleIdx: number) => {
    const mid = MODULE_IDS[moduleIdx]
    const firstUnanswered = flatQuestions.findIndex(q => q.module === mid && !isAnswered(q.id))
    const target = firstUnanswered >= 0
      ? firstUnanswered
      : flatQuestions.findIndex(q => q.module === mid)
    if (target >= 0) {
      setCurrentQuestionIdx(target)
      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [flatQuestions, isAnswered])

  // Jump to first unanswered question across all modules (for "X 题未完成" button)
  const goToFirstUnanswered = useCallback(() => {
    const idx = flatQuestions.findIndex(q => !isAnswered(q.id))
    if (idx >= 0) {
      setCurrentQuestionIdx(idx)
      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [flatQuestions, isAnswered])

  const goToQuestion = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, flatQuestions.length - 1))
    setCurrentQuestionIdx(clamped)
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [flatQuestions.length])

  const totalQuestions = flatQuestions.length

  const answeredCount = useMemo(() => {
    return flatQuestions.filter((q) => {
      const a = answers[q.id]
      if (a === undefined || a === null) return false
      if (Array.isArray(a)) return a.length > 0
      if (typeof a === "string") return a !== ""
      return true // number
    }).length
  }, [flatQuestions, answers])

  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const canSubmit = answeredCount === totalQuestions && totalQuestions > 0
  const isLastQuestion = currentQuestionIdx === flatQuestions.length - 1

  // Budget-destination warning
  const budgetWarning = useMemo(() => {
    const budget = answers["B5"]
    const destinations = Array.isArray(answers["A3"]) ? answers["A3"] as string[] : []
    if ((budget === "d" || budget === "e") && (destinations.includes("US") || destinations.includes("UK"))) {
      const overBudget: string[] = []
      if (destinations.includes("US")) overBudget.push("美国")
      if (destinations.includes("UK")) overBudget.push("英国")
      return `提示：你的预算（${budget === "d" ? "30万以下" : "需要奖学金"}）下，${overBudget.join("和")}的大部分项目可能超出预算。系统仍会匹配，但推荐结果可能偏少。`
    }
    return null
  }, [answers])

  // Show budget warning on A3 or B5 questions
  const showBudgetWarning = budgetWarning && currentQ && (currentQ.id === "A3" || currentQ.id === "B5")

  // ── Load draft ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const userId = getUserId()
        const res = await fetch("/api/v1/assessments/me", {
          headers: { "X-User-Id": userId },
        })
        if (res.ok) {
          const data = await res.json()
          // Backend may return answers as "answers" (from PUT) or "raw_answers" (from GET model)
          const savedAnswers = data.answers ?? data.raw_answers
          if (savedAnswers && typeof savedAnswers === "object" && Object.keys(savedAnswers).length > 0) {
            setAnswers(savedAnswers as Record<string, AnswerValue>)
          }
          if (data.status === "submitted" && data.decision_profile_summary) {
            setResult({
              decision_profile: data.decision_profile_summary,
              conflicts: data.conflicts ?? [],
              hidden_risks: data.hidden_risks ?? [],
              risk_profile: data.risk_profile ?? "",
              application_mix: data.application_mix ?? { reach: 30, target: 40, safety: 30 },
            })
          }
        }
      } catch {
        // no draft
      } finally {
        setIsBootstrapping(false)
      }
    }
    void load()
  }, [])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    }
  }, [])

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const scheduleSave = useCallback((nextAnswers: Record<string, AnswerValue>) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

    const hasAny = Object.keys(nextAnswers).length > 0
    if (!hasAny) {
      setAutoSaveStatus("idle")
      return
    }

    setAutoSaveStatus("saving")
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const userId = getUserId()
        await fetch("/api/v1/assessments/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-User-Id": userId },
          body: JSON.stringify({ answers: nextAnswers, status: "draft" }),
        })
        setAutoSaveStatus("saved")
      } catch {
        setAutoSaveStatus("idle")
      }
    }, 1200)
  }, [])

  // ── Set answer (with auto-advance for single/tradeoff) ─────────────────────
  const setAnswer = useCallback(
    (questionId: string, value: AnswerValue) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: value }
        // Reset B2 GPA value when B2_scale changes (range changes)
        if (questionId === "B2_scale") {
          delete next["B2"]
        }
        scheduleSave(next)
        return next
      })
      // Auto-advance for single-answer questions
      const q = flatQuestions[currentQuestionIdx]
      if (q && (q.type === "single" || q.type === "tradeoff")) {
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
        autoAdvanceTimer.current = setTimeout(() => {
          setCurrentQuestionIdx((prev) => Math.min(prev + 1, flatQuestions.length - 1))
          requestAnimationFrame(() => {
            topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          })
        }, 300)
      }
    },
    [scheduleSave, flatQuestions, currentQuestionIdx],
  )

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async () => {
    setIsSubmitting(true)
    try {
      const userId = getUserId()
      // Backend expects: {answers: {A1: "a", B2: 3.6, ...}, status: "submitted"}
      const res = await fetch("/api/v1/assessments/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body: JSON.stringify({ answers, status: "submitted" }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data as AssessmentResult)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const err = await res.text()
        console.error("Submit failed:", res.status, err)
        alert(`提交失败: ${res.status}`)
      }
    } catch (e) {
      console.error("Submit error:", e)
      alert("提交出错，请检查后端是否运行")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Keyboard nav ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Number keys 1-9 for single/tradeoff quick select on current question
      if (e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1
        const q = flatQuestions[currentQuestionIdx]
        if (q && (q.type === "single" || q.type === "tradeoff") && q.options && q.options[idx]) {
          setAnswer(q.id, q.options[idx].value)
        }
        return
      }

      // Left/Right arrows for prev/next question
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToQuestion(currentQuestionIdx - 1)
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        goToQuestion(currentQuestionIdx + 1)
        return
      }

      if (e.key === "Enter") {
        e.preventDefault()
        if (isLastQuestion && canSubmit && !isSubmitting) {
          void submit()
        } else {
          goToQuestion(currentQuestionIdx + 1)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIdx, flatQuestions, canSubmit, isSubmitting, isLastQuestion])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (result) {
    return (
      <ResultCard
        result={result}
        onRestart={async () => {
          const userId = getUserId()
          try {
            await fetch("/api/v1/assessments/me", {
              method: "PUT",
              headers: { "Content-Type": "application/json", "X-User-Id": userId },
              body: JSON.stringify({ answers: {}, status: "draft" }),
            })
          } catch { /* ignore */ }
          setResult(null)
          setAnswers({})
          setCurrentQuestionIdx(0)
        }}
      />
    )
  }

  if (isBootstrapping) {
    return <div className="p-8 text-center" style={{ color: "#8A8A8A", background: "#FAF8F5", minHeight: "100vh" }}>正在加载测评草稿...</div>
  }

  return (
    <div style={{ background: "#FAF8F5", minHeight: "100vh", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")` }}>
    <div className="mx-auto max-w-4xl space-y-6 pb-20 pt-8 px-4">
      <div ref={topRef} />
      {/* Auto-save banner */}
      <div className="flex items-center gap-2 py-2 text-sm" style={{ color: "#8A8A8A" }}>
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#B87333" }} />
        {autoSaveStatus === "saving"
          ? "正在自动保存当前作答..."
          : "已自动保存，可随时退出，下次回来继续作答"}
      </div>

      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: "#0A0A0A", fontFamily: "var(--font-dm-serif, Georgia, serif)" }}>
          选校决策测评
        </h1>
        <p className="max-w-xl text-[15px] leading-7" style={{ color: "#4A4A4A" }}>
          共 {totalQuestions} 题，6 个模块，按照直觉作答即可。
        </p>
        <p className="text-xs" style={{ color: "#8A8A8A" }}>
          <kbd className="rounded border border-[#E8E4DE] px-1.5 py-0.5 font-mono text-[11px]" style={{ background: "#FFFFFF" }}>1-9</kbd>
          {" 快选　"}
          <kbd className="rounded border border-[#E8E4DE] px-1.5 py-0.5 font-mono text-[11px]" style={{ background: "#FFFFFF" }}>←→</kbd>
          {" 切题　"}
          <kbd className="rounded border border-[#E8E4DE] px-1.5 py-0.5 font-mono text-[11px]" style={{ background: "#FFFFFF" }}>Enter</kbd>
          {" 下一题"}
        </p>
      </div>

      {/* Progress card with module tabs */}
      <Card className="rounded-2xl border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium" style={{ color: "#0A0A0A", fontFamily: "var(--font-dm-serif, Georgia, serif)" }}>作答进度</CardTitle>
            <span className="text-sm tabular-nums" style={{ color: "#8A8A8A", fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>
              {answeredCount} / {totalQuestions}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="h-1.5 w-full rounded-full" style={{ background: "#E8E4DE" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "#B87333" }} />
          </div>
          {/* Module tabs as progress indicator — clickable to jump */}
          <div className="flex flex-wrap gap-2">
            {MODULE_IDS.map((mid, idx) => {
              const mQuestions = moduleQuestions[mid] ?? []
              const mAnswered = mQuestions.filter((q) => {
                const a = answers[q.id]
                if (a === undefined || a === null) return false
                if (Array.isArray(a)) return a.length > 0
                if (typeof a === "string") return a !== ""
                return true
              }).length
              const isCurrent = currentModule === mid
              const isDone = mAnswered === mQuestions.length && mQuestions.length > 0

              return (
                <button
                  key={mid}
                  onClick={() => goToModule(idx)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isCurrent
                      ? "text-[#0A0A0A]"
                      : "text-[#8A8A8A] hover:text-[#4A4A4A]"
                  }`}
                  style={isCurrent ? { borderBottom: "2px solid #B87333", background: "#FBF7F2" } : { borderBottom: "2px solid transparent" }}
                >
                  {isDone && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#5A8A6A" }} />}
                  {MODULE_LABELS[mid]}
                  <span className="text-xs opacity-60" style={{ fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>{mAnswered}/{mQuestions.length}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Single question card */}
      {flatQuestions.length === 0 ? (
        <Card className="rounded-2xl border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <CardContent className="py-12 text-center" style={{ color: "#8A8A8A" }}>
            暂无题目可显示。请检查测评配置。
          </CardContent>
        </Card>
      ) : !currentQ ? (
        <Card className="rounded-2xl border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <CardContent className="py-12 text-center" style={{ color: "#8A8A8A" }}>
            题目加载中...
          </CardContent>
        </Card>
      ) : (
        <Card key={currentQ.id} id={`q-${currentQ.id}`} className="rounded-2xl border-[#E8E4DE]" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold text-white" style={{ background: "#B87333" }}>
                {currentQ.module} {MODULE_LABELS[currentQ.module]}
              </span>
              <span style={{ color: "#B87333", fontFamily: "var(--font-dm-mono, ui-monospace, monospace)" }}>第 {currentQuestionIdx + 1} / {totalQuestions} 题</span>
            </div>
            <CardTitle className="max-w-3xl pt-2 text-2xl leading-10 md:text-3xl" style={{ color: "#0A0A0A", fontFamily: "var(--font-dm-serif, Georgia, serif)" }}>
              {currentQ.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQ.type === "single" && (
              <SingleChoice
                question={currentQ}
                value={answers[currentQ.id] as string | undefined}
                onChange={(v) => setAnswer(currentQ.id, v)}
              />
            )}
            {currentQ.type === "multi" && (
              <MultiChoice
                question={currentQ}
                value={Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : []}
                onChange={(v) => setAnswer(currentQ.id, v)}
              />
            )}
            {currentQ.type === "slider" && (
              <SliderQuestion
                question={currentQ}
                value={typeof answers[currentQ.id] === "number" ? (answers[currentQ.id] as number) : undefined}
                onChange={(v) => setAnswer(currentQ.id, v)}
                overrideConfig={
                  currentQ.id === "B2"
                    ? answers["B2_scale"] === "5.0"
                      ? { min: 2.0, max: 5.0, step: 0.1 }
                      : answers["B2_scale"] === "100"
                        ? { min: 60, max: 100, step: 1 }
                        : { min: 2.0, max: 4.0, step: 0.1 }
                    : undefined
                }
              />
            )}
            {currentQ.type === "tradeoff" && (
              <TradeoffChoice
                question={currentQ}
                value={answers[currentQ.id] as string | undefined}
                onChange={(v) => setAnswer(currentQ.id, v)}
              />
            )}
            {currentQ.type === "two_level" && (
              <TwoLevelChoice
                question={currentQ}
                value={Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : []}
                onChange={(v) => setAnswer(currentQ.id, v)}
              />
            )}

            {/* Budget-destination warning shown inline on A3 / B5 */}
            {showBudgetWarning && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                <AlertTriangle className="mb-0.5 mr-1.5 inline h-4 w-4" />
                {budgetWarning}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion prompt */}
      {canSubmit && !isLastQuestion && (
        <div className="rounded-xl border border-[#5A8A6A]/30 px-4 py-3 text-sm" style={{ background: "rgba(90,138,106,0.08)", color: "#5A8A6A" }}>
          <CheckCircle2 className="mb-0.5 mr-1.5 inline h-4 w-4" />
          全部题目已作答完毕！
          <button
            className="ml-2 text-sm font-medium underline"
            style={{ color: "#5A8A6A" }}
            onClick={() => goToQuestion(flatQuestions.length - 1)}
          >
            去提交
          </button>
        </div>
      )}

      {/* Navigation: prev / next question */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => goToQuestion(currentQuestionIdx - 1)}
          disabled={currentQuestionIdx === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40"
          style={{ borderColor: "#E8E4DE", color: "#4A4A4A", background: "transparent" }}
        >
          <ChevronLeft className="h-4 w-4" />
          上一题
        </button>
        <div className="flex gap-3">
          {isLastQuestion ? (
            <button
              onClick={() => (canSubmit ? void submit() : goToFirstUnanswered())}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40"
              style={{ background: "#0A0A0A", color: "#FAF8F5" }}
              title={!canSubmit ? "点击跳到第一道未完成的题" : undefined}
            >
              {isSubmitting
                ? "提交中..."
                : canSubmit
                  ? "提交测评 →"
                  : `还有 ${totalQuestions - answeredCount} 题未完成 →`}
            </button>
          ) : (
            <button
              onClick={() => goToQuestion(currentQuestionIdx + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-medium transition-all duration-200"
              style={{ background: "#0A0A0A", color: "#FAF8F5" }}
            >
              下一题
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
