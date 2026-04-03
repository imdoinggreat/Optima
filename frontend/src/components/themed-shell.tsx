"use client"

import Link from "next/link"
import { ArrowLeft, GraduationCap } from "lucide-react"
import { useDesignStyle } from "@/lib/design-style-context"

interface ThemedShellProps {
  children: React.ReactNode
  title?: string
  backHref?: string
}

const bevelOut: React.CSSProperties = {
  border: "2px solid",
  borderColor: "#ffffff #808080 #808080 #ffffff",
  boxShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
}

export function ThemedShell({
  children,
  title = "Optima",
  backHref = "/",
}: ThemedShellProps) {
  const { style } = useDesignStyle()

  /* ── RETRO ────────────────────────────────────────────────────────────── */
  if (style === "retro") {
    return (
      <div style={{ minHeight: "100vh", fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
        {/* Windows 95 title-bar nav */}
        <div
          style={{
            ...bevelOut,
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            background: "#c0c0c0",
            padding: "3px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "linear-gradient(to right, #000080, #1084d0)",
              padding: "3px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
            }}
          >
            <GraduationCap style={{ color: "#fff", width: 14, height: 14 }} />
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: 13, whiteSpace: "nowrap" }}>
              Optima — {title}
            </span>
          </div>

          <Link
            href={backHref}
            style={{
              ...bevelOut,
              background: "#c0c0c0",
              color: "#000",
              padding: "2px 12px",
              fontSize: 11,
              textDecoration: "none",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            ◄ 返回
          </Link>

          {/* Win95 minimize / restore / close buttons */}
          {(["─", "□", "✕"] as const).map((ch) => (
            <div
              key={ch}
              style={{
                ...bevelOut,
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: "bold",
                cursor: "default",
                flexShrink: 0,
              }}
            >
              {ch}
            </div>
          ))}
        </div>

        {children}
      </div>
    )
  }

  /* ── VAPORWAVE ────────────────────────────────────────────────────────── */
  if (style === "vaporwave") {
    return (
      <div
        style={{
          background: "#090014",
          minHeight: "100vh",
          fontFamily: "var(--font-share-tech), monospace",
          position: "relative",
        }}
      >
        {/* Fixed scanlines overlay */}
        <div
          className="vw-scanlines"
          style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9990, opacity: 0.25 }}
        />

        {/* Nav */}
        <nav
          style={{
            borderBottom: "1px solid rgba(255,0,255,0.3)",
            background: "rgba(9,0,20,0.92)",
            backdropFilter: "blur(16px)",
            padding: "0 24px",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: 1152,
              margin: "0 auto",
              height: 52,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Link
              href={backHref}
              style={{
                color: "#00FFFF",
                textDecoration: "none",
                fontFamily: "var(--font-share-tech), monospace",
                fontSize: 12,
                letterSpacing: "0.12em",
                display: "flex",
                alignItems: "center",
                gap: 4,
                textTransform: "uppercase",
                border: "1px solid rgba(0,255,255,0.35)",
                padding: "4px 12px",
                flexShrink: 0,
              }}
            >
              ← BACK
            </Link>

            <div
              style={{
                height: 1,
                flex: 1,
                background: "linear-gradient(to right, rgba(255,0,255,0.5), transparent)",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <GraduationCap
                style={{ color: "#FF00FF", width: 18, height: 18, filter: "drop-shadow(0 0 4px #FF00FF)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-orbitron), sans-serif",
                  fontWeight: 900,
                  fontSize: 13,
                  color: "#E0E0E0",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Optima
              </span>
            </div>

            <div
              style={{
                height: 1,
                flex: 1,
                background: "linear-gradient(to left, rgba(0,255,255,0.5), transparent)",
              }}
            />

            <span
              style={{
                fontFamily: "var(--font-share-tech), monospace",
                fontSize: 11,
                color: "rgba(224,224,224,0.45)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {title}
            </span>
          </div>
        </nav>

        {children}
      </div>
    )
  }

  /* ── TERMINAL ─────────────────────────────────────────────────────────── */
  if (style === "terminal") {
    const slug = title.replace(/ /g, "-").toLowerCase()
    return (
      <div
        style={{
          background: "#0a0a0a",
          minHeight: "100vh",
          color: "#33ff00",
          fontFamily: "var(--font-jetbrains), 'Courier New', monospace",
        }}
      >
        {/* Fixed scanlines */}
        <div
          className="terminal-scanlines"
          style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9990, opacity: 0.2 }}
        />

        {/* Shell nav */}
        <nav
          style={{
            borderBottom: "1px solid #1f521f",
            background: "#0d1a0d",
            padding: "0 20px",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            <Link
              href={backHref}
              style={{
                color: "#33ff00",
                textDecoration: "none",
                border: "1px solid #1f521f",
                padding: "2px 10px",
                fontSize: 11,
                letterSpacing: "0.06em",
                flexShrink: 0,
              }}
            >
              ← [BACK]
            </Link>

            <span style={{ color: "#1f521f" }}>|</span>
            <span style={{ color: "#1f521f" }}>root@</span>
            <span style={{ color: "#33ff00", textShadow: "0 0 5px rgba(51,255,0,0.5)" }}>optima</span>
            <span style={{ color: "#1f521f" }}>:~$</span>
            <span style={{ color: "#ffb000", textShadow: "0 0 5px rgba(255,176,0,0.4)" }}>
              ./pages/{slug}
            </span>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 14,
                background: "#33ff00",
                animation: "terminal-blink 1s step-end infinite",
                verticalAlign: "middle",
                marginLeft: 2,
              }}
            />
          </div>
        </nav>

        {children}
      </div>
    )
  }

  /* ── HEALING (治愈风) ─────────────────────────────────────────────────── */
  if (style === "healing") {
    return (
      <div style={{ background: "hsl(40,30%,97%)", minHeight: "100vh", fontFamily: '"Inter", "Noto Sans SC", sans-serif' }}>
        <nav style={{ background: "rgba(250,247,241,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid hsl(38,20%,88%)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 32px", height: 60, display: "flex", alignItems: "center", gap: 14 }}>
            <Link href={backHref} style={{ color: "hsl(36,28%,48%)", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 999, border: "1px solid hsl(38,20%,85%)", flexShrink: 0 }}>
              <ArrowLeft style={{ width: 13, height: 13 }} /> 返回
            </Link>
            <div style={{ width: 1, height: 18, background: "hsl(38,20%,88%)", flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, background: "hsl(36,28%,68%)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px hsla(36,20%,50%,0.18)" }}>
                <GraduationCap style={{ color: "hsl(0,0%,15%)", width: 14, height: 14 }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, color: "hsl(0,0%,18%)", letterSpacing: "-0.01em" }}>Optima</span>
            </div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 400, color: "hsl(0,0%,55%)" }}>{title}</div>
          </div>
        </nav>
        {children}
      </div>
    )
  }

  /* ── MINIMAL (default) ────────────────────────────────────────────────── */
  return (
    <div style={{ background: "#FAFAFA", minHeight: "100vh" }}>
      <nav
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E2E8F0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Link
            href={backHref}
            style={{
              color: "#64748B",
              textDecoration: "none",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            返回
          </Link>

          <div style={{ width: 1, height: 20, background: "#E2E8F0", flexShrink: 0 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "linear-gradient(135deg, #0052FF, #4D7CFF)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap style={{ color: "#fff", width: 14, height: 14 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>Optima</span>
          </div>

          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 500,
              color: "#64748B",
            }}
          >
            {title}
          </div>
        </div>
      </nav>

      {children}
    </div>
  )
}
