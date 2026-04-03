"use client"

import MasterAssessmentForm from "@/components/assessment/MasterAssessmentForm"
import { ThemedShell } from "@/components/themed-shell"

export default function AssessmentPage() {
  return (
    <ThemedShell title="硕士专属测评" backHref="/">
      <main className="min-h-screen bg-background px-4 py-8 md:px-8">
        <MasterAssessmentForm />
      </main>
    </ThemedShell>
  )
}
