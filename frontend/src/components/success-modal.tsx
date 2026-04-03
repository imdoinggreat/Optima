"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useDesignStyle } from "@/lib/design-style-context"

interface SuccessModalProps {
  open: boolean
  onClose: () => void
  onPrimaryAction?: () => void
  primaryHref?: string
  title?: string
  subtitle?: string
  primaryLabel?: string
  secondaryLabel?: string
}

/* ── SVG Animated Checkmark ─────────────────────────────────────────────── */
function AnimatedCheck({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 52 52"
      width="52"
      height="52"
      fill="none"
      style={{ display: "block" }}
    >
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeOpacity="0.25"
      />
      <polyline
        points="14,27 22,35 38,18"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{
          strokeDasharray: 40,
          strokeDashoffset: 40,
          animation: "check-draw 0.45s cubic-bezier(0.65,0,0.35,1) 0.2s forwards",
        }}
      />
    </svg>
  )
}

/* ── Per-theme visual config ─────────────────────────────────────────────── */
type DesignStyle = "minimal" | "retro" | "vaporwave" | "terminal" | "healing"

interface ThemeConfig {
  overlay: string
  panel: React.CSSProperties
  iconBg: string
  checkColor: string
  titleStyle: React.CSSProperties
  subtitleStyle: React.CSSProperties
  primaryBtn: React.CSSProperties
  primaryBtnHover: React.CSSProperties
  secondaryBtn: React.CSSProperties
  secondaryBtnHover: React.CSSProperties
  sparkle: string
}

