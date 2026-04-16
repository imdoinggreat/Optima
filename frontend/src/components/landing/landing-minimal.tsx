"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useHealth } from "@/hooks/use-health"
import { motion } from "framer-motion"

/* ─── Data ─── */

const stats = [
  { value: "593", label: "个项目" },
  { value: "13", label: "个国家" },
  { value: "45", label: "题精准测评" },
  { value: "5", label: "种决策原型" },
]

const steps = [
  { n: "01", title: "完成测评", desc: "回答约 45 道精心设计的测评题，涵盖终极目标、背景快照、性格-环境匹配、价值取舍等六大模块。" },
  { n: "02", title: "AI 构建画像", desc: "多信号推断引擎分析你的回答，构建决策原型画像，检测认知冲突与隐含偏好。" },
  { n: "03", title: "获得推荐", desc: "593 个项目逐一匹配评分，每条推荐都附带 why 与 risk 解释，帮你看清真实诉求。" },
]

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="14" r="11" />
        <circle cx="14" cy="14" r="5" />
        <circle cx="14" cy="14" r="1" fill="#0A0A0A" />
      </svg>
    ),
    title: "多信号推断引擎",
    desc: "基于约 45 题测评的多信号推断，构建你的决策画像与原型匹配。",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20L12 4L16 14L24 8" />
        <path d="M18 14L24 8V14" />
      </svg>
    ),
    title: "认知冲突检测",
    desc: "自动发现你偏好中的矛盾信号，帮你看清真实诉求。",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="22" height="22" rx="3" />
        <path d="M3 10H25" />
        <path d="M10 3V25" />
      </svg>
    ),
    title: "项目级精准匹配",
    desc: "593 个项目逐一评分，每条推荐都附带 why 与 risk 解释。",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="5" />
        <circle cx="18" cy="18" r="5" />
        <path d="M14.5 6.5A7 7 0 0121.5 13.5" />
      </svg>
    ),
    title: "全学科 13 国覆盖",
    desc: "CS、人文、艺术、商科、社科等全学科，覆盖 13 个国家。",
  },
]

/* ─── Noise texture (inline SVG data URI) ─── */
const grainTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const slideUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

/* ─── Colors ─── */
const C = {
  cream: "#FAF8F5",
  ink: "#0A0A0A",
  copper: "#B87333",
  body: "#5A5A5A",
  muted: "#9A9A9A",
  cardBorder: "#E5E0D8",
  white: "#FFFFFF",
} as const

/* ─── Typography helpers ─── */
const cnDisplay = "var(--font-cn-display, var(--font-lxgw, serif))"
const serif = "var(--font-dm-serif, Georgia, serif)"
const sans = "var(--font-dm-sans, system-ui, sans-serif)"
const mono = "var(--font-geist-mono, monospace)"

