"use client"

import Link from "next/link"
import { GraduationCap, Target, BookOpen, TrendingUp, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useHealth } from "@/hooks/use-health"

const HERO_TEXT = "文商科硕士智能选校平台"

function TypewriterHeading({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [text])

  return (
    <span className="terminal-glow">
      {displayed}
      {!done && <span className="terminal-cursor" style={{ color: "#33ff00" }} />}
      {done && <span style={{ display: "inline-block", width: "0.6em", height: "1em", background: "#33ff00", verticalAlign: "text-bottom", animation: "terminal-blink 1s step-end infinite" }} />}
    </span>
  )
}

function AsciiBar({ pct, label, width = 20 }: { pct: number; label: string; width?: number }) {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  return (
    <div style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 12, color: "#33ff00", marginBottom: 6 }}>
      <span style={{ color: "#1f521f", display: "inline-block", width: 160 }}>{label}</span>
      <span style={{ color: "#1f521f" }}>[</span>
      <span className="terminal-glow">{"█".repeat(filled)}</span>
      <span style={{ color: "#1f521f" }}>{"░".repeat(empty)}</span>
      <span style={{ color: "#1f521f" }}>]</span>
      <span style={{ color: "#ffb000", marginLeft: 8 }}>{pct}%</span>
    </div>
  )
}

