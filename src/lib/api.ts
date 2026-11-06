// API base URL. dev에서는 vite proxy(/api)를 그대로 사용하고,
// 다른 호스트로 붙으려면 .env에 VITE_API_BASE_URL을 설정하세요.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = `요청에 실패했습니다 (${res.status})`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

// ---- Auth ----

export interface LoginRequest {
  userId: string
  password: string
}

export interface StudentInfo {
  id: number
  studentNo: string
  name: string
  major: string
  gradeLevel: number
  admissionYear: number
  status: string
}

export function login(body: LoginRequest): Promise<StudentInfo> {
  return apiFetch<StudentInfo>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

// ---- 성적 엑셀 업로드 / 이수 내역 파싱 ----

export interface TranscriptCourse {
  year: string
  semester: string
  courseCode: string
  courseName: string
  category: string
  credit: string
  gradePoint: string
}

export interface CategorySummaryCourse {
  courseCode: string
  courseName: string
  credit: string
}

export interface CategorySummary {
  category: string
  earnedCredits: string
  requiredCredits: string
  satisfied?: boolean
  progressPercent?: string
  courses: CategorySummaryCourse[]
}

export interface TranscriptSummary {
  totalCredits: string
  totalGradePoints: string
  averageGradePoint: string
  categorySummaries: CategorySummary[]
}

export interface TranscriptResult {
  count: number
  summary: TranscriptSummary
  courses: TranscriptCourse[]
}

// FormData 전송이므로 Content-Type을 직접 설정하지 않는다(브라우저가 boundary 포함해 자동 설정).
export async function uploadTranscript(
  studentId: number,
  file: File
): Promise<TranscriptResult> {
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(`${BASE_URL}/api/transcripts/upload/${studentId}`, {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    let message = `업로드에 실패했습니다 (${res.status})`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<TranscriptResult>
}

// ---- 졸업 진행도 분석 ----

export interface CreditPair {
  earnedCredits: string
  requiredCredits: string
  satisfied?: boolean
  progressPercent?: string
}

export interface MajorCredits {
  earnedMajorCredits: string
  requiredMajorCredits: string
  majorCreditsSatisfied: boolean
  majorCreditsProgressPercent: string
  earnedMajorRequiredCredits: string
  requiredMajorRequiredCredits: string
  majorRequiredSatisfied: boolean
  majorRequiredProgressPercent: string
  earnedMajorElectiveCredits: string
  requiredMajorElectiveCredits: string
  majorElectiveSatisfied: boolean
  majorElectiveProgressPercent: string
  earnedMajorFoundationCredits: string
}

export interface GraduationWork {
  required: boolean
  satisfied: boolean
  status: string
  requirementType: string
  detail: string
}

export interface GraduationProgress {
  studentId: number
  admissionYear: number
  major: string
  majorType: string
  secondaryMajor: string
  totalCredits: CreditPair
  commonLiberalCredits: CreditPair
  electiveLiberalCredits: CreditPair
  balancedLiberalCredits: CreditPair
  academicFoundationCredits: CreditPair
  majorFoundationCredits: CreditPair
  averageGradePoint: string
  majorGradePoint: string
  majorCredits: MajorCredits
  categorySummaries: CategorySummary[]
  graduationWork?: GraduationWork
}

export function getGraduationProgress(
  studentId: number
): Promise<GraduationProgress> {
  return apiFetch<GraduationProgress>(
    `/api/evaluate/graduation-progress/${studentId}`
  )
}
