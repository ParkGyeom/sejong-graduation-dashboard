import { ApiError } from "@/lib/api"
import type { TranscriptCourse } from "@/lib/api"

// 공학인증(ABEEK) 백엔드. dev에서는 vite proxy(/abeek)로 보낸다.
const BASE_URL = import.meta.env.VITE_ABEEK_API_BASE ?? "/abeek"

// ---- 요청 타입 ----

export interface AbeekCourseInput {
  courseName: string
  semester?: string
  grade?: string
  courseType?: string
}

export interface AbeekRequest {
  department: string
  enrollmentYear: number
  graduationYear: number
  courses: AbeekCourseInput[]
}

// ---- 응답 타입 ----

export type AbeekCategory = "design" | "liberal" | "major" | "msc"

export interface CreditResult {
  category: AbeekCategory | string
  required: number
  earned: number
  satisfied: boolean
  shortage: number
  appliedYear: number
  enrollmentValue: number
  graduationValue: number
}

export interface RequiredMajorCheck {
  satisfied: boolean
  missing: string[]
  appliedYear: number
  enrollmentRequiredCount: number
  graduationRequiredCount: number
}

export interface DesignSequence {
  valid: boolean
  validCredits: number
  warnings: string[]
}

export interface LiberalCheck {
  valid: boolean
  requiredTaken: string[]
  requiredMissing: string[]
  electiveTaken: string[]
  electiveGroupsCovered: string[]
}

export interface BsmCheck {
  valid: boolean
  taken: string[]
  missing: string[]
}

export interface FavorableItem {
  appliedYear: number
  minCredits: number
  enrollmentValue: number
  graduationValue: number
}

export interface AbeekResult {
  overallPass: boolean
  originalDepartment: string
  resolvedDepartment: string
  creditResults: CreditResult[]
  requiredMajorCheck: RequiredMajorCheck
  designSequence: DesignSequence
  liberalCheck: LiberalCheck
  bsmCheck?: BsmCheck
  // 일부 학과는 향후 mscCheck 키로 올 수 있음 (현재 백엔드는 항상 bsmCheck 사용)
  mscCheck?: BsmCheck
  favorableSummary: Record<string, FavorableItem>
  unmappedCourses: string[]
  courseNameAliases: Record<string, string>
}

export const CATEGORY_LABEL: Record<string, string> = {
  design: "설계",
  liberal: "교양",
  major: "전공",
  msc: "MSC",
  bsm: "BSM",
}

// 학과 목록
export interface Department {
  name: string
  aliases: string[]
}

export function getDepartments(): Promise<Department[]> {
  return abeekFetch<Department[]>("/api/departments")
}

export interface CurriculumCourse {
  courseName: string
  credits: number
  designCredits?: number
  category: string
  abeekType: string
  designType?: string | null
  subCategory?: string | null
}

export function getCurriculum(
  year: number,
  department: string
): Promise<CurriculumCourse[]> {
  const q = new URLSearchParams({ year: String(year), department })
  return abeekFetch<CurriculumCourse[]>(`/api/courses?${q}`)
}

export function evaluateAbeek(req: AbeekRequest): Promise<AbeekResult> {
  return abeekFetch<AbeekResult>("/api/evaluate/abeek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
}

async function abeekFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    let message = `요청에 실패했습니다 (${res.status})`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
      else if (body?.error) message = body.error
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

// 성적표 과목 → ABEEK 과목 입력으로 변환
// 학기 형식: "2025" + "2학기" → "2025-2"
export function toAbeekCourses(courses: TranscriptCourse[]): AbeekCourseInput[] {
  return courses.map((c) => {
    const semNum = c.semester.replace(/[^0-9]/g, "").charAt(0) || "1"
    return {
      courseName: c.courseName,
      semester: `${c.year}-${semNum}`,
      courseType: c.category,
    }
  })
}