function TermPane({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #1f521f", background: "#0a0a0a" }}>
      <div style={{ borderBottom: "1px solid #1f521f", padding: "4px 12px", background: "#0d1a0d", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#1f521f", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 10 }}>+--</span>
        <span style={{ color: "#33ff00", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 11, fontWeight: 700 }}>{title}</span>
        <span style={{ color: "#1f521f", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 10, flex: 1 }}>
          {"─".repeat(20)}+
        </span>
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  )
}

const features = [
  { icon: Target,     cmd: "smart-match",  desc: "AI驱动的硕士项目精准匹配",  flag: "--ai-powered" },
  { icon: BookOpen,   cmd: "prereq-scan",  desc: "先修课匹配度量化分析",       flag: "--analyze" },
  { icon: TrendingUp, cmd: "career-path",  desc: "就业去向与职业路径可视化",   flag: "--visualize" },
  { icon: Users,      cmd: "track",        desc: "申请全流程一站式追踪管理",   flag: "--all-stages" },
]

export default function LandingTerminal() {
  const { connected, loading, data } = useHealth()
  const [time] = useState(() => new Date().toLocaleTimeString("zh-CN", { hour12: false }))

  return (
    <div className="font-jetbrains" style={{ background: "#0a0a0a", minHeight: "100vh", color: "#33ff00", fontFamily: "var(--font-jetbrains, 'Courier New', monospace)", position: "relative" }}>
      {/* Subtle scanlines overlay */}
      <div className="terminal-scanlines" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9990, opacity: 0.4 }} />

      {/* Nav bar — shell prompt style */}
      <nav style={{ borderBottom: "1px solid #1f521f", background: "#0d1a0d", padding: "0 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", height: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#1f521f" }}>root@</span>
            <span className="terminal-glow" style={{ fontWeight: 700, letterSpacing: "0.05em" }}>optima</span>
            <span style={{ color: "#1f521f" }}>:~$</span>
            <span style={{ color: "#ffb000", marginLeft: 4 }} className="terminal-amber-glow">./選校引擎 --version 1.0</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#1f521f", fontSize: 11 }}>[{time}]</span>
            <Link href="/onboarding"
              style={{ color: "#0a0a0a", background: "#33ff00", padding: "4px 14px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid #33ff00", display: "inline-block", textShadow: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#33ff00" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#33ff00"; e.currentTarget.style.color = "#0a0a0a" }}
            >
              [ EXECUTE ]
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>

        {/* Hero terminal window */}
        <TermPane title="OPTIMA MASTER SELECTION ENGINE v1.0">
          <div style={{ padding: "8px 0" }}>
            {/* Boot sequence lines */}
            {[
              { prompt: "$", text: "optima --init", color: "#1f521f" },
              { prompt: ">", text: "Loading AI engine...                [OK]", color: "#33ff00" },
              { prompt: ">", text: "Connecting to database...           [OK]", color: "#33ff00" },
              { prompt: ">", text: "Indexing 500+ programs...           [OK]", color: "#33ff00" },
            ].map((line, i) => (
              <div key={i} style={{ fontSize: 11, color: line.color, marginBottom: 2, display: "flex", gap: 8 }}>
                <span style={{ color: "#1f521f", minWidth: 12 }}>{line.prompt}</span>
                <span>{line.text}</span>
              </div>
            ))}

            {/* Main heading */}
            <div style={{ margin: "20px 0 8px", borderTop: "1px dashed #1f521f", paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: "#1f521f", marginBottom: 6 }}>$ echo &quot;$WELCOME_MSG&quot;</div>
              <h1 style={{ fontFamily: "inherit", fontSize: "clamp(1.2rem, 4vw, 1.8rem)", fontWeight: 700, margin: "0 0 12px", lineHeight: 1.2, letterSpacing: "0.02em" }}>
                <TypewriterHeading text={HERO_TEXT} />
              </h1>
              <p style={{ fontSize: 13, color: "#1f521f", margin: "0 0 16px", lineHeight: 1.65 }}>
                # 专为文商科背景设计的AI选校系统<br />
                # 基于真实数据匹配最适合您的硕士项目
              </p>
            </div>

            {/* Status line */}
            {!loading && (
              <div style={{ fontSize: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#1f521f" }}>&gt;</span>
                <span style={{ color: "#ffb000" }} className="terminal-amber-glow">backend.status</span>
                <span style={{ color: "#1f521f" }}>=</span>
                <span style={{ color: connected ? "#33ff00" : "#ff3333", textShadow: connected ? "0 0 5px rgba(51,255,0,0.5)" : "0 0 5px rgba(255,51,51,0.5)" }}>
                  &quot;{connected ? `healthy v${data?.version ?? ""}` : "offline"}&quot;
                </span>
                <span style={{ color: connected ? "#33ff00" : "#ff3333" }}>
                  {connected ? " [OK]" : " [ERR]"}
                </span>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/onboarding"
                style={{ color: "#0a0a0a", background: "#33ff00", padding: "10px 20px", fontFamily: "inherit", fontSize: 14, fontWeight: 800, textDecoration: "none", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #33ff00", boxShadow: "0 0 12px rgba(51,255,0,0.35)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#33ff00" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#33ff00"; e.currentTarget.style.color = "#0a0a0a" }}
              >
                <GraduationCap style={{ width: 14, height: 14 }} />
                [ ★ 开始硕士专属测评 ★ ]
              </Link>
              <Link href="/dashboard"
                style={{ color: "#33ff00", background: "transparent", padding: "8px 18px", fontFamily: "inherit", fontSize: 13, textDecoration: "none", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #1f521f" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#33ff00"; e.currentTarget.style.background = "rgba(51,255,0,0.06)" }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1f521f"; e.currentTarget.style.background = "transparent" }}
              >
                <Target style={{ width: 14, height: 14 }} />
                [ 查看项目匹配 ]
              </Link>
            </div>
          </div>
        </TermPane>

        {/* Features — 4 terminal panes in a grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 12 }}>
          {features.map((f) => (
            <TermPane key={f.cmd} title={`module:${f.cmd}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <f.icon style={{ width: 14, height: 14, color: "#33ff00", filter: "drop-shadow(0 0 3px rgba(51,255,0,0.6))" }} />
                <span style={{ fontSize: 12, color: "#ffb000", fontWeight: 700 }} className="terminal-amber-glow">{f.flag}</span>
              </div>
              <p style={{ fontSize: 11, color: "#1f521f", margin: "0 0 6px", lineHeight: 1.5 }}>
                <span style={{ color: "#33ff00" }}>#</span> {f.desc}
              </p>
              <p style={{ fontSize: 10, color: "#1f521f", margin: 0, fontStyle: "italic" }}>$ optima {f.cmd} {f.flag}</p>
            </TermPane>
          ))}
        </div>

        {/* Stats — ASCII progress bars */}
        <div style={{ marginTop: 12 }}>
          <TermPane title="system_metrics.sh">
            <div style={{ fontSize: 11, color: "#1f521f", marginBottom: 12 }}>$ optima --stats --verbose</div>
            <AsciiBar pct={94} label="AI_MATCH_ACCURACY" />
            <AsciiBar pct={87} label="APPLICATION_SUCCESS" />
            <AsciiBar pct={100} label="DB_CONNECTION" />
            <AsciiBar pct={78} label="ENGINE_LOAD" />
            <div style={{ marginTop: 10, fontSize: 11, color: "#1f521f" }}>
              <span style={{ color: "#ffb000" }}>OUTPUT:</span> programs_indexed=500 | active_users=12345 | uptime=99.9%
            </div>
          </TermPane>
        </div>

        {/* Quick Start */}
        <div style={{ marginTop: 12 }}>
          <TermPane title="README.md — QUICK START">
            <div style={{ fontSize: 11, color: "#1f521f", marginBottom: 8 }}>$ cat quickstart.sh</div>
            {[
              { step: "01", cmd: "optima assessment --type=master", desc: "完成大五人格精简版与选校偏好测评，生成初始权重" },
              { step: "02", cmd: "optima profile --update gpa,prereq,experience", desc: "补充 GPA、先修课、经历与偏好，精确化推荐引擎" },
              { step: "03", cmd: "optima match --show-results --ai", desc: "查看项目详情、就业数据、费用分析，作出明智决策" },
            ].map((s) => (
              <div key={s.step} style={{ marginBottom: 12, paddingLeft: 4, borderLeft: "2px solid #1f521f" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ color: "#ffb000", fontSize: 10 }}>[{s.step}]</span>
                  <span style={{ color: "#33ff00", fontSize: 12, fontWeight: 700 }} className="terminal-glow">$ {s.cmd}</span>
                </div>
                <p style={{ color: "#1f521f", fontSize: 11, margin: 0, paddingLeft: 28, lineHeight: 1.55 }}># {s.desc}</p>
              </div>
            ))}

            <div style={{ marginTop: 16, borderTop: "1px dashed #1f521f", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "#1f521f", marginBottom: 8 }}>$ optima --start-now</div>
              <Link href="/onboarding"
                style={{ color: "#0a0a0a", background: "#33ff00", padding: "10px 22px", fontFamily: "inherit", fontSize: 14, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.05em", boxShadow: "0 0 12px rgba(51,255,0,0.35)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#33ff00"; e.currentTarget.style.outline = "1px solid #33ff00" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#33ff00"; e.currentTarget.style.color = "#0a0a0a"; e.currentTarget.style.outline = "none" }}
              >
                <GraduationCap style={{ width: 14, height: 14 }} />
                EXECUTE: ★ 开始硕士专属测评 ★
              </Link>
            </div>
          </TermPane>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1f521f", padding: "12px 20px", marginTop: 24 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#1f521f" }}>
            <span style={{ color: "#33ff00" }}>//</span> © 2026 OPTIMA — 文商科硕士智能选校平台
          </span>
          <span style={{ fontSize: 10, color: "#1f521f", fontStyle: "italic" }}>
            # 数据基于 IPEDS/NCES 官方数据库
          </span>
        </div>
      </footer>
    </div>
  )
}
