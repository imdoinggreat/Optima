"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

import { SuccessModal } from "@/components/success-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getMyAssessment, saveMyAssessment, type MasterAssessmentPayload } from "@/lib/api"
import {
  ACADEMIC_HIGH_OPTION,
  buildAssessmentForTrack,
  CAREER_OPTION_B_HIGH,
  choiceToLikert,
  type BinaryChoice,
  type RenderedQuestion,
} from "@/lib/master-question-bank"

type ModuleKey = "academic" | "career"

const TRACK_STORAGE_KEY = "optima.intendedDirection"

function scoreToChoice(value: number | undefined, highOption: BinaryChoice = "B"): BinaryChoice | undefined {
  if (value === undefined || value === null) return undefined
  if (Number(value) >= 4) return highOption
  if (Number(value) <= 2) return highOption === "A" ? "B" : "A"
  return undefined
}

function buildPayload(
  academicQuestions: RenderedQuestion[],
  careerQuestions: RenderedQuestion[],
  academicAnswers: Record<string, BinaryChoice | undefined>,
  careerAnswers: Record<string, BinaryChoice | undefined>,
): MasterAssessmentPayload {
  const ipip_answers = Object.fromEntries(
    academicQuestions.map((q, idx) => {
      const highOption = ACADEMIC_HIGH_OPTION[idx] ?? "B"
      return [q.id, choiceToLikert(academicAnswers[q.id], highOption)]
    }),
  ) as Record<string, number>

  const preference_answers = Object.fromEntries(
    careerQuestions.map((q) => {
      const highOption = CAREER_OPTION_B_HIGH.has(q.id) ? "B" : "A"
      return [q.id, choiceToLikert(careerAnswers[q.id], highOption)]
    }),
  ) as Record<string, number>

  return { ipip_answers, preference_answers }
}

