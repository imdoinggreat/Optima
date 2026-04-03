"use client"

import { DesignStyleProvider } from "@/lib/design-style-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return <DesignStyleProvider>{children}</DesignStyleProvider>
}
