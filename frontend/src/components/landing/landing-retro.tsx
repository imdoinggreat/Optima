"use client"

import Link from "next/link"
import { GraduationCap, Target, BookOpen, TrendingUp, Users } from "lucide-react"
import { useHealth } from "@/hooks/use-health"

// Reusable bevel style objects
const bevelOut: React.CSSProperties = {
  border: "2px solid",
  borderColor: "#ffffff #808080 #808080 #ffffff",
  boxShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
}
const bevelIn: React.CSSProperties = {
  border: "2px solid",
  borderColor: "#808080 #ffffff #ffffff #808080",
  boxShadow: "inset 1px 1px 0 #404040, inset -1px -1px 0 #dfdfdf",
}
const titleBarStyle: React.CSSProperties = {
  background: "linear-gradient(to right, #000080, #1084d0)",
  padding: "4px 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  userSelect: "none",
}

function Win95Card({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div style={{ ...bevelOut, background: "#c0c0c0", display: "flex", flexDirection: "column" }}>
      <div style={titleBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {Icon && <Icon style={{ color: "#fff", width: 12, height: 12 }} />}
          <span style={{ color: "#fff", fontSize: 12, fontFamily: '"MS Sans Serif", Tahoma, sans-serif', fontWeight: "bold" }}>{title}</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {["_", "□", "✕"].map((c) => (
            <span key={c} style={{ ...bevelOut, background: "#c0c0c0", color: "#000", fontSize: 9, width: 16, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "default", fontFamily: "monospace" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ ...bevelIn, margin: 4, background: "#fff", padding: 12, flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

function RetroButton({ children, href, primary }: { children: React.ReactNode; href?: string; primary?: boolean }) {
  const style: React.CSSProperties = {
    ...bevelOut,
    background: primary ? "#000080" : "#c0c0c0",
    color: primary ? "#ffffff" : "#000000",
    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
    fontSize: 13,
    fontWeight: "bold",
    padding: "6px 16px",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    letterSpacing: "0.03em",
    border: primary ? "2px solid" : "2px solid",
    borderColor: primary ? "#5555ff #000040 #000040 #5555ff" : "#ffffff #808080 #808080 #ffffff",
    boxShadow: primary ? "inset -1px -1px 0 #000040, inset 1px 1px 0 #8888ff" : "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    userSelect: "none",
  }
  if (href) return <Link href={href} style={style}>{children}</Link>
  return <button style={style}>{children}</button>
}

const features = [
  { title: "智能项目匹配", desc: "AI算法精准推荐", icon: Target },
  { title: "先修课分析",   desc: "匹配度量化分析",  icon: BookOpen },
  { title: "职业路径规划", desc: "就业去向可视化",  icon: TrendingUp },
  { title: "申请进度追踪", desc: "全流程一站管理",  icon: Users },
]

const MARQUEE_TEXT = "Optima ★ AI智能选校 ★ 文商科专属 ★ 北美硕士申请 ★ 精准匹配引擎 ★ 先修课分析 ★ 职业路径规划 ★ "

export default function LandingRetro() {
  const { connected, loading, data } = useHealth()

  return (
    <div className="bg-90s-tile" style={{ minHeight: "100vh", fontFamily: '"MS Sans Serif", Tahoma, Geneva, Verdana, sans-serif' }}>

      {/* Top marquee bar */}
      <div style={{ background: "#000080", overflow: "hidden", height: 22, borderBottom: "2px solid #000" }}>
        <div style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          animation: "marquee-scroll 22s linear infinite",
          paddingLeft: 0,
        }}>
          {/* Repeated 4× for seamless loop at -50% */}
          {[...Array(4)].map((_, i) => (
            <span key={i} style={{ color: i % 2 === 0 ? "#ffff00" : "#00ffff", fontSize: 12, fontWeight: "bold", padding: "0 2px" }}>
              {MARQUEE_TEXT}
            </span>
          ))}
        </div>
      </div>

      {/* Nav — Windows titlebar style */}
      <div style={{ background: "#c0c0c0", ...bevelOut, margin: 0, borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "4px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ ...bevelOut, background: "#c0c0c0", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap style={{ width: 20, height: 20, color: "#000080" }} />
            </div>
            <span style={{ fontWeight: "bold", fontSize: 16, color: "#000080", fontFamily: '"Arial Black", Impact, sans-serif' }}>Optima</span>
            <span style={{ fontSize: 10, color: "#808080" }}>v1.0</span>
          </div>
          <RetroButton href="/onboarding" primary>开始使用 ▶</RetroButton>
        </div>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "16px" }}>

        {/* Hero Window */}
        <Win95Card title="文商科硕士智能选校平台 — 主程序">
          <div style={{ textAlign: "center", padding: "16px 8px" }}>
            <h1
              style={{
                fontFamily: '"Arial Black", Impact, Haettenschweiler, sans-serif',
                fontSize: "clamp(1.8rem, 5vw, 3rem)",
                margin: "0 0 12px",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                color: "#000080",
                textShadow: "none",
              }}
            >
              文商科硕士智能选校平台
            </h1>

            <p style={{ fontSize: 14, color: "#000", margin: "0 0 16px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              专为文商科背景设计的 AI 选校系统，基于真实数据匹配最适合您的硕士项目
            </p>

            {/* Status badge */}
            <div style={{ ...bevelIn, display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", marginBottom: 16, background: "#ffffcc" }}>
              {!loading && (
                <>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: connected ? "#00cc00" : "#ff0000", display: "inline-block", boxShadow: connected ? "0 0 4px #00ff00" : "none" }} />
                  <span style={{ fontSize: 12, fontWeight: "bold", color: connected ? "#006600" : "#cc0000" }}>
                    {connected ? `后端AI引擎已连接 ${data ? `(v${data.version})` : ""}` : "后端未连接"}
                  </span>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <RetroButton href="/onboarding" primary>
                <GraduationCap style={{ width: 14, height: 14 }} />
                ★ 开始硕士专属测评 ★
              </RetroButton>
              <RetroButton href="/dashboard">
                <Target style={{ width: 14, height: 14 }} />
                查看项目匹配
              </RetroButton>
            </div>
          </div>
        </Win95Card>

        {/* Groove HR */}
        <div className="hr-groove" style={{ margin: "12px 0" }} />

        {/* Feature cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginBottom: 12 }}>
          {features.map((f) => (
            <Win95Card key={f.title} title={f.title} icon={f.icon}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ ...bevelOut, background: "#000080", padding: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <f.icon style={{ color: "#fff", width: 14, height: 14 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: "bold" }}>{f.title}</span>
              </div>
              <p style={{ fontSize: 11, color: "#000", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </Win95Card>
          ))}
        </div>

        {/* Groove HR */}
        <div className="hr-groove" style={{ margin: "12px 0" }} />

        {/* Hit counter — green on black */}
        <div style={{ ...bevelIn, background: "#000", padding: "12px 16px", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { label: "VISITORS:", value: "0012,345" },
              { label: "PROGRAMS:", value: "000,500+" },
              { label: "STATUS:",   value: connected ? "ONLINE ✓" : "OFFLINE ✗" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: 10, color: "#808080", textTransform: "uppercase" }}>{stat.label}</div>
                <div style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: 18, color: "#00ff00", fontWeight: "bold", textShadow: "0 0 6px #00ff00" }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontFamily: '"Courier New", Courier, monospace', fontSize: 9, color: "#808080" }}>
            [ Optima SYSTEM MONITOR v1.0 | RUNNING SINCE 1997 ]
          </div>
        </div>

        {/* Quick Start — Windows dialog */}
        <Win95Card title="快速开始指南 — 3 步完成申请">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {[
              { n: "1", title: "完成硕士专属测评", desc: "完成大五人格精简版与选校偏好测评，生成初始权重" },
              { n: "2", title: "完善硕士档案",     desc: "补充 GPA、先修课、经历与偏好，让推荐引擎更精准" },
              { n: "3", title: "AI智能匹配决策",   desc: "查看项目详情、就业数据、费用分析，明智选择" },
            ].map((s) => (
              <div key={s.n} style={{ ...bevelOut, background: "#ffffcc", padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ ...bevelOut, background: "#000080", color: "#fff", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>{s.n}</span>
                  <span style={{ fontWeight: "bold", fontSize: 12 }}>{s.title}</span>
                </div>
                <p style={{ fontSize: 11, margin: 0, color: "#000", lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </Win95Card>

        {/* Construction CTA */}
        <div className="bg-construction" style={{ margin: "12px 0", padding: 3 }}>
          <div style={{ ...bevelOut, background: "#c0c0c0", padding: "16px", textAlign: "center" }}>
            <p style={{ fontFamily: '"Arial Black", Impact, sans-serif', fontSize: 18, margin: "0 0 10px", textTransform: "uppercase", color: "#000" }}>
              ★ 准备好开始了吗? ★
            </p>
            <p style={{ fontSize: 12, margin: "0 0 12px", color: "#000" }}>立即创建您的硕士申请档案，获得专属 AI 推荐</p>
            <RetroButton href="/onboarding" primary>
              ★ 开始硕士专属测评 ★
            </RetroButton>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ ...bevelIn, background: "#c0c0c0", borderRadius: 0, borderLeft: "none", borderRight: "none", borderBottom: "none", padding: "8px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#000", margin: 0 }}>© 2026 Optima — 文商科硕士智能选校平台 | 专为文商科背景优化</p>
        <p style={{ fontSize: 10, color: "#808080", margin: "2px 0 0", fontFamily: '"Courier New", monospace' }}>数据基于 IPEDS/NCES 官方数据库</p>
      </footer>
    </div>
  )
}
