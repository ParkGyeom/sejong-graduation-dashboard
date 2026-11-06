import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Gauge } from "@/components/Gauge"
import { CertificationTab } from "@/components/CertificationTab"
import { getGraduationProgress, ApiError } from "@/lib/api"
import type {
  GraduationProgress,
  CategorySummary,
  CategorySummaryCourse,
  CreditPair,
  TranscriptCourse,
} from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTranscript, transcriptFor } from "@/lib/transcript"
import { cn } from "@/lib/utils"

const TABS = ["졸업요건", "공학인증", "내 이수과목"] as const
type Tab = (typeof TABS)[number]

const num = (s: string | undefined) => Number(s ?? 0) || 0
const pct = (earned: number, required: number) =>
  required > 0 ? (earned / required) * 100 : 0
// 백엔드가 주는 progressPercent를 우선 사용하고, 없으면 직접 계산
const percentOf = (cp: CreditPair) =>
  cp.progressPercent != null
    ? num(cp.progressPercent)
    : pct(num(cp.earnedCredits), num(cp.requiredCredits))

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-sejong" />
        이수 학점
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-gray-300" />
        총 학점
      </span>
    </div>
  )
}

const MAX_VISIBLE_COURSES = 5

function CourseList({
  title,
  courses,
  emptyText = "—",
}: {
  title: string
  courses: CategorySummaryCourse[]
  emptyText?: string
}) {
  const visible = courses.slice(0, MAX_VISIBLE_COURSES)
  const hasMore = courses.length > MAX_VISIBLE_COURSES

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {courses.length === 0 && (
          <li className="text-muted-foreground">{emptyText}</li>
        )}
        {visible.map((c) => (
          <li
            key={c.courseCode}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate text-foreground/80">{c.courseName}</span>
            <span className="shrink-0 text-muted-foreground">{c.credit}</span>
          </li>
        ))}
      </ul>

      {hasMore && (
        <Dialog>
          <DialogTrigger asChild>
            <button className="mt-2 text-xs font-medium text-sejong hover:underline">
              더보기 (+{courses.length - MAX_VISIBLE_COURSES})
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <ul className="flex max-h-[60vh] flex-col overflow-y-auto text-sm">
              {courses.map((c) => (
                <li
                  key={c.courseCode}
                  className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0"
                >
                  <span className="text-foreground/80">{c.courseName}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {c.credit}학점
                  </span>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>("졸업요건")
  const [data, setData] = useState<GraduationProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsUpload, setNeedsUpload] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    // 데이터 페칭 시작 시 로딩 표시 (의도된 동기 setState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    getGraduationProgress(user.id)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (cancelled) return
        // 저장된 성적이 없으면 백엔드가 404/500 반환 → 업로드로 안내
        if (
          err instanceof ApiError &&
          (err.status === 404 || err.status === 500)
        ) {
          setNeedsUpload(true)
        } else {
          setError(
            err instanceof Error ? err.message : "분석 중 오류가 발생했습니다."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (needsUpload) return <Navigate to="/upload" replace />

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* 탭 */}
      <div className="flex gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              tab === t
                ? "border-sejong text-sejong"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          분석하는 중...
        </div>
      )}

      {!loading && error && (
        <div className="py-24 text-center text-muted-foreground">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {tab === "졸업요건" && <GraduationTab data={data} name={user?.name} />}
          {tab === "공학인증" && <CertificationTab data={data} />}
          {tab === "내 이수과목" && <CoursesTab data={data} />}
        </>
      )}
    </div>
  )
}

// ---------------- 졸업요건 탭 ----------------

function GraduationTab({
  data,
  name,
}: {
  data: GraduationProgress
  name?: string
}) {
  const who = name ?? "00"
  const total = data.totalCredits
  const mc = data.majorCredits

  const totalEarned = num(total.earnedCredits)
  const totalRequired = num(total.requiredCredits)

  const findCategory = (keyword: string): CategorySummary | undefined =>
    data.categorySummaries.find((c) => c.category.includes(keyword))

  const majorRequiredCat = findCategory("전필")
  const majorElectiveCat = findCategory("전선")
  const majorFoundationCat = findCategory("전기") // 전공기초 (학번에 따라 없을 수 있음)

  // 교양 등 전공 외 카테고리 (전기/전공기초 제외)
  const liberalCats = data.categorySummaries.filter(
    (c) => !["전필", "전선", "전공", "전기"].some((k) => c.category.includes(k))
  )

  const majorReqEarned = num(mc.earnedMajorRequiredCredits)
  const majorReqRequired = num(mc.requiredMajorRequiredCredits)
  const majorElecEarned = num(mc.earnedMajorElectiveCredits)
  const majorElecRequired = num(mc.requiredMajorElectiveCredits)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold">{who}님 졸업요건 현황</h2>
        <p className="text-sm text-muted-foreground">
          최신 성적표 기준 분석 현황
        </p>
      </div>

      {/* 상단 3카드 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
        {/* 학점 현황 */}
        <div className="rounded-xl border p-6 lg:col-span-2 xl:col-span-1">
          <h3 className="mb-6 text-lg font-bold text-sejong">
            현재 {totalEarned}/{totalRequired}학점 이수 완료!
          </h3>
          <div className="flex flex-wrap items-center justify-around gap-4 sm:gap-6">
            <GaugeBlock label="전체 학점" value={percentOf(total)} size={120} strokeWidth={12} />
            <GaugeBlock
              label="전공 학점"
              value={num(mc.majorCreditsProgressPercent)}
              size={120}
              strokeWidth={12}
            />
            <div className="flex flex-col gap-6">
              <AvgBlock label="전체 평균학점" value={data.averageGradePoint} />
              <AvgBlock label="전공 평균학점" value={data.majorGradePoint} />
            </div>
          </div>
        </div>

        {/* 고전독서인증 (TODO: API 연동 전 목업) */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold">고전독서인증 · 예시</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            아래 내용은 화면 구성용 예시입니다.
          </p>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["서양의 역사와 사상", "5/4"],
                  ["동양의 역사와 사상", "3/2"],
                  ["동·서양의 문학", "3/3"],
                  ["과학 사상", "1/1"],
                ].map(([k, v], i) => (
                  <tr key={k} className={i > 0 ? "border-t" : ""}>
                    <td className="px-4 py-3 text-foreground/80">{k}</td>
                    <td className="w-20 border-l px-4 py-3 text-center font-semibold text-sejong">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-sm font-bold text-sejong">
            실제 인증 결과는 아직 제공되지 않습니다.
          </p>
        </div>

        {/* 미완료 인증 (TODO: API 연동 전 목업) */}
        <div className="rounded-2xl border p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-bold">졸업 인증 · 예시</h3>
          <p className="mb-5 text-sm text-muted-foreground">아래 기준은 예시이며, 개인별 인증 결과가 아닙니다.</p>
          <CertGroup
            title="영어졸업인증(비전공자)"
            rows={[
              ["TOEIC", "800점 이상"],
              ["TOEFL iBT", "80점 이상"],
              ["TOEIC Speaking", "IM 1 이상"],
            ]}
          />
          <div className="mt-5">
            <CertGroup
              title="SW코딩졸업인증(비전공자)"
              rows={[
                ["TOSC (SW역량테스트)", "Level 5 이상"],
                ["K-MOOC:코딩과스토리텔링", "P 이상"],
              ]}
            />
          </div>
        </div>
      </div>

      {/* 졸업작품 현황 */}
      {data.graduationWork && data.graduationWork.status !== "NOT_APPLICABLE" && (
        <div className="rounded-xl border border-sejong/20 bg-sejong/5 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            졸업작품 / 졸업시험 요건
            {data.graduationWork.satisfied ? (
              <span className="rounded bg-sejong/10 px-2 py-0.5 text-sm font-bold text-sejong">
                완료
              </span>
            ) : (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-sm font-bold text-muted-foreground">
                미완료
              </span>
            )}
          </h2>
          <p className="text-sm text-foreground/80">
            {data.graduationWork.detail}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            구분: {data.graduationWork.requirementType === "MAJOR_REQUIRED" ? "전공필수" : "졸업인증 대체"}
          </p>
        </div>
      )}

      {/* 학점 현황 자세히 보기 */}
      <div>
        <h2 className="mb-4 text-xl font-bold">전공학점 자세히 보기</h2>
        <div
          className={cn(
            "grid grid-cols-1 gap-4 md:grid-cols-2",
            majorFoundationCat && "xl:grid-cols-3"
          )}
        >
          <DetailCard
            title={`${who}님 전공 필수 현황`}
            legendLabel="전공 필수"
            value={num(mc.majorRequiredProgressPercent)}
            requiredCredits={majorReqRequired}
            earnedCredits={majorReqEarned}
            earnedCourses={majorRequiredCat?.courses ?? []}
            earnedTitle="이수한 과목"
            remainingTitle="남은 전필 과목"
          />
          {majorFoundationCat && (
            <DetailCard
              title={`${who}님 전공 기초 현황`}
              legendLabel="전공 기초"
              value={percentOf(majorFoundationCat)}
              requiredCredits={num(majorFoundationCat.requiredCredits)}
              earnedCredits={num(majorFoundationCat.earnedCredits)}
              earnedCourses={majorFoundationCat.courses}
              earnedTitle="이수한 과목"
              remainingTitle="남은 전기 과목"
            />
          )}
          <DetailCard
            title={`${who}님 전공 선택 현황`}
            legendLabel="전공 선택"
            value={num(mc.majorElectiveProgressPercent)}
            requiredCredits={majorElecRequired}
            earnedCredits={majorElecEarned}
            earnedCourses={majorElectiveCat?.courses ?? []}
            earnedTitle="이수한 과목"
            remainingTitle="남은 전선 과목"
          />
        </div>
      </div>

      {/* 교양 현황 */}
      {liberalCats.length > 0 && (
        <div className="rounded-xl border p-6">
          <h2 className="mb-6 text-lg font-bold">{who}님 교양 필수 현황</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {liberalCats.map((c) => {
              // 교선(교양선택)은 퍼센트 개념이 없는 영역 → 게이지 대신 이수 학점만 표시
              const noPercent = c.category.includes("교선")
              return (
                <div
                  key={c.category}
                  className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5"
                >
                  <p className="text-sm font-semibold">{c.category}</p>
                  {noPercent ? (
                    <div className="flex h-[120px] flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-sejong">
                        {num(c.earnedCredits)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        이수 학점
                      </span>
                    </div>
                  ) : (
                    <>
                      <Legend />
                      <Gauge value={percentOf(c)} size={120} strokeWidth={12} />
                    </>
                  )}
                  <div className="w-full border-t pt-3">
                    <CourseList title="이수한 과목" courses={c.courses} />
                    <p className="mt-3 text-xs text-muted-foreground">
                      {noPercent
                        ? `이수 ${num(c.earnedCredits)}학점`
                        : `이수 ${num(c.earnedCredits)} / 필요 ${num(c.requiredCredits)} 학점`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AvgBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-3xl font-bold text-sejong">{value ?? "-"}</p>
      <p className="text-xs text-muted-foreground">/ 4.5</p>
    </div>
  )
}

function GaugeBlock({
  label,
  value,
  size = 140,
  strokeWidth = 14,
  valueClassName,
}: {
  label: string
  value: number
  size?: number
  strokeWidth?: number
  valueClassName?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-semibold">{label}</p>
      <Legend />
      <Gauge
        value={value}
        size={size}
        strokeWidth={strokeWidth}
        valueClassName={valueClassName}
      />
    </div>
  )
}

function CertGroup({
  title,
  rows,
}: {
  title: string
  rows: [string, string][]
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">{title}</p>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={k} className={i > 0 ? "border-t" : ""}>
                <td className="px-4 py-3 text-foreground/80">{k}</td>
                <td className="w-32 border-l px-4 py-3 font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-right text-xs text-muted-foreground">
        더 보기
      </p>
    </div>
  )
}

function DetailCard({
  title,
  legendLabel,
  value,
  requiredCredits,
  earnedCredits,
  earnedCourses,
  earnedTitle,
  remainingTitle,
  remainingCourses = [],
}: {
  title: string
  legendLabel: string
  value: number
  requiredCredits: number
  earnedCredits: number
  earnedCourses: CategorySummaryCourse[]
  earnedTitle: string
  remainingTitle: string
  remainingCourses?: CategorySummaryCourse[]
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border p-5">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 text-sm font-semibold">{legendLabel}</p>
      <Legend />
      <div className="mt-4 flex gap-4">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <Gauge value={value} size={110} strokeWidth={11} />
          <div className="text-xs text-muted-foreground">
            <p>필요 학점 {requiredCredits}학점</p>
            <p>
              이수 학점{" "}
              <span className="font-semibold text-sejong">
                {earnedCredits}학점
              </span>
            </p>
          </div>
        </div>
        <div className="flex-1">
          <CourseList title={earnedTitle} courses={earnedCourses} />
        </div>
      </div>
      <div className="mt-auto flex justify-end pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="rounded-full bg-sejong text-sejong-foreground hover:bg-sejong/90"
            >
              남은 과목 보기
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{remainingTitle}</DialogTitle>
            </DialogHeader>
            {remainingCourses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                남은 과목 정보는 준비 중입니다. (API 연동 예정)
              </p>
            ) : (
              <ul className="flex max-h-[60vh] flex-col overflow-y-auto text-sm">
                {remainingCourses.map((c) => (
                  <li
                    key={c.courseCode}
                    className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0"
                  >
                    <span className="text-foreground/80">{c.courseName}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {c.credit}학점
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// ---------------- 내 이수과목 탭 ----------------

function CoursesTab({ data }: { data: GraduationProgress }) {
  const { user } = useAuth()
  const { stored } = useTranscript()
  const transcript = transcriptFor(stored, user?.id ?? data.studentId)

  // 요약
  const totalCredits = num(data.totalCredits.earnedCredits)

  // 성적표(학기/평점 포함)가 있으면 학기별 그룹으로 표시
  if (transcript && transcript.courses.length > 0) {
    const groups = new Map<string, TranscriptCourse[]>()
    for (const c of transcript.courses) {
      const key = `${c.year}-${c.semester}`
      const arr = groups.get(key) ?? []
      arr.push(c)
      groups.set(key, arr)
    }
    // 최신 학기 우선 정렬
    const sorted = [...groups.entries()].sort((a, b) => {
      const ord = (k: string) => {
        const [y, s] = k.split("-")
        return Number(y) * 10 + (Number(s.replace(/[^0-9]/g, "")) || 0)
      }
      return ord(b[0]) - ord(a[0])
    })

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-6 rounded-xl border p-5 text-sm">
          <Summary label="총 이수 학점" value={`${totalCredits}학점`} />
          <Summary label="전체 평균학점" value={data.averageGradePoint} />
          <Summary label="이수 과목 수" value={`${transcript.count}과목`} />
        </div>

        {sorted.map(([key, courses]) => {
          const [y, s] = key.split("-")
          const sum = courses.reduce((acc, c) => acc + num(c.credit), 0)
          return (
            <div key={key} className="overflow-hidden rounded-xl border">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                <span className="text-sm font-semibold">
                  {y}년 {s}
                </span>
                <span className="text-xs text-muted-foreground">{sum}학점</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">과목명</th>
                    <th className="px-4 py-2 font-medium">이수구분</th>
                    <th className="px-4 py-2 text-right font-medium">학점</th>
                    <th className="px-4 py-2 text-right font-medium">평점</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr
                      key={c.courseCode}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-2.5">{c.courseName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {c.category}
                      </td>
                      <td className="px-4 py-2.5 text-right">{c.credit}</td>
                      <td className="px-4 py-2.5 text-right">{c.gradePoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  // 폴백: 졸업진행도 응답의 과목 (학기/평점 없음)
  const rows = data.categorySummaries.flatMap((c) =>
    c.courses.map((course) => ({ ...course, category: c.category }))
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-6 rounded-xl border p-5 text-sm">
        <Summary label="총 이수 학점" value={`${totalCredits}학점`} />
        <Summary label="전체 평균학점" value={data.averageGradePoint} />
        <Summary label="이수 과목 수" value={`${rows.length}과목`} />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center justify-between">
        <p>
          현재 브라우저에 원본 성적표 데이터가 없어 학기별 상세 조회가 제한됩니다.
        </p>
        <a href="/upload" className="font-semibold underline hover:text-amber-900">
          성적표 다시 업로드하기
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-semibold">전체 이수 내역</span>
          <span className="text-xs text-muted-foreground">학기 구분 없음</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">과목코드</th>
              <th className="px-4 py-2 font-medium">과목명</th>
              <th className="px-4 py-2 font-medium">이수구분</th>
              <th className="px-4 py-2 text-right font-medium">학점</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.category}-${r.courseCode}`}
                className="border-b last:border-0"
              >
                <td className="px-4 py-2.5 text-muted-foreground">
                  {r.courseCode}
                </td>
                <td className="px-4 py-2.5">{r.courseName}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.category}</td>
                <td className="px-4 py-2.5 text-right">{r.credit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-sejong">{value}</p>
    </div>
  )
}