const THEME_CONFIG: Record<DesignStyle, ThemeConfig> = {
  minimal: {
    overlay: "rgba(15,23,42,0.55)",
    panel: {
      background: "#ffffff",
      border: "1px solid #E2E8F0",
      borderRadius: 16,
      boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
      padding: "40px 36px 32px",
      maxWidth: 420,
      width: "90vw",
    },
    iconBg: "rgba(0,82,255,0.08)",
    checkColor: "#0052FF",
    titleStyle: { fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" },
    subtitleStyle: { fontSize: 14, color: "#64748B", lineHeight: 1.6, marginTop: 8 },
    primaryBtn: {
      background: "linear-gradient(135deg,#0052FF,#4D7CFF)",
      color: "#fff", border: "none", borderRadius: 10,
      padding: "12px 28px", fontSize: 14, fontWeight: 600,
      cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
    },
    primaryBtnHover: {
      transform: "scale(1.02)",
      boxShadow: "0 8px 24px rgba(0,82,255,0.35)",
    },
    secondaryBtn: {
      background: "transparent", color: "#64748B",
      border: "1px solid #E2E8F0", borderRadius: 10,
      padding: "12px 28px", fontSize: 14, cursor: "pointer",
      transition: "border-color 0.15s, color 0.15s",
    },
    secondaryBtnHover: { borderColor: "#94A3B8", color: "#334155" },
    sparkle: "#0052FF",
  },
  retro: {
    overlay: "rgba(0,0,0,0.6)",
    panel: {
      background: "#c0c0c0",
      border: "2px solid",
      borderColor: "#ffffff",
      outline: "2px solid #808080",
      padding: "0",
      maxWidth: 420,
      width: "90vw",
      fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
    },
    iconBg: "#000080",
    checkColor: "#ffffff",
    titleStyle: { fontSize: 13, fontWeight: "bold", color: "#000080" },
    subtitleStyle: { fontSize: 12, color: "#404040", lineHeight: 1.5, marginTop: 6 },
    primaryBtn: {
      background: "#000080", color: "#fff",
      border: "2px solid", borderColor: "#ffffff #000040 #000040 #ffffff" as string,
      padding: "6px 20px", fontSize: 12, fontWeight: "bold",
      cursor: "pointer", textTransform: "uppercase" as const,
      transition: "none",
    },
    primaryBtnHover: { transform: "translate(1px,1px)" },
    secondaryBtn: {
      background: "#c0c0c0", color: "#000",
      border: "2px solid", borderColor: "#ffffff #808080 #808080 #ffffff" as string,
      padding: "6px 20px", fontSize: 12, fontWeight: "bold",
      cursor: "pointer", textTransform: "uppercase" as const,
      transition: "none",
    },
    secondaryBtnHover: { borderColor: "#808080 #ffffff #ffffff #808080" },
    sparkle: "#000080",
  },
  vaporwave: {
    overlay: "rgba(9,0,20,0.8)",
    panel: {
      background: "#12092e",
      border: "1px solid #FF00FF",
      borderTop: "3px solid #00FFFF",
      padding: "36px 32px 28px",
      maxWidth: 440,
      width: "90vw",
      fontFamily: "var(--font-share-tech), monospace",
    },
    iconBg: "rgba(255,0,255,0.08)",
    checkColor: "#00FFFF",
    titleStyle: {
      fontFamily: "var(--font-orbitron), sans-serif",
      fontSize: 16, fontWeight: 900,
      color: "#00FFFF", letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      textShadow: "0 0 10px rgba(0,255,255,0.4)",
    },
    subtitleStyle: {
      fontFamily: "var(--font-share-tech), monospace",
      fontSize: 13, color: "#8888AA", lineHeight: 1.6, marginTop: 10,
    },
    primaryBtn: {
      background: "#FF00FF", color: "#fff",
      border: "1px solid #FF00FF",
      padding: "11px 28px", fontSize: 12,
      fontFamily: "var(--font-share-tech), monospace",
      textTransform: "uppercase" as const, letterSpacing: "0.1em",
      cursor: "pointer",
      transition: "box-shadow 0.15s, transform 0.15s",
      boxShadow: "0 0 10px rgba(255,0,255,0.3)",
    },
    primaryBtnHover: {
      transform: "scale(1.02)",
      boxShadow: "0 0 24px rgba(255,0,255,0.65)",
    },
    secondaryBtn: {
      background: "transparent", color: "#7070A0",
      border: "1px solid #3D2B5E",
      padding: "11px 28px", fontSize: 12,
      fontFamily: "var(--font-share-tech), monospace",
      textTransform: "uppercase" as const, letterSpacing: "0.1em",
      cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
    },
    secondaryBtnHover: { borderColor: "#7070A0", color: "#D8D8F0" },
    sparkle: "#FF00FF",
  },
  terminal: {
    overlay: "rgba(0,0,0,0.85)",
    panel: {
      background: "#0a0a0a",
      border: "1px solid #33ff00",
      padding: "32px 28px 24px",
      maxWidth: 440,
      width: "90vw",
      fontFamily: "var(--font-jetbrains), 'Courier New', monospace",
    },
    iconBg: "rgba(51,255,0,0.06)",
    checkColor: "#33ff00",
    titleStyle: {
      fontFamily: "var(--font-jetbrains), monospace",
      fontSize: 15, fontWeight: 700,
      color: "#33ff00", letterSpacing: "0.04em",
      textShadow: "0 0 8px rgba(51,255,0,0.3)",
    },
    subtitleStyle: {
      fontFamily: "var(--font-jetbrains), monospace",
      fontSize: 12, color: "#4a8c4a", lineHeight: 1.7, marginTop: 8,
    },
    primaryBtn: {
      background: "#33ff00", color: "#0a0a0a",
      border: "1px solid #33ff00",
      padding: "10px 24px", fontSize: 12,
      fontFamily: "var(--font-jetbrains), monospace",
      fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em",
      cursor: "pointer", transition: "background 0.15s, color 0.15s, transform 0.15s",
    },
    primaryBtnHover: {
      transform: "scale(1.02)",
      boxShadow: "0 0 14px rgba(51,255,0,0.4)",
    },
    secondaryBtn: {
      background: "transparent", color: "#4a8c4a",
      border: "1px solid #2a6e2a",
      padding: "10px 24px", fontSize: 12,
      fontFamily: "var(--font-jetbrains), monospace",
      fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em",
      cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
    },
    secondaryBtnHover: { borderColor: "#4a8c4a", color: "#c8ffc8" },
    sparkle: "#33ff00",
  },
  healing: {
    overlay: "rgba(40,30,20,0.45)",
    panel: {
      background: "rgba(250,247,241,0.97)",
      border: "1px solid hsl(38,20%,86%)",
      borderRadius: 28,
      boxShadow: "0 16px 56px hsla(36,20%,40%,0.14), 0 4px 16px hsla(36,20%,40%,0.07)",
      padding: "44px 40px 36px",
      maxWidth: 420,
      width: "90vw",
      backdropFilter: "blur(12px)",
    },
    iconBg: "hsla(36,28%,68%,0.15)",
    checkColor: "hsl(36,28%,52%)",
    titleStyle: {
      fontFamily: "var(--font-caveat), cursive",
      fontSize: 26, fontWeight: 700,
      color: "hsl(0,0%,15%)",
      letterSpacing: "0.01em",
    },
    subtitleStyle: { fontSize: 14, color: "hsl(0,0%,50%)", lineHeight: 1.7, marginTop: 10 },
    primaryBtn: {
      background: "hsl(36,28%,68%)", color: "hsl(0,0%,12%)",
      border: "none", borderRadius: 999,
      padding: "13px 28px", fontSize: 15, fontWeight: 600,
      cursor: "pointer",
      boxShadow: "0 4px 16px hsla(36,28%,50%,0.28)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    },
    primaryBtnHover: { transform: "translateY(-2px)", boxShadow: "0 8px 24px hsla(36,28%,50%,0.38)" },
    secondaryBtn: {
      background: "transparent", color: "hsl(0,0%,45%)",
      border: "1px solid hsl(38,20%,84%)", borderRadius: 999,
      padding: "13px 28px", fontSize: 15,
      cursor: "pointer", transition: "border-color 0.2s ease, color 0.2s ease",
    },
    secondaryBtnHover: { borderColor: "hsl(36,28%,68%)", color: "hsl(0,0%,25%)" },
    sparkle: "hsl(36,28%,52%)",
  },
}

/* ── Retro Win95 window wrapper ──────────────────────────────────────────── */
function RetroWindow({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        background: "#c0c0c0",
        border: "2px solid",
        borderColor: "#ffffff #808080 #808080 #ffffff",
        boxShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf, 4px 4px 0 rgba(0,0,0,0.5)",
        maxWidth: 420,
        width: "90vw",
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
      }}
    >
      {/* Titlebar */}
      <div
        style={{
          background: "linear-gradient(to right, #000080, #1084d0)",
          padding: "3px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>✦ {title}</span>
        <div
          style={{
            width: 16, height: 16,
            background: "#c0c0c0",
            border: "2px solid",
            borderColor: "#ffffff #808080 #808080 #ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: "bold", cursor: "default",
          }}
        >
          ✕
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: "20px 20px 16px" }}>{children}</div>
    </div>
  )
}

