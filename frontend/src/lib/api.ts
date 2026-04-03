const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000"

async function request(path: string, init?: RequestInit) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Request failed: ${res.status} ${res.statusText} ${text}`)
  }

  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return await res.json()
  return await res.text()
}

export async function fetchData(path: string, init?: RequestInit) {
  return await request(path, { ...init, method: init?.method || "GET" })
}

export async function putData(
  path: string,
  data?: unknown,
  init?: RequestInit,
) {
  return await request(path, {
    ...init,
    method: "PUT",
    body: data === undefined ? undefined : JSON.stringify(data),
  })
}

// 更新用户信息（硕士专属）
export const updateMasterProfile = async (data: Record<string, unknown>) => {
  // Dev auth: backend expects X-User-Id. Use 1 by default.
  return await putData("/api/users/me", data, {
    headers: { "X-User-Id": "1" },
  })
}

// 获取项目推荐
export const getProgramRecommendations = async (params?: {
  max_results?: number
  include_safety?: boolean
  include_reach?: boolean
}) => {
  const queryParams = new URLSearchParams()
  if (params?.max_results) queryParams.set("max_results", params.max_results.toString())
  if (params?.include_safety !== undefined)
    queryParams.set("include_safety", params.include_safety.toString())
  if (params?.include_reach !== undefined)
    queryParams.set("include_reach", params.include_reach.toString())

  return await fetchData(`/api/matching/recommendations?${queryParams.toString()}`, {
    headers: { "X-User-Id": "1" },
  })
}

export const analyzePrerequisites = async (programId: number, prerequisites: string[]) => {
  const queryParams = new URLSearchParams()
  prerequisites.forEach((course) => queryParams.append("user_prerequisites", course))

  return await fetchData(`/api/programs/${programId}/prerequisite-analysis?${queryParams.toString()}`)
}

export const analyzeCareerPath = async (programId: number, targetIndustries: string[]) => {
  const queryParams = new URLSearchParams()
  targetIndustries.forEach((industry) => queryParams.append("target_industries", industry))

  return await fetchData(`/api/programs/${programId}/career-path-match?${queryParams.toString()}`)
}

export interface MasterAssessmentPayload {
  ipip_answers: Record<string, number>
  preference_answers: Record<string, number>
  status?: "draft" | "submitted"
}

export interface MasterAssessmentResult {
  id: number
  user_id: number
  assessment_type: string
  status: "draft" | "submitted"
  raw_answers: {
    ipip_answers?: Record<string, number>
    preference_answers?: Record<string, number>
  }
  personality_result: {
    openness: number
    conscientiousness: number
    agreeableness: number
  }
  preference_weights: {
    risk_tolerance: number
    application_mix: {
      reach_ratio: number
      target_ratio: number
      safety_ratio: number
    }
    academic_weight: number
    career_weight: number
    large_city_preference: number
    small_city_preference: number
    large_program_preference: number
    small_cohort_preference: number
    interdisciplinary_openness: number
  }
  overall_score: number
  created_at: string
  updated_at: string
}

export const getMyAssessment = async (): Promise<MasterAssessmentResult> => {
  return await fetchData("/api/v1/assessments/me", {
    headers: { "X-User-Id": "1" },
  })
}

export const saveMyAssessment = async (
  data: MasterAssessmentPayload,
): Promise<MasterAssessmentResult> => {
  return await putData("/api/v1/assessments/me", data, {
    headers: { "X-User-Id": "1" },
  })
}

// ── 用户画像 ──────────────────────────────────────────────────────────────────

export interface HardBackgroundRadar {
  gpa_score: number
  test_score: number
  school_tier_score: number
  prereq_completion: number
  research_score: number
  internship_score: number
  overall: number
}

export interface PersonalityRadar {
  openness: number
  conscientiousness: number
  agreeableness: number
  has_assessment: boolean
}

export interface PreferenceWeights {
  academic_weight: number
  career_weight: number
  risk_tolerance: number
  interdisciplinary_openness: number
  application_mix: { reach_ratio: number; target_ratio: number; safety_ratio: number }
  large_city_preference: number
  small_city_preference: number
  large_program_preference: number
  small_cohort_preference: number
}

export interface CareerSkillMatch {
  target_career: string
  match_score: number
  skills: Record<string, number>
  skill_gaps: string[]
  career_radar: Array<{ skill: string; user_score: number; required: number; fullMark: number }>
}

export interface UserProfile {
  id: number
  nickname: string
  hard_background: HardBackgroundRadar
  personality: PersonalityRadar
  preferences: PreferenceWeights
  career_match: CareerSkillMatch
  overall_competitiveness: number
  last_updated: string
}

export const getUserProfile = async (): Promise<UserProfile> => {
  return await fetchData("/api/v1/user/profile", {
    headers: { "X-User-Id": "1" },
  })
}

export const updateSkillAssessment = async (
  skills: Record<string, number>,
): Promise<UserProfile> => {
  return await putData("/api/v1/user/skills", { skills }, {
    headers: { "X-User-Id": "1" },
  })
}

