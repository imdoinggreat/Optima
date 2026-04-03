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
    fetch("http://localhost:8000/api/health")
      .then((r) => r.json())
      .then((d: HealthData) => {
        setData(d)
        setConnected(d.status === "healthy")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { connected, loading, data }
}