/* ── Main Modal ──────────────────────────────────────────────────────────── */
export function SuccessModal({
  open,
  onClose,
  primaryHref = "/dashboard",
  title = "测评数据上传完成 ✦",
  subtitle = "你的专属选校报告正在生成，即将为你跳转结果页",
  primaryLabel = "立即查看选校报告",
  secondaryLabel = "稍后查看",
}: SuccessModalProps) {
  const { style } = useDesignStyle()
  const cfg = THEME_CONFIG[style]
  const [primaryHovered, setPrimaryHovered] = useState(false)
  const [secondaryHovered, setSecondaryHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      // Trigger entry animation after mount
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
    }
  }, [open])

  if (!open) return null

  const panelStyle: React.CSSProperties = {
    ...cfg.panel,
    transform: visible ? "scale(1)" : "scale(0.9)",
    opacity: visible ? 1 : 0,
    transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 300ms ease",
  }

  const content = (
    <div style={{ textAlign: "center" }}>
      {/* Animated checkmark */}
      <div
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: cfg.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <AnimatedCheck color={cfg.checkColor} />
      </div>

      {/* Title */}
      <div style={cfg.titleStyle}>{title}</div>

      {/* Subtitle */}
      <div style={cfg.subtitleStyle}>{subtitle}</div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
        <Link href={primaryHref} style={{ textDecoration: "none" }}>
          <button
            style={{
              ...cfg.primaryBtn,
              ...(primaryHovered ? cfg.primaryBtnHover : {}),
            }}
            onMouseEnter={() => setPrimaryHovered(true)}
            onMouseLeave={() => setPrimaryHovered(false)}
          >
            {primaryLabel}
          </button>
        </Link>
        <button
          onClick={onClose}
          style={{
            ...cfg.secondaryBtn,
            ...(secondaryHovered ? cfg.secondaryBtnHover : {}),
          }}
          onMouseEnter={() => setSecondaryHovered(true)}
          onMouseLeave={() => setSecondaryHovered(false)}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: cfg.overlay,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        {style === "retro" ? (
          <div style={panelStyle}>
            <RetroWindow title="操作成功">{content}</RetroWindow>
          </div>
        ) : (
          <div style={panelStyle}>{content}</div>
        )}
      </div>
    </>
  )
}
