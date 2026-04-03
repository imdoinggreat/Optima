"use client"

import { useState } from "react"
import { useDesignStyle, DESIGN_STYLES, type DesignStyle } from "@/lib/design-style-context"

const SWITCHER_STYLES: Record<DesignStyle, {
  container: React.CSSProperties
  activeBtn: React.CSSProperties
  inactiveBtn: React.CSSProperties
  label: React.CSSProperties
  panel: React.CSSProperties
}> = {
  minimal: {
    container: { background: "rgba(255,255,255,0.95)", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,82,255,0.1)" },
    panel: { color: "#0F172A" },
    label: { fontFamily: "var(--font-geist-mono, monospace)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748B" },
    activeBtn: { background: "linear-gradient(to right, #0052FF, #4D7CFF)", color: "#fff", border: "none", borderRadius: 8 },
    inactiveBtn: { background: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8 },
  },
  retro: {
    container: { background: "#c0c0c0", border: "2px solid", borderColor: "#ffffff #808080 #808080 #ffffff" as unknown as string, boxShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf", borderRadius: 0 },
    panel: { color: "#000000" },
    label: { fontFamily: '"MS Sans Serif", Tahoma, sans-serif', fontSize: 10, fontWeight: "bold", textTransform: "uppercase", color: "#000" },
    activeBtn: { background: "#000080", color: "#ffffff", border: "2px solid", borderColor: "#5555ff #000040 #000040 #5555ff" as unknown as string, borderRadius: 0, fontWeight: "bold" },
    inactiveBtn: { background: "#c0c0c0", color: "#000", border: "2px solid", borderColor: "#fff #808080 #808080 #fff" as unknown as string, borderRadius: 0 },
  },
  vaporwave: {
    container: { background: "rgba(9,0,20,0.92)", border: "1px solid #FF00FF", borderRadius: 0, boxShadow: "0 0 20px rgba(255,0,255,0.3), 0 0 40px rgba(0,255,255,0.1)" },
    panel: { color: "#E0E0E0" },
    label: { fontFamily: "var(--font-share-tech, monospace)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#FF00FF" },
    activeBtn: { background: "transparent", color: "#00FFFF", border: "1px solid #00FFFF", borderRadius: 0, boxShadow: "0 0 8px #00FFFF" },
    inactiveBtn: { background: "transparent", color: "#E0E0E060", border: "1px solid #2D1B4E", borderRadius: 0 },
  },
  terminal: {
    container: { background: "#0a0a0a", border: "1px solid #1f521f", borderRadius: 0, boxShadow: "0 0 10px rgba(51,255,0,0.2)" },
    panel: { color: "#33ff00" },
    label: { fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1f521f" },
    activeBtn: { background: "#33ff00", color: "#0a0a0a", border: "1px solid #33ff00", borderRadius: 0, fontFamily: "var(--font-jetbrains, monospace)", fontWeight: "bold" },
    inactiveBtn: { background: "transparent", color: "#1f521f", border: "1px solid #1f521f", borderRadius: 0, fontFamily: "var(--font-jetbrains, monospace)" },
  },
  healing: {
    container: { background: "rgba(250,247,241,0.96)", border: "1px solid hsl(38,20%,86%)", borderRadius: 20, boxShadow: "0 8px 32px hsla(36,20%,40%,0.12)" },
    panel: { color: "hsl(0,0%,18%)" },
    label: { fontFamily: "var(--font-caveat), cursive", fontSize: 13, letterSpacing: "0.04em", color: "hsl(36,28%,48%)" },
    activeBtn: { background: "hsl(36,28%,68%)", color: "hsl(0,0%,12%)", border: "none", borderRadius: 999, fontWeight: "600" },
    inactiveBtn: { background: "transparent", color: "hsl(0,0%,45%)", border: "1px solid hsl(38,20%,84%)", borderRadius: 999 },
  },
}

export function ThemeSwitcher() {
  const { style, setStyle } = useDesignStyle()
  const [open, setOpen] = useState(false)
  const s = SWITCHER_STYLES[style]

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {open && (
        <div
          style={{
            ...s.container,
            padding: "12px 14px",
            minWidth: 180,
          }}
        >
          <p style={{ ...s.label, marginBottom: 8 }}>
            {style === "terminal" ? "> STYLE SELECT" : "Design Style"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DESIGN_STYLES.map((ds) => (
              <button
                key={ds.id}
                onClick={() => { setStyle(ds.id); setOpen(false) }}
                style={{
                  ...(ds.id === style ? s.activeBtn : s.inactiveBtn),
                  padding: "5px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: style === "terminal" ? "var(--font-jetbrains, monospace)" : "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "none",
                }}
              >
                <span>{ds.emoji}</span>
                <span style={{ fontWeight: ds.id === style ? "bold" : "normal" }}>
                  {style === "terminal" ? `[${ds.label.toUpperCase()}]` : ds.name}
                </span>
                {ds.id === style && <span style={{ marginLeft: "auto" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch design style"
        style={{
          ...s.container,
          padding: "8px 14px",
          cursor: "pointer",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: style === "terminal" ? "#33ff00" : style === "vaporwave" ? "#00FFFF" : style === "retro" ? "#000" : style === "healing" ? "hsl(36,28%,42%)" : "#0052FF",
          fontFamily: style === "terminal" ? "var(--font-jetbrains, monospace)" : style === "vaporwave" ? "var(--font-share-tech, monospace)" : "inherit",
          fontWeight: "bold",
          transition: "none",
        }}
      >
        <span style={{ fontSize: 14 }}>
          {DESIGN_STYLES.find((d) => d.id === style)?.emoji}
        </span>
        <span>
          {style === "terminal" ? "> STYLE" : style === "healing" ? "✦ 风格" : "Style"}
        </span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
    </div>
  )
}
