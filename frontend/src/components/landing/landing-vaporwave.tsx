"use client"

import Link from "next/link"
import { GraduationCap, Target, BookOpen, TrendingUp, Users } from "lucide-react"
import { useHealth } from "@/hooks/use-health"

const features = [
  { icon: Target,     title: "SMART MATCH",     desc: "AI驱动的硕士项目精准匹配引擎", color: "#FF00FF" },
  { icon: BookOpen,   title: "PREREQ SCAN",     desc: "先修课匹配度量化分析系统",       color: "#00FFFF" },
  { icon: TrendingUp, title: "CAREER PATH",     desc: "就业去向与职业路径可视化",       color: "#FF9900" },
  { icon: Users,      title: "TRACK & MANAGE",  desc: "申请全流程一站式追踪管理",       color: "#FF00FF" },
]

function VwCard({ feature }: { feature: typeof features[number] }) {
  return (
    <div style={{ background: "rgba(26,16,60,0.8)", border: "1px solid rgba(255,0,255,0.25)", borderTop: `2px solid ${feature.color}`, padding: 24, backdropFilter: "blur(8px)", transition: "all 0.2s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${feature.color}40` }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none" }}
    >
      <div style={{ width: 44, height: 44, background: "transparent", border: `1px solid ${feature.color}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, transform: "rotate(45deg)", transition: "transform 0.2s" }}>
        <feature.icon style={{ color: feature.color, width: 20, height: 20, transform: "rotate(-45deg)", filter: `drop-shadow(0 0 4px ${feature.color})` }} />
      </div>
      <h3 style={{ fontFamily: "var(--font-orbitron, sans-serif)", fontSize: 12, fontWeight: 700, color: feature.color, margin: "0 0 8px", letterSpacing: "0.1em", textTransform: "uppercase", textShadow: `0 0 6px ${feature.color}` }}>{feature.title}</h3>
      <p style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 13, color: "rgba(224,224,224,0.75)", lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
    </div>
  )
}

export default function LandingVaporwave() {
  const { connected, loading, data } = useHealth()

  return (
    <div className="vw-scanlines" style={{ background: "#090014", minHeight: "100vh", position: "relative", overflow: "hidden" }}>

      {/* Floating sun */}
      <div style={{ position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", width: 360, height: 360, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(to bottom, #FF9900 0%, #FF00FF 60%)", opacity: 0.18, filter: "blur(2px)", position: "relative" }}>
          {/* Horizontal stripes cut */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 14px, #090014 14px, #090014 16px)", opacity: 1, top: "50%" }} />
        </div>
      </div>

      {/* Perspective grid floor */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "50vh", zIndex: 0, pointerEvents: "none" }}>
        <div className="vw-perspective-grid" style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,0,255,0.3)", background: "rgba(9,0,20,0.85)", backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <GraduationCap style={{ color: "#FF00FF", width: 24, height: 24, filter: "drop-shadow(0 0 6px #FF00FF)" }} />
            <span style={{ fontFamily: "var(--font-orbitron, sans-serif)", fontWeight: 900, fontSize: 16, color: "#E0E0E0", letterSpacing: "0.12em", textTransform: "uppercase" }}>OPTIMA</span>
            <span style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 10, color: "#FF00FF", letterSpacing: "0.1em" }}>v1.0</span>
          </div>
          <Link href="/onboarding"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #00FFFF", padding: "8px 18px", color: "#00FFFF", fontFamily: "var(--font-share-tech, monospace)", fontSize: 13, textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transform: "skewX(-12deg)", transition: "all 0.15s" }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "#00FFFF"; el.style.color = "#000"; el.style.transform = "skewX(0deg)"; el.style.boxShadow = "0 0 20px #00FFFF" }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = "#00FFFF"; el.style.transform = "skewX(-12deg)"; el.style.boxShadow = "none" }}
          >
            <span style={{ display: "inline-block", transform: "skewX(12deg)" }}>▶ INITIATE</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1152, margin: "0 auto", padding: "80px 24px 60px" }}>
        <div style={{ textAlign: "center" }}>
          {/* Accent bar */}
          <div style={{ display: "inline-block", height: 2, width: 60, background: "linear-gradient(to right, #FF9900, #FF00FF)", marginBottom: 20 }} />

          <h1 style={{ fontFamily: "var(--font-orbitron, sans-serif)", fontWeight: 900, color: "#E0E0E0", lineHeight: 1.05, margin: "0 0 8px" }}>
            <div style={{ fontSize: "clamp(1.4rem, 5vw, 3rem)", letterSpacing: "0.08em", textTransform: "uppercase" }}>MASTER&apos;S SELECTION</div>
            <div style={{ fontSize: "clamp(2rem, 8vw, 5.5rem)", background: "linear-gradient(to right, #FF9900, #FF00FF, #00FFFF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "-0.02em", filter: "drop-shadow(0 0 20px rgba(255,0,255,0.4))" }}>
              文商科 AI
            </div>
            <div style={{ fontSize: "clamp(1rem, 3vw, 1.8rem)", letterSpacing: "0.12em", color: "#00FFFF", textShadow: "0 0 12px #00FFFF", textTransform: "uppercase" }}>Intelligence Engine</div>
          </h1>

          <p style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 15, color: "rgba(224,224,224,0.65)", margin: "24px auto 32px", maxWidth: 560, lineHeight: 1.65 }}>
            &gt; 专为文商科背景设计的AI选校系统，基于真实数据匹配最适合您的硕士项目
          </p>

          {/* Status */}
          {!loading && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-share-tech, monospace)", fontSize: 12, marginBottom: 32, border: "1px solid rgba(0,255,255,0.2)", padding: "6px 14px", background: "rgba(0,255,255,0.05)" }}>
              <span className="pulse-glow-red" style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#00FFFF" : "#FF0000", display: "inline-block", boxShadow: connected ? "0 0 6px #00FFFF" : "0 0 6px #FF0000", animation: connected ? "vw-glow-pulse 2s ease-in-out infinite" : undefined }} />
              <span style={{ color: connected ? "#00FFFF" : "#FF0000", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                SYSTEM: {connected ? `CONNECTED${data ? ` · v${data.version}` : ""}` : "OFFLINE"}
              </span>
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/onboarding"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "2px solid #FF00FF", background: "#FF00FF", padding: "14px 28px", color: "#fff", fontFamily: "var(--font-share-tech, monospace)", fontSize: 14, textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", boxShadow: "0 0 20px rgba(255,0,255,0.5)", transform: "skewX(-12deg)", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "skewX(0deg) scale(1.04)"; e.currentTarget.style.boxShadow = "0 0 40px #FF00FF" }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "skewX(-12deg)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(255,0,255,0.5)" }}
            >
              <span style={{ transform: "skewX(12deg)", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties}>
                <GraduationCap style={{ width: 16, height: 16 }} /> 开始测评
              </span>
            </Link>
            <Link href="/dashboard"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #00FFFF", background: "transparent", padding: "14px 28px", color: "#00FFFF", fontFamily: "var(--font-share-tech, monospace)", fontSize: 14, textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", transform: "skewX(-12deg)", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,255,255,0.1)"; e.currentTarget.style.transform = "skewX(0deg)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(0,255,255,0.3)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "skewX(-12deg)"; e.currentTarget.style.boxShadow = "none" }}
            >
              <span style={{ transform: "skewX(12deg)", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties}>
                <Target style={{ width: 16, height: 16 }} /> 查看匹配
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1152, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-block", height: 2, width: 40, background: "linear-gradient(to right, #FF00FF, #00FFFF)", marginBottom: 12 }} />
          <h2 style={{ fontFamily: "var(--font-orbitron, sans-serif)", fontWeight: 700, fontSize: "clamp(1.2rem, 3vw, 2rem)", color: "#E0E0E0", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            CORE <span style={{ color: "#00FFFF", textShadow: "0 0 12px #00FFFF" }}>MODULES</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {features.map((f) => <VwCard key={f.title} feature={f} />)}
        </div>
      </section>

      {/* Stats — terminal green on black */}
      <section style={{ position: "relative", zIndex: 10, maxWidth: 1152, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ border: "2px solid #00FFFF", background: "rgba(0,0,0,0.8)", boxShadow: "0 0 30px rgba(0,255,255,0.15)", backdropFilter: "blur(8px)" }}>
          {/* Terminal title bar */}
          <div style={{ borderBottom: "1px solid #00FFFF", background: "rgba(0,255,255,0.08)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF00FF" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00FFFF" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF9900" }} />
            <span style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 11, color: "rgba(224,224,224,0.5)", marginLeft: 8, letterSpacing: "0.1em" }}>optima_stats.exe</span>
          </div>
          <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            {[
              { label: "PROGRAMS_INDEXED", value: "500+", color: "#FF00FF" },
              { label: "MATCH_ACCURACY",   value: "94%",  color: "#00FFFF" },
              { label: "SUCCESS_RATE",      value: "87%",  color: "#FF9900" },
              { label: "SYSTEM_STATUS",    value: connected ? "ONLINE" : "OFFLINE", color: connected ? "#00FF00" : "#FF0000" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 9, color: "rgba(224,224,224,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontFamily: "var(--font-orbitron, sans-serif)", fontSize: 28, fontWeight: 900, color: stat.color, textShadow: `0 0 12px ${stat.color}` }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 10, padding: "40px 24px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", border: "1px solid rgba(255,0,255,0.4)", background: "rgba(26,16,60,0.9)", padding: "48px 32px", backdropFilter: "blur(12px)", boxShadow: "0 0 50px rgba(0,255,255,0.1)" }}>
          <h2 style={{ fontFamily: "var(--font-orbitron, sans-serif)", fontWeight: 900, fontSize: "clamp(1.2rem, 3vw, 1.8rem)", color: "#E0E0E0", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            准备<span style={{ color: "#FF00FF", textShadow: "0 0 12px #FF00FF" }}>进入</span>选校系统？
          </h2>
          <p style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 14, color: "rgba(224,224,224,0.6)", margin: "0 0 28px", lineHeight: 1.65 }}>
            &gt; 创建您的硕士申请档案，获得专属 AI 推荐_
          </p>
          <Link href="/onboarding"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "2px solid #FF00FF", background: "#FF00FF", padding: "14px 32px", color: "#fff", fontFamily: "var(--font-share-tech, monospace)", fontSize: 14, textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase", boxShadow: "0 0 20px rgba(255,0,255,0.4)", transform: "skewX(-8deg)", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 40px #FF00FF, 0 0 80px rgba(255,0,255,0.3)"; e.currentTarget.style.transform = "skewX(0deg)" }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(255,0,255,0.4)"; e.currentTarget.style.transform = "skewX(-8deg)" }}
          >
            <span style={{ transform: "skewX(8deg)", display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties}>
              <GraduationCap style={{ width: 16, height: 16 }} /> LAUNCH ASSESSMENT
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,0,255,0.2)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-share-tech, monospace)", fontSize: 11, color: "rgba(224,224,224,0.35)", margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          © 2026 OPTIMA · 文商科硕士智能选校平台 · DATA: IPEDS/NCES
        </p>
      </footer>
    </div>
  )
}
