"use client"

import MasterApplicationForm from "@/components/master/MasterApplicationForm"
import { ThemedShell } from "@/components/themed-shell"

export default function MasterProfilePage() {
  return (
    <ThemedShell title="硕士申请档案" backHref="/">
      <MasterApplicationForm />
    </ThemedShell>
  )
}

