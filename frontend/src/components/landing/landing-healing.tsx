"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { GraduationCap, ArrowRight, Target, BookOpen, TrendingUp, CheckCircle2, Compass } from "lucide-react"
import { useHealth } from "@/hooks/use-health"

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Compass,
    title: "智能项目匹配",
    desc: "基于你的 GPA、先修课、实习经历，精准推荐最适合的硕士项目",
    accent: "hsl(36,28%,68%)",
  },
  {
    icon: BookOpen,
    title: "先修课匹配分析",
    desc: "深度对比你与目标项目的先修课缺口，避开申请雷区",
    accent: "hsl(150,32%,33%)",
  },
  {
    icon: TrendingUp,
    title: "职业路径可视化",
    desc: "清晰展示每个项目的就业去向与薪资分布，选择更有把握",
    accent: "hsl(45,45%,55%)",
  },
  {
    icon: Target,
    title: "申请全流程追踪",
    desc: "梦校 / 目标校 / 保底校三档管理，进度一目了然",
    accent: "hsl(0,52%,55%)",
  },
]

const steps = [
  {
    n: "一",
    title: "完成硕士专属测评",
    desc: "大五人格简版 + 选校偏好，生成你的专属策略权重，只需 5 分钟",
    emoji: "✍️",
  },
  {
    n: "二",
    title: "完善申请档案",
    desc: "填写 GPA、先修课程、实习科研和职业目标，让推荐引擎更精准",
    emoji: "📋",
  },
  {
    n: "三",
    title: "获取 AI 匹配结果",
    desc: "查看项目详情、先修课缺口分析、就业数据，做出明智决策",
    emoji: "🎯",
  },
]

// ── Hand-drawn SVG decorative elements ───────────────────────────────────────

function WavyDivider() {
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: "100%", height: 40, display: "block" }}>
      <defs>
        <filter id="wavy-rough">
          <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2" />
        </filter>
      </defs>
      <path
        d="M0 20 Q150 5 300 20 Q450 35 600 20 Q750 5 900 20 Q1050 35 1200 20 L1200 40 L0 40 Z"
        fill="hsl(40,30%,97%)"
        filter="url(#wavy-rough)"
      />
    </svg>
  )
}

function HandDrawnCircle({ size = 200, color = "hsl(36,28%,72%)", opacity = 0.25 }: {
  size?: number; color?: string; opacity?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <filter id="circle-rough">
          <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="3" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
      </defs>
      <circle
        cx="50" cy="50" r="44"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity={opacity}
        filter="url(#circle-rough)"
        strokeDasharray="6 4"
      />
    </svg>
  )
}

function ScatterDots() {
  const dots = [
    { cx: 15, cy: 25, r: 3, color: "hsl(36,28%,68%)" },
    { cx: 40, cy: 10, r: 2, color: "hsl(150,28%,50%)" },
    { cx: 70, cy: 30, r: 4, color: "hsl(45,40%,62%)" },
    { cx: 85, cy: 15, r: 2, color: "hsl(0,45%,62%)" },
    { cx: 25, cy: 55, r: 3, color: "hsl(150,28%,50%)" },
    { cx: 60, cy: 65, r: 2, color: "hsl(36,28%,68%)" },
    { cx: 90, cy: 50, r: 3, color: "hsl(45,40%,62%)" },
  ]
  return (
    <svg viewBox="0 0 100 80" style={{ position: "absolute", width: "100%", height: "100%", pointerEvents: "none", opacity: 0.55 }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.color} opacity={0.6} />
      ))}
    </svg>
  )
}

// ── Intersection Observer hook ────────────────────────────────────────────────

function useEntryAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ── Components ────────────────────────────────────────────────────────────────

