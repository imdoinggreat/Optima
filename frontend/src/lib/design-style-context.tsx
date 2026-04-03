"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type DesignStyle = "minimal" | "retro" | "vaporwave" | "terminal" | "healing"

export const DESIGN_STYLES: { id: DesignStyle; label: string; emoji: string; name: string }[] = [
  { id: "minimal",   label: "Min",  emoji: "✦",  name: "Minimalist"   },
  { id: "retro",     label: "90s",  emoji: "💾", name: "Retro 90s"    },
  { id: "vaporwave", label: "Wave", emoji: "🌊", name: "Vaporwave"    },
  { id: "terminal",  label: "CLI",  emoji: "⌨",  name: "Terminal"     },
  { id: "healing",   label: "愈",   emoji: "🌿", name: "Healing 治愈" },
]

interface DesignStyleCtx {
  style: DesignStyle
  setStyle: (s: DesignStyle) => void
}

const DesignStyleContext = createContext<DesignStyleCtx>({
  style: "minimal",
  setStyle: () => {},
})

export function DesignStyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<DesignStyle>("minimal")

  useEffect(() => {
    const saved = localStorage.getItem("ds-style") as DesignStyle | null
    const valid: DesignStyle[] = ["minimal", "retro", "vaporwave", "terminal", "healing"]
    const resolved = saved && valid.includes(saved) ? saved : "minimal"
    setStyleState(resolved)
    document.documentElement.dataset.style = resolved
  }, [])

  const setStyle = (s: DesignStyle) => {
    setStyleState(s)
    localStorage.setItem("ds-style", s)
    document.documentElement.dataset.style = s
  }

  return (
    <DesignStyleContext.Provider value={{ style, setStyle }}>
      {children}
    </DesignStyleContext.Provider>
  )
}

export const useDesignStyle = () => useContext(DesignStyleContext)
