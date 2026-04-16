"use client"

import { useEffect, useState } from "react"

export interface HealthData {
  status: string
  version: string
  service: string
  timestamp: string
  database_status: string
  programs_count?: number
}

export function useHealth() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HealthData | null>(null)

  useEffect(() => {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000"
    const url = `${apiBase}/api/health`

    fetch(url)
      .then(async (r) => {
        return await r.json()
      })
      .then((d: HealthData) => {
        setData(d)
        setConnected(d.status === "healthy")
      })
      .catch(() => {
        // Health check failed — backend offline
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { connected, loading, data }
}
