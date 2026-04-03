"use client"

import { useDesignStyle } from "@/lib/design-style-context"
import LandingMinimal   from "@/components/landing/landing-minimal"
import LandingRetro     from "@/components/landing/landing-retro"
import LandingVaporwave from "@/components/landing/landing-vaporwave"
import LandingTerminal  from "@/components/landing/landing-terminal"
import LandingHealing   from "@/components/landing/landing-healing"

export default function Home() {
  const { style } = useDesignStyle()

  switch (style) {
    case "retro":     return <LandingRetro />
    case "vaporwave": return <LandingVaporwave />
    case "terminal":  return <LandingTerminal />
    case "healing":   return <LandingHealing />
    default:          return <LandingMinimal />
  }
}