function FeatureCard({ feature }: { feature: typeof features[number] }) {
  const ref = useEntryAnimation()
  return (
    <div
      ref={ref}
      className="healing-entry"
      style={{
        background: "hsl(40,30%,97%)",
        border: "1px solid hsl(38,20%,87%)",
        borderRadius: 24,
        padding: 28,
        transition: "transform 0.35s ease, box-shadow 0.35s ease",
        boxShadow: "0 4px 20px hsla(36,20%,40%,0.07)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = "translateY(-4px)"
        el.style.boxShadow = "0 10px 32px hsla(36,20%,40%,0.14)"
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = "translateY(0)"
        el.style.boxShadow = "0 4px 20px hsla(36,20%,40%,0.07)"
      }}
    >
      {/* Soft tinted corner blob */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        borderRadius: "50%", background: feature.accent, opacity: 0.08,
        pointerEvents: "none",
      }} />
      <div
        style={{
          width: 48, height: 48, borderRadius: 16,
          background: `${feature.accent}18`,
          border: `1px solid ${feature.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <feature.icon style={{ width: 22, height: 22, color: feature.accent }} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: "hsl(0,0%,18%)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
        {feature.title}
      </h3>
      <p style={{ fontSize: 13, color: "hsl(0,0%,52%)", lineHeight: 1.7, margin: 0 }}>
        {feature.desc}
      </p>
    </div>
  )
}

function StepCard({ step, index }: { step: typeof steps[number]; index: number }) {
  const ref = useEntryAnimation()
  return (
    <div
      ref={ref}
      className="healing-entry"
      style={{
        background: "hsla(40,30%,97%,0.06)",
        border: "1px solid hsla(38,30%,85%,0.18)",
        borderRadius: 24,
        padding: 32,
        backdropFilter: "blur(12px)",
        transitionDelay: `${index * 0.1}s`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>{step.emoji}</span>
        <span
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: 36,
            color: index === 0 ? "hsl(36,28%,72%)" : "hsla(38,30%,85%,0.3)",
            lineHeight: 1,
          }}
        >
          {step.n}
        </span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: "hsl(38,30%,90%)", margin: "0 0 10px" }}>
        {step.title}
      </h3>
      <p style={{ fontSize: 13, color: "hsla(38,20%,80%,0.65)", lineHeight: 1.7, margin: 0 }}>
        {step.desc}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingHealing() {
  const { connected, loading, data } = useHealth()
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const heroRef = useRef<HTMLDivElement>(null)
  const ctaRef  = useEntryAnimation()

  // Mousemove spotlight on hero
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const handler = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect()
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top)  / rect.height) * 100,
      })
    }
    hero.addEventListener("mousemove", handler)
    return () => hero.removeEventListener("mousemove", handler)
  }, [])

  return (
    <div style={{
      background: "hsl(40,30%,97%)",
      minHeight: "100vh",
      fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
    }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        background: "rgba(250,247,241,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid hsl(38,20%,88%)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1152, margin: "0 auto", padding: "0 24px", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: "hsl(36,28%,68%)",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 12px hsla(36,28%,50%,0.25)",
            }}>
              <GraduationCap style={{ color: "hsl(0,0%,15%)", width: 20, height: 20 }} />
            </div>
            <span style={{
              fontFamily: "var(--font-caveat), cursive",
              fontWeight: 700, fontSize: 22,
              color: "hsl(0,0%,18%)",
              letterSpacing: "0.01em",
            }}>Optima</span>
          </div>
          <Link
            href="/onboarding"
            className="healing-border-beam"
            style={{
              background: "hsl(36,28%,68%)",
              color: "hsl(0,0%,15%)",
              padding: "9px 22px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 12px hsla(36,28%,50%,0.28)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 18px hsla(36,28%,50%,0.38)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 12px hsla(36,28%,50%,0.28)"
            }}
          >
            开始使用 <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        style={{
          maxWidth: 1152, margin: "0 auto", padding: "96px 24px 80px",
          position: "relative",
        }}
      >
        {/* Spotlight overlay */}
        <div
          className="healing-spotlight"
          style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, borderRadius: 32,
            "--mx": `${mousePos.x}%`,
            "--my": `${mousePos.y}%`,
          } as React.CSSProperties}
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 64,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}>
          {/* Left copy */}
          <div>
            {/* Status badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "hsla(150,32%,33%,0.08)",
              border: "1px solid hsla(150,32%,33%,0.2)",
              borderRadius: 999,
              padding: "6px 16px",
              marginBottom: 28,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "hsl(150,32%,40%)",
                display: "inline-block",
                boxShadow: "0 0 0 3px hsla(150,32%,40%,0.2)",
              }} />
              <span style={{
                fontFamily: "var(--font-geist-sans, sans-serif)",
                fontSize: 11, letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "hsl(150,32%,33%)",
              }}>文商科 AI 选校引擎</span>
            </div>

            <h1 style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "clamp(2.8rem, 5.5vw, 5rem)",
              lineHeight: 1.1,
              color: "hsl(0,0%,15%)",
              margin: "0 0 20px",
              letterSpacing: "0.01em",
            }}>
              文商科硕士
              <br />
              <span style={{ color: "hsl(36,28%,52%)" }}>智能选校</span>
              <span style={{ color: "hsl(0,0%,15%)" }}> 平台</span>
            </h1>

            <p style={{
              fontSize: 17, color: "hsl(0,0%,45%)",
              lineHeight: 1.75, maxWidth: 500,
              margin: "0 0 32px",
              fontFamily: "var(--font-geist-sans, sans-serif)",
            }}>
              专为文商科背景设计的 AI 选校系统，基于真实数据精准匹配最适合你的硕士项目。
            </p>

            {/* Server status */}
            {!loading && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                marginBottom: 32, fontSize: 13,
                color: connected ? "hsl(150,32%,33%)" : "hsl(0,52%,50%)",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: connected ? "hsl(150,32%,40%)" : "hsl(0,52%,55%)",
                  display: "inline-block",
                }} />
                {connected
                  ? <><span style={{ fontWeight: 500 }}>AI 引擎已就绪</span>{data && <span style={{ color: "hsl(0,0%,55%)" }}>· v{data.version}</span>}</>
                  : <span>AI 引擎未连接</span>
                }
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <Link
                href="/onboarding"
                className="healing-border-beam"
                style={{
                  background: "hsl(36,28%,68%)",
                  color: "hsl(0,0%,12%)",
                  padding: "14px 28px",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 6px 22px hsla(36,28%,50%,0.32)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"
                  ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 10px 30px hsla(36,28%,50%,0.42)"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"
                  ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 22px hsla(36,28%,50%,0.32)"
                }}
              >
                <GraduationCap style={{ width: 18, height: 18 }} />
                开始硕士专属测评
              </Link>
              <Link
                href="/dashboard"
                style={{
                  background: "transparent",
                  color: "hsl(0,0%,30%)",
                  padding: "14px 28px",
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid hsl(38,20%,85%)",
                  transition: "border-color 0.2s ease, background 0.2s ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "hsla(36,28%,68%,0.08)"
                  ;(e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(36,28%,68%)"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent"
                  ;(e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(38,20%,85%)"
                }}
              >
                查看项目匹配 <ArrowRight style={{ width: 15, height: 15 }} />
              </Link>
            </div>
          </div>

          {/* Right visual — abstract warm orbit */}
          <div style={{ position: "relative", height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Scatter dots background */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <ScatterDots />
            </div>

            {/* Rotating dashed rings */}
            <div style={{ position: "absolute" }}>
              <HandDrawnCircle size={320} color="hsl(36,28%,62%)" opacity={0.2} />
            </div>
            <div
              className="healing-float"
              style={{ position: "absolute", animationDuration: "45s", animationDirection: "reverse" }}
            >
              <HandDrawnCircle size={220} color="hsl(150,28%,45%)" opacity={0.18} />
            </div>

            {/* Center icon */}
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: "hsl(36,28%,68%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 36px hsla(36,28%,50%,0.30), 0 0 0 16px hsla(36,28%,68%,0.12)",
              position: "relative",
              zIndex: 2,
            }}>
              <GraduationCap style={{ color: "hsl(0,0%,12%)", width: 42, height: 42 }} />
            </div>

            {/* Floating stat cards */}
            {[
              { label: "项目覆盖", value: "500+", top: 40,  left: 18,  delay: "0s",   accent: "hsl(36,28%,68%)" },
              { label: "匹配精度", value: "94%",  top: 70,  right: 8,  delay: "0.9s", accent: "hsl(150,32%,40%)" },
              { label: "申请成功", value: "87%",  bottom: 50, left: 24, delay: "1.8s", accent: "hsl(45,40%,55%)" },
            ].map((c) => (
              <div
                key={c.label}
                className="healing-float"
                style={{
                  position: "absolute",
                  background: "rgba(255,252,246,0.95)",
                  border: "1px solid hsl(38,20%,86%)",
                  borderRadius: 16,
                  padding: "10px 18px",
                  boxShadow: "0 4px 20px hsla(36,20%,40%,0.10)",
                  animationDelay: c.delay,
                  top: c.top, left: c.left, right: c.right, bottom: c.bottom,
                  backdropFilter: "blur(8px)",
                } as React.CSSProperties}
              >
                <p style={{ fontSize: 11, color: "hsl(0,0%,55%)", margin: 0, fontFamily: "var(--font-geist-sans)" }}>
                  {c.label}
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: c.accent, margin: 0, fontFamily: "var(--font-caveat), cursive" }}>
                  {c.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wavy transition ──────────────────────────────────────────────────── */}
      <div style={{ background: "hsl(38,25%,94%)", marginTop: -1 }}>
        <WavyDivider />
      </div>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section style={{ background: "hsl(38,25%,94%)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: 15, color: "hsl(36,28%,52%)",
              letterSpacing: "0.05em",
              marginBottom: 10,
            }}>
              核心功能
            </p>
            <h2 style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "hsl(0,0%,15%)",
              margin: 0,
              letterSpacing: "0.01em",
            }}>
              为什么选择 Optima
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}>
            {features.map((f) => <FeatureCard key={f.title} feature={f} />)}
          </div>
        </div>
      </section>

      {/* ── How it works — warm dark section ────────────────────────────────── */}
      <section style={{
        background: "hsl(25,18%,18%)",
        padding: "80px 24px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle grain */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(hsla(38,30%,60%,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        {/* Warm glow */}
        <div style={{
          position: "absolute", top: -120, right: -80, width: 360, height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(36,28%,55%,0.12), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -60, width: 280, height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(150,28%,40%,0.09), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1152, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: 15, color: "hsl(36,28%,62%)",
              letterSpacing: "0.05em", marginBottom: 10,
            }}>
              快速开始
            </p>
            <h2 style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "hsl(38,25%,92%)",
              margin: 0,
              letterSpacing: "0.01em",
            }}>
              三步，开始你的申请之旅
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {steps.map((step, i) => <StepCard key={step.n} step={step} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── Marquee strip ───────────────────────────────────────────────────── */}
      <section style={{
        background: "hsl(38,25%,94%)",
        padding: "28px 0",
        overflow: "hidden",
        borderTop: "1px solid hsl(38,20%,88%)",
        borderBottom: "1px solid hsl(38,20%,88%)",
      }}>
        {/* Alpha mask on both sides */}
        <div style={{
          position: "relative",
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}>
          <div className="healing-marquee-track">
            {[...Array(2)].map((_, pass) =>
              ["MIT Sloan", "Yale SOM", "Columbia SIPA", "NYU Stern", "Cornell Tech", "Georgetown MSF",
               "USC Marshall", "BU Questrom", "UC Berkeley Haas", "UChicago Booth"].map((name) => (
                <span
                  key={`${pass}-${name}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "0 32px", whiteSpace: "nowrap",
                    fontFamily: "var(--font-caveat), cursive",
                    fontSize: 17,
                    color: "hsl(0,0%,40%)",
                  }}
                >
                  <span style={{ color: "hsl(36,28%,62%)", fontSize: 12 }}>✦</span>
                  {name}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 24px", background: "hsl(40,30%,97%)" }}>
        <div
          ref={ctaRef}
          className="healing-entry"
          style={{
            maxWidth: 620, margin: "0 auto", textAlign: "center",
            background: "rgba(255,252,246,0.9)",
            border: "1px solid hsl(38,20%,86%)",
            borderRadius: 32,
            padding: "56px 40px",
            boxShadow: "0 12px 48px hsla(36,20%,40%,0.10)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: "hsl(36,28%,68%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 28px hsla(36,28%,50%,0.30)",
          }}>
            <CheckCircle2 style={{ color: "hsl(0,0%,12%)", width: 28, height: 28 }} />
          </div>
          <h2 style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
            color: "hsl(0,0%,15%)",
            margin: "0 0 12px",
            letterSpacing: "0.01em",
          }}>
            准备好了吗？
          </h2>
          <p style={{
            fontSize: 15, color: "hsl(0,0%,48%)",
            margin: "0 0 32px", lineHeight: 1.7,
            fontFamily: "var(--font-geist-sans)",
          }}>
            立即创建硕士申请档案，获得专属 AI 推荐
          </p>
          <Link
            href="/onboarding"
            className="healing-border-beam"
            style={{
              background: "hsl(36,28%,68%)",
              color: "hsl(0,0%,12%)",
              padding: "15px 36px",
              borderRadius: 999,
              fontSize: 17,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 6px 24px hsla(36,28%,50%,0.32)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
              fontFamily: "var(--font-geist-sans)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 10px 32px hsla(36,28%,50%,0.42)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 24px hsla(36,28%,50%,0.32)"
            }}
          >
            开始硕士专属测评 <ArrowRight style={{ width: 17, height: 17 }} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid hsl(38,20%,88%)",
        background: "hsl(38,25%,94%)",
        padding: "32px 24px",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 24, height: 24,
            background: "hsl(36,28%,68%)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <GraduationCap style={{ color: "hsl(0,0%,12%)", width: 13, height: 13 }} />
          </div>
          <span style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: 17, color: "hsl(0,0%,30%)",
          }}>Optima</span>
        </div>
        <p style={{ color: "hsl(0,0%,55%)", fontSize: 13, margin: "0 0 4px", fontFamily: "var(--font-geist-sans)" }}>
          © 2026 Optima — 文商科硕士智能选校平台
        </p>
        <p style={{ color: "hsl(0,0%,65%)", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)", margin: 0 }}>
          数据基于 IPEDS / NCES 官方数据库，匹配算法持续优化中
        </p>
      </footer>
    </div>
  )
}