function ChoiceCard({
  option,
  label,
  selected,
  onSelect,
}: {
  option: BinaryChoice
  label: string
  selected: boolean
  onSelect: (option: BinaryChoice) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={`w-full rounded-2xl border p-6 text-left transition-all ${
        selected
          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {option}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {option === "A" ? "更接近我" : "我更倾向这一边"}
        </span>
      </div>
      <p className="text-[15px] leading-8 text-foreground">{label}</p>
    </button>
  )
}

export default function MasterAssessmentForm() {
  const router = useRouter()
  const [module, setModule] = useState<ModuleKey>("academic")
  const [academicIndex, setAcademicIndex] = useState(0)
  const [careerIndex, setCareerIndex] = useState(0)
  const [trackKey, setTrackKey] = useState<string | null>(null)
  const [academicAnswers, setAcademicAnswers] = useState<Record<string, BinaryChoice | undefined>>({})
  const [careerAnswers, setCareerAnswers] = useState<Record<string, BinaryChoice | undefined>>({})
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { academicQuestions, careerQuestions } = useMemo(
    () => buildAssessmentForTrack(trackKey),
    [trackKey],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TRACK_STORAGE_KEY)
      if (!raw) {
        setTrackKey(null)
        return
      }
      // Stored as JSON array (multi-select) — use the first selection as primary track
      try {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrackKey(String(parsed[0]))
          return
        }
      } catch {
        // Not JSON — treat as legacy single string
      }
      setTrackKey(raw)
    } catch {
      setTrackKey(null)
    }
  }, [])

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const data = await getMyAssessment()
        const { academicQuestions: aq, careerQuestions: cq } = buildAssessmentForTrack(null)
        const nextAcademic: Record<string, BinaryChoice | undefined> = {}
        const nextCareer: Record<string, BinaryChoice | undefined> = {}

        aq.forEach((q, idx) => {
          nextAcademic[q.id] = scoreToChoice(
            data.raw_answers?.ipip_answers?.[q.id],
            ACADEMIC_HIGH_OPTION[idx] ?? "B",
          )
        })
        cq.forEach((q) => {
          nextCareer[q.id] = scoreToChoice(
            data.raw_answers?.preference_answers?.[q.id],
            CAREER_OPTION_B_HIGH.has(q.id) ? "B" : "A",
          )
        })

        setAcademicAnswers(nextAcademic)
        setCareerAnswers(nextCareer)
      } catch {
        // No saved draft yet.
      } finally {
        setIsBootstrapping(false)
      }
    }

    void loadDraft()
  }, [])

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [])

  const scheduleSave = useCallback(
    (nextAcademic: Record<string, BinaryChoice | undefined>, nextCareer: Record<string, BinaryChoice | undefined>) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

      const hasAnyAnswer =
        Object.values(nextAcademic).some(Boolean) || Object.values(nextCareer).some(Boolean)

      if (!hasAnyAnswer) {
        setAutoSaveStatus("idle")
        return
      }

      setAutoSaveStatus("saving")
      autoSaveTimer.current = setTimeout(async () => {
        try {
          await saveMyAssessment({
            ...buildPayload(academicQuestions, careerQuestions, nextAcademic, nextCareer),
            status: "draft",
          })
          setAutoSaveStatus("saved")
        } catch {
          setAutoSaveStatus("idle")
        }
      }, 1200)
    },
    [academicQuestions, careerQuestions],
  )

  const setAcademicChoice = (questionId: string, choice: BinaryChoice) => {
    setAcademicAnswers((prev) => {
      const next = { ...prev, [questionId]: choice }
      scheduleSave(next, careerAnswers)
      return next
    })
  }

  const setCareerChoice = (questionId: string, choice: BinaryChoice) => {
    setCareerAnswers((prev) => {
      const next = { ...prev, [questionId]: choice }
      scheduleSave(academicAnswers, next)
      return next
    })
  }

  const answeredCount = useMemo(() => {
    return (
      Object.values(academicAnswers).filter(Boolean).length +
      Object.values(careerAnswers).filter(Boolean).length
    )
  }, [academicAnswers, careerAnswers])

  const totalQuestions = academicQuestions.length + careerQuestions.length
  const progress = Math.round((answeredCount / totalQuestions) * 100)

  const currentQuestion: RenderedQuestion =
    module === "academic" ? academicQuestions[academicIndex] : careerQuestions[careerIndex]
  const currentChoice =
    module === "academic"
      ? academicAnswers[currentQuestion.id]
      : careerAnswers[currentQuestion.id]
  const currentIndex = module === "academic" ? academicIndex : careerIndex
  const questionCount = module === "academic" ? academicQuestions.length : careerQuestions.length
  const canSubmit = answeredCount === totalQuestions

  const selectChoice = useCallback(
    (choice: BinaryChoice) => {
      if (module === "academic") setAcademicChoice(currentQuestion.id, choice)
      else setCareerChoice(currentQuestion.id, choice)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module, currentQuestion.id],
  )

  // Auto-advance after A/B selection (260ms delay so the selection highlight is visible)
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a stable ref to handleNext so the advance callback doesn't go stale
  const handleNextRef = useRef<() => void>(() => {})

  const selectChoiceAndAdvance = useCallback(
    (choice: BinaryChoice) => {
      selectChoice(choice)
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
      // Don't auto-advance on the very last question — let the user decide to submit
      const isLastQuestion = module === "career" && careerIndex === careerQuestions.length - 1
      if (!isLastQuestion) {
        autoAdvanceTimer.current = setTimeout(() => handleNextRef.current(), 260)
      }
    },
    [module, careerIndex, careerQuestions.length, selectChoice],
  )

  useEffect(() => {
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current) }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case "ArrowRight":
        case "Enter":
          e.preventDefault()
          if (module === "career" && careerIndex === careerQuestions.length - 1) {
            if (canSubmit && !isLoading) void submit()
          } else {
            handleNext()
          }
          break
        case "ArrowLeft":
          e.preventDefault()
          handlePrev()
          break
        case "a":
        case "A":
        case "1":
          e.preventDefault()
          selectChoiceAndAdvance("A")
          break
        case "b":
        case "B":
        case "2":
          e.preventDefault()
          selectChoiceAndAdvance("B")
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, academicIndex, careerIndex, canSubmit, isLoading, selectChoiceAndAdvance])

  const handleNext = () => {
    if (module === "academic") {
      if (academicIndex < academicQuestions.length - 1) {
        setAcademicIndex((prev) => prev + 1)
        return
      }
      setModule("career")
      return
    }

    if (careerIndex < careerQuestions.length - 1) {
      setCareerIndex((prev) => prev + 1)
    }
  }
  // Keep ref in sync so auto-advance always calls the latest version
  handleNextRef.current = handleNext

  const handlePrev = () => {
    if (module === "career" && careerIndex === 0) {
      setModule("academic")
      setAcademicIndex(academicQuestions.length - 1)
      return
    }

    if (module === "academic" && academicIndex > 0) {
      setAcademicIndex((prev) => prev - 1)
      return
    }

    if (module === "career" && careerIndex > 0) {
      setCareerIndex((prev) => prev - 1)
    }
  }

  const submit = async () => {
    setIsLoading(true)
    try {
      await saveMyAssessment({
        ...buildPayload(academicQuestions, careerQuestions, academicAnswers, careerAnswers),
        status: "submitted",
      })
      setSuccessModalOpen(true)
    } catch {
      setIsLoading(false)
      return
    }
    setIsLoading(false)
  }

  if (isBootstrapping) {
    return <div className="p-8 text-center text-muted-foreground">正在加载测评草稿…</div>
  }

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-8 pb-20">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
          {autoSaveStatus === "saving"
            ? "正在自动保存当前作答…"
            : "已自动保存，可随时退出，下次回来继续作答"}
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            硕士专属测评
          </h1>
          <p className="max-w-xl text-[15px] leading-7 text-muted-foreground">
            共 26 题，每题二选一，按照直觉作答即可。
          </p>
          <p className="text-xs text-muted-foreground/50">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">A</kbd>
            {" / "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">B</kbd>
            {" 选择　"}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">→</kbd>
            {" / "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>
            {" 下一题　"}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">←</kbd>
            {" 上一题"}
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-foreground">作答进度</CardTitle>
              <span className="text-sm text-muted-foreground tabular-nums">{answeredCount} / {totalQuestions}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Progress value={progress} className="h-1.5" />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={module === "academic" ? "default" : "outline"}
                onClick={() => setModule("academic")}
              >
                第一部分 · 12 题
              </Button>
              <Button
                size="sm"
                variant={module === "career" ? "default" : "outline"}
                onClick={() => setModule("career")}
              >
                第二部分 · 14 题
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(module === "academic" ? academicQuestions : careerQuestions).map((question, index) => {
                const answered =
                  module === "academic" ? academicAnswers[question.id] : careerAnswers[question.id]
                const isActive = index === currentIndex
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() =>
                      module === "academic" ? setAcademicIndex(index) : setCareerIndex(index)
                    }
                    className={`h-9 min-w-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : answered
                          ? "border-primary/30 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="space-y-4 pb-5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 tabular-nums">
              <span>{currentIndex + 1}</span>
              <span>/</span>
              <span>{questionCount}</span>
            </div>
            <CardTitle className="max-w-3xl text-2xl leading-10 md:text-[2rem]">
              {currentQuestion.renderedStem}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ChoiceCard
              option="A"
              label={currentQuestion.renderedOptionA}
              selected={currentChoice === "A"}
              onSelect={(choice) =>
                module === "academic"
                  ? setAcademicChoice(currentQuestion.id, choice)
                  : setCareerChoice(currentQuestion.id, choice)
              }
            />
            <ChoiceCard
              option="B"
              label={currentQuestion.renderedOptionB}
              selected={currentChoice === "B"}
              onSelect={(choice) =>
                module === "academic"
                  ? setAcademicChoice(currentQuestion.id, choice)
                  : setCareerChoice(currentQuestion.id, choice)
              }
            />
            <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={module === "academic" && academicIndex === 0}
              >
                上一题
              </Button>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row">
                {module === "career" && careerIndex === careerQuestions.length - 1 ? (
                  <Button onClick={() => void submit()} disabled={!canSubmit || isLoading}>
                    {isLoading ? "提交中…" : canSubmit ? "提交测评" : `请先完成全部 ${totalQuestions} 题`}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>下一题</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SuccessModal
        open={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false)
          router.push("/dashboard")
        }}
        primaryHref="/dashboard"
        title="测评数据上传完成 ✦"
        subtitle="你的专属选校报告正在生成，即将为你跳转结果页"
        primaryLabel="立即查看选校报告"
        secondaryLabel="稍后查看"
      />
    </>
  )
}
