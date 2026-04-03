"use client"

import Link from "next/link"
import { GraduationCap, ArrowRight, Target, BookOpen, TrendingUp, Users, CheckCircle2 } from "lucide-react"
import { useHealth } from "@/hooks/use-health"

const features = [
  { icon: Target,    title: "智能项目匹配", desc: "基于AI算法，根据您的背景精准推荐硕士项目", accent: "#0052FF" },
  { icon: BookOpen,  title: "先修课分析",   desc: "分析您与目标项目的先修课匹配度，避免申请坑点", accent: "#0052FF" },
  { icon: TrendingUp, title: "职业路径规划", desc: "清晰展示项目就业去向，匹配您的职业目标", accent: "#4D7CFF" },
  { icon: Users,     title: "申请进度追踪", desc: "一站式管理您的硕士申请全流程", accent: "#4D7CFF" },
]

const steps = [
  { n: "01", title: "完成硕士专属测评", desc: "完成大五人格精简版与选校偏好测评，生成初始策略权重" },
  { n: "02", title: "完善硕士档案",     desc: "补充 GPA、先修课、经历与偏好，让推荐引擎更精准" },
  { n: "03", title: "AI智能匹配决策",   desc: "查看项目详情、就业数据、费用分析，做出明智选择" },
]

export default function LandingMinimal() {
  const { connected, loading, data } = useHealth()

  return (
    <div style={{ background: "#FAFAFA", minHeight: "100vh", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}>

      {/* Nav */}
      <nav style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #0052FF, #4D7CFF)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap style={{ color: "#fff", width: 20, height: 20 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#0F172A", letterSpacing: "-0.01em" }}>Optima</span>
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-geist-mono, monospace)", letterSpacing: "0.1em", textTransform: "uppercase" }}>v1.0</span>
          </div>
          <Link href="/onboarding" style={{ background: "linear-gradient(to right, #0052FF, #4D7CFF)", color: "#fff", padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px rgba(0,82,255,0.25)", transition: "all 0.2s" }}>
            开始使用 <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1152, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center" }}>
          <div>
            {/* Section badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(0,82,255,0.06)", border: "1px solid rgba(0,82,255,0.2)", borderRadius: 999, padding: "6px 16px", marginBottom: 28 }}>
              <span className="min-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#0052FF", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0052FF" }}>AI 驱动选校引擎</span>
            </div>

            <h1 className="font-calistoga" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 1.05, color: "#0F172A", margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              文商科硕士<br />
              <span className="gradient-text">智能选校</span>平台
            </h1>
            <p style={{ fontSize: 18, color: "#64748B", lineHeight: 1.7, maxWidth: 520, margin: "0 0 36px" }}>
              专为文商科背景设计的AI选校系统，基于真实数据匹配最适合您的硕士项目。
            </p>

            {/* Status */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 36, fontSize: 13 }}>
              {!loading && (
                connected ? (
                  <>
                    <span className="min-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    <span style={{ color: "#16a34a", fontWeight: 500 }}>后端 AI 引擎已连接</span>
                    {data && <span style={{ color: "#64748B" }}>· v{data.version}</span>}
                  </>
                ) : (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                    <span style={{ color: "#dc2626" }}>后端未连接</span>
                  </>
                )
              )}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/onboarding" style={{ background: "linear-gradient(to right, #0052FF, #4D7CFF)", color: "#fff", padding: "14px 28px", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 6px 20px rgba(0,82,255,0.38)" }}>
                <GraduationCap style={{ width: 18, height: 18 }} /> ★ 开始硕士专属测评 ★
              </Link>
              <Link href="/dashboard" style={{ background: "#fff", color: "#0F172A", padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <Target style={{ width: 18, height: 18 }} /> 查看项目匹配
              </Link>
            </div>
          </div>

          {/* Abstract graphic */}
          <div style={{ position: "relative", height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Rotating ring */}
            <div className="min-spin" style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", border: "1px dashed rgba(0,82,255,0.3)" }} />
            <div className="min-spin" style={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", border: "1px dashed rgba(77,124,255,0.25)", animationDirection: "reverse", animationDuration: "40s" }} />
            {/* Center gradient circle */}
            <div style={{ width: 160, height: 160, borderRadius: "50%", background: "linear-gradient(135deg, rgba(0,82,255,0.12), rgba(77,124,255,0.06))", border: "1px solid rgba(0,82,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #0052FF, #4D7CFF)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,82,255,0.4)" }}>
                <GraduationCap style={{ color: "#fff", width: 36, height: 36 }} />
              </div>
            </div>
            {/* Floating stat cards */}
            {[
              { label: "项目覆盖", value: "500+", top: 30,  left: 20,  delay: "0s" },
              { label: "匹配精度", value: "94%",  top: 60,  right: 10, delay: "0.8s" },
              { label: "申请成功", value: "87%",  bottom: 40, left: 30, delay: "1.6s" },
            ].map((c) => (
              <div key={c.label} className="min-float" style={{ position: "absolute", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "10px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", animationDelay: c.delay, top: c.top, left: c.left, right: c.right, bottom: c.bottom } as React.CSSProperties}>
                <p style={{ fontSize: 11, color: "#64748B", margin: 0 }}>{c.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0052FF", margin: 0 }}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,82,255,0.06)", border: "1px solid rgba(0,82,255,0.15)", borderRadius: 999, padding: "5px 14px", marginBottom: 16 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0052FF", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#0052FF" }}>核心功能</span>
            </div>
            <h2 className="font-calistoga" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", color: "#0F172A", margin: 0, letterSpacing: "-0.01em" }}>
              为什么选择 <span className="gradient-text">Optima</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {features.map((f) => (
              <div key={f.title} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28, cursor: "default", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,82,255,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${f.accent}, #4D7CFF)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: `0 4px 12px ${f.accent}40` }}>
                  <f.icon style={{ color: "#fff", width: 22, height: 22 }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", margin: "0 0 8px", letterSpacing: "-0.01em" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — dark inverted section */}
      <section style={{ background: "#0F172A", padding: "80px 24px", position: "relative", overflow: "hidden" }}>
        {/* Dot texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
        {/* Radial glow */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,82,255,0.15), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1152, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,82,255,0.15)", border: "1px solid rgba(0,82,255,0.3)", borderRadius: 999, padding: "5px 14px", marginBottom: 16 }}>
              <span className="min-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#4D7CFF", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4D7CFF" }}>快速开始</span>
            </div>
            <h2 className="font-calistoga" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", color: "#fff", margin: 0 }}>
              三步开始您的申请之旅
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {steps.map((step, i) => (
              <div key={step.n} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 32 }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: i === 0 ? "#4D7CFF" : "rgba(255,255,255,0.1)", fontFamily: "var(--font-geist-sans, sans-serif)", marginBottom: 16, letterSpacing: "-0.02em" }}>{step.n}</div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: "0 0 10px" }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 24, padding: "56px 40px", boxShadow: "0 8px 40px rgba(0,82,255,0.08)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #0052FF, #4D7CFF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 24px rgba(0,82,255,0.35)" }}>
            <CheckCircle2 style={{ color: "#fff", width: 28, height: 28 }} />
          </div>
          <h2 className="font-calistoga" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "#0F172A", margin: "0 0 14px" }}>准备好开始了吗？</h2>
          <p style={{ fontSize: 15, color: "#64748B", margin: "0 0 32px", lineHeight: 1.65 }}>立即创建您的硕士申请档案，获得专属 AI 推荐</p>
          <Link href="/onboarding" style={{ background: "linear-gradient(to right, #0052FF, #4D7CFF)", color: "#fff", padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 6px 20px rgba(0,82,255,0.38)" }}>
            ★ 开始硕士专属测评 ★ <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #E2E8F0", background: "#fff", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 4px" }}>© 2026 Optima — 文商科硕士智能选校平台</p>
        <p style={{ color: "#94A3B8", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)", margin: 0 }}>数据基于 IPEDS/NCES 官方数据库，匹配算法持续优化中</p>
      </footer>
    </div>
  )
}