/* ─── Component ─── */
export default function LandingMinimal() {
  const { connected, loading, data } = useHealth()

  return (
    <div
      style={{
        background: C.cream,
        minHeight: "100vh",
        fontFamily: sans,
        color: C.ink,
        position: "relative",
      }}
    >
      {/* Grain overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: grainTexture,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          pointerEvents: "none",
          zIndex: 100,
          opacity: 0.5,
        }}
      />

      {/* ─── Nav ─── */}
      <nav
        style={{
          borderBottom: `1px solid ${C.cardBorder}`,
          background: C.cream,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 32px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontFamily: cnDisplay,
                fontSize: 22,
                fontWeight: 400,
                color: C.ink,
                letterSpacing: "-0.02em",
              }}
            >
              Optima
            </span>
            {/* Backend status dot */}
            {!loading && (
              <span
                title={connected ? `Backend v${data?.version ?? ""}` : "Backend offline"}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: connected ? "#22c55e" : "#ef4444",
                  display: "inline-block",
                  marginLeft: 4,
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          <Link
            href="/assessment"
            style={{
              background: C.ink,
              color: C.cream,
              padding: "10px 22px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "transform 0.2s, box-shadow 0.2s",
              fontFamily: sans,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)"
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            开始测评 <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 32px 100px" }}>
        {/* Full-width editorial layout: centered, no grid split */}
        <div style={{ maxWidth: 800 }}>
          <motion.p
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              fontFamily: mono,
              fontSize: 11,
              color: C.copper,
              margin: "0 0 32px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            AI-Powered Program Matching
          </motion.p>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              fontFamily: cnDisplay,
              fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
              lineHeight: 1.25,
              color: C.ink,
              margin: "0 0 40px",
              letterSpacing: "0.06em",
              fontWeight: 300,
            }}
          >
            找到属于你的
            <br />
            <span style={{ position: "relative", display: "inline-block" }}>
              <span style={{ color: C.copper, fontWeight: 400 }}>理想</span>
              硕士项目
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: "absolute",
                  bottom: -4,
                  left: 0,
                  width: "100%",
                  height: 1,
                  background: C.cardBorder,
                  transformOrigin: "left",
                }}
              />
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              fontFamily: sans,
              fontSize: 18,
              color: C.body,
              lineHeight: 2,
              margin: "0 0 56px",
              maxWidth: 560,
              letterSpacing: "0.04em",
            }}
          >
            覆盖全学科的智能选校系统，横跨 13 个国家 593 个硕士项目。
            <br />
            <span style={{ color: C.muted }}>
              约 45 道测评题，AI 构建你的决策画像，给出有理由的推荐。
            </span>
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{ display: "flex", alignItems: "center", gap: 24 }}
          >
            <Link
              href="/assessment"
              style={{
                background: C.ink,
                color: C.cream,
                padding: "16px 36px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                transition: "transform 0.2s, box-shadow 0.2s",
                fontFamily: sans,
                letterSpacing: "0.03em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)"
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              开始测评 <ArrowRight style={{ width: 15, height: 15 }} />
            </Link>
            <span style={{ fontFamily: mono, fontSize: 12, color: C.muted, letterSpacing: "0.08em" }}>
              约 10 分钟
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── Editorial divider with floating text ─── */}
      <section style={{ padding: "0 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ borderTop: `1px solid ${C.cardBorder}`, position: "relative" }}>
          <span style={{
            position: "absolute", top: -8, left: 60,
            background: C.cream, padding: "0 16px",
            fontFamily: mono, fontSize: 10, color: C.muted,
            letterSpacing: "0.2em", textTransform: "uppercase",
          }}>
            How it works
          </span>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section style={{ background: C.ink }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "48px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 32,
            textAlign: "center",
          }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08 }}
            >
              <p
                style={{
                  fontFamily: cnDisplay,
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  color: C.copper,
                  margin: "0 0 6px",
                  letterSpacing: "-0.02em",
                  fontWeight: 400,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  margin: 0,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section style={{ padding: "100px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            style={{ marginBottom: 64 }}
          >
            <div
              style={{
                width: 40,
                height: 2,
                background: C.copper,
                marginBottom: 20,
              }}
            />
            <h2
              style={{
                fontFamily: cnDisplay,
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                color: C.ink,
                margin: 0,
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              如 何 运 作
            </h2>
          </motion.div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 48,
            }}
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
                style={{
                  paddingTop: 32,
                  borderTop: `1px solid ${C.cardBorder}`,
                }}
              >
                <p
                  style={{
                    fontFamily: cnDisplay,
                    fontSize: 48,
                    color: C.cardBorder,
                    margin: "0 0 20px",
                    lineHeight: 1,
                    fontWeight: 400,
                  }}
                >
                  {step.n}
                </p>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: C.ink,
                    margin: "0 0 12px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    color: C.body,
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{ padding: "0 32px 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            style={{ marginBottom: 64 }}
          >
            <div
              style={{
                width: 40,
                height: 2,
                background: C.copper,
                marginBottom: 20,
              }}
            />
            <h2
              style={{
                fontFamily: cnDisplay,
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                color: C.ink,
                margin: 0,
                letterSpacing: "-0.02em",
                fontWeight: 400,
              }}
            >
              为 什 么 选 择  Optima
            </h2>
          </motion.div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 24,
            }}
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: C.white,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  padding: 36,
                  cursor: "default",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) scale(1.005)"
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)"
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ marginBottom: 20 }}>{f.icon}</div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: C.ink,
                    margin: "0 0 10px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    color: C.body,
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ background: C.ink, padding: "100px 32px" }}>
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          style={{
            maxWidth: 640,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: cnDisplay,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: C.cream,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            准 备 好 了 吗
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.55)",
              margin: "0 0 44px",
              lineHeight: 1.7,
            }}
          >
            完成约 45 道测评题，获得你的专属选校推荐
          </p>
          <Link
            href="/assessment"
            style={{
              background: "transparent",
              color: C.copper,
              padding: "16px 36px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              border: `1.5px solid ${C.copper}`,
              transition: "transform 0.2s, background 0.2s, color 0.2s",
              fontFamily: sans,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)"
              e.currentTarget.style.background = C.copper
              e.currentTarget.style.color = C.cream
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = C.copper
            }}
          >
            开始测评 <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: `1px solid ${C.cardBorder}`,
          background: C.cream,
          padding: "28px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: C.muted,
              margin: 0,
            }}
          >
            &copy; 2026 Optima
          </p>
          <p
            style={{
              fontSize: 12,
              color: C.muted,
              margin: 0,
              fontFamily: mono,
              letterSpacing: "0.06em",
            }}
          >
            覆盖全球 13 国 593 个项目
          </p>
        </div>
      </footer>
    </div>
  )
}
