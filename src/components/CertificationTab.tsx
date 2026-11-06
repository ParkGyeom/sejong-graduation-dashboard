import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
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
import { ApiError } from "@/lib/api"
import type { GraduationProgress } from "@/lib/api"
import {
  evaluateAbeek,
  getCurriculum,
  toAbeekCourses,
  getDepartments,
} from "@/lib/abeek"
import type { AbeekResult, CreditResult, CurriculumCourse } from "@/lib/abeek"
import { useTranscript, transcriptFor } from "@/lib/transcript"
import { useAuth } from "@/lib/auth"

interface CourseItem {
  courseName: string
  creditLabel: string
}

// 공학인증 탭은 졸업요건(빨강)과 구분되게 게이지를 네이비로 표시
const ABEEK_NAVY = "#11303F"
const MAX_VISIBLE = 5

export function CertificationTab({ data }: { data: GraduationProgress }) {
  const { user } = useAuth()
  const { stored } = useTranscript()
  const transcript = transcriptFor(stored, user?.id ?? data.studentId)
  const [gradYear, setGradYear] = useState(data.admissionYear + 4)
  const [result, setResult] = useState<AbeekResult | null>(null)
  const [curriculum, setCurriculum] = useState<CurriculumCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState<boolean | null>(null)

  const courses = useMemo(
    () => (transcript ? toAbeekCourses(transcript.courses) : []),
    [transcript]
  )

  // 학과 지원 여부 확인
  useEffect(() => {
    let cancelled = false
    getDepartments()
      .then((deps) => {
        if (cancelled) return
        const supported = deps.some(
          (d) => d.name === data.major || d.aliases.includes(data.major)
        )
        setIsSupported(supported)
      })
      .catch(() => {
        if (!cancelled) setIsSupported(true) // 실패 시 기본적으로 보이게 처리
      })
    return () => {
      cancelled = true
    }
  }, [data.major])

  // 이수 과목 정보(집합 + 학점맵, 백엔드 alias 적용) — 훅이므로 early return 위에서 호출
  const taken = useTakenInfo(result, transcript?.courses ?? [])

  useEffect(() => {
    if (!transcript) return
    if (isSupported === false) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      evaluateAbeek({
        department: data.major,
        enrollmentYear: data.admissionYear,
        graduationYear: gradYear,
        courses,
      }),
      getCurriculum(data.admissionYear, data.major).catch(
        () => [] as CurriculumCourse[]
      ),
    ])
      .then(([r, cur]) => {
        if (cancelled) return
        setResult(r)
        setCurriculum(cur)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "공학인증 판정 중 오류가 발생했습니다."
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [transcript, data.major, data.admissionYear, gradYear, courses, isSupported])

  if (isSupported === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">공학인증을 지원하지 않는 학과입니다.</p>
        <p className="mt-2 text-sm">{data.major}는 ABEEK 공학인증 대상이 아닙니다.</p>
      </div>
    )
  }

  if (isSupported === null) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        정보를 불러오는 중...
      </div>
    )
  }

  if (!transcript) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center text-muted-foreground">
        <p>공학인증 분석을 보려면 성적 파일이 필요합니다.</p>
        <Link
          to="/upload"
          className="rounded-full bg-sejong px-5 py-2.5 text-sm font-bold text-sejong-foreground hover:bg-sejong/90"
        >
          성적 파일 업로드하기
        </Link>
      </div>
    )
  }

  const gradYearOptions = Array.from(
    { length: 6 },
    (_, i) => data.admissionYear + 3 + i
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {user?.name ?? "00"}님 공학인증 현황
          </h2>
          <p className="text-sm text-muted-foreground">
            {result && result.originalDepartment !== result.resolvedDepartment
              ? `${result.originalDepartment} → ${result.resolvedDepartment} · `
              : ""}
            입학 {data.admissionYear}년 기준
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">졸업년도</span>
          <select
            value={gradYear}
            onChange={(e) => setGradYear(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-sejong"
          >
            {gradYearOptions.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" />
          공학인증 판정 중...
        </div>
      )}

      {!loading && error && (
        <div className="py-24 text-center text-muted-foreground">{error}</div>
      )}

      {!loading && !error && result && (
        <ResultView
          result={result}
          curriculum={curriculum}
          takenSet={taken.set}
          creditOf={(name) => taken.credits.get(name) ?? 0}
          name={user?.name}
        />
      )}
    </div>
  )
}

// ---------- 결과 본문 ----------

function ResultView({
  result,
  curriculum,
  takenSet,
  creditOf,
  name,
}: {
  result: AbeekResult
  curriculum: CurriculumCourse[]
  takenSet: Set<string>
  creditOf: (name: string) => number
  name?: string
}) {
  const who = name ?? "00"
  const cr = Object.fromEntries(
    result.creditResults.map((r) => [r.category, r])
  ) as Record<string, CreditResult>
  const liberal = cr.liberal
  const major = cr.major
  const design = cr.design
  const bsm = cr.bsm ?? cr.msc
  const bsmLabel = cr.bsm ? "BSM" : "MSC"

  // 교과과정 기반 분류
  const bsmKey = curriculum.some((c) => c.category === "bsm") ? "bsm" : "msc"
  const isTaken = (c: CurriculumCourse) => takenSet.has(c.courseName)
  const isDesign = (c: CurriculumCourse) =>
    !!c.designType || (c.designCredits ?? 0) > 0

  const libReqTaken = curriculum.filter(
    (c) => c.category === "liberal" && c.abeekType === "required" && isTaken(c)
  )
  const libReqMissing = curriculum.filter(
    (c) => c.category === "liberal" && c.abeekType === "required" && !isTaken(c)
  )
  // 인증선택은 /api/courses에 없어 ABEEK liberalCheck.electiveTaken을 권위 소스로 사용 (학점은 성적표 조회)
  const libElecItems: CourseItem[] = result.liberalCheck.electiveTaken.map(
    (n) => ({ courseName: n, creditLabel: String(creditOf(n)) })
  )
  const bsmTaken = curriculum.filter(
    (c) => c.category === bsmKey && isTaken(c)
  )
  const bsmMissing = curriculum.filter(
    (c) => c.category === bsmKey && c.abeekType === "required" && !isTaken(c)
  )
  const majorTaken = curriculum.filter(
    (c) => c.category === "major" && isTaken(c)
  )
  const designTaken = curriculum.filter((c) => isDesign(c) && isTaken(c))
  const designMissing = curriculum.filter((c) => isDesign(c) && !isTaken(c))

  const toItem = (c: CurriculumCourse): CourseItem => ({
    courseName: c.courseName,
    creditLabel: String(c.credits),
  })
  const toDesignItem = (c: CurriculumCourse): CourseItem => ({
    courseName: c.courseName,
    creditLabel: String(c.designCredits ?? 0),
  })
  const sumCredits = (list: CurriculumCourse[]) =>
    list.reduce((s, c) => s + (c.credits || 0), 0)

  // 헤더·게이지는 아래 과목 목록과 동일 소스(교과과정∩성적표)로 계산해 일치시킨다.
  // 교과과정 조회가 없으면 ABEEK earned로 폴백.
  const hasCur = curriculum.length > 0
  const libReqCredits = sumCredits(libReqTaken)
  const libElecCredits = result.liberalCheck.electiveTaken.reduce(
    (s, n) => s + creditOf(n),
    0
  )
  const liberalEarned = hasCur ? libReqCredits + libElecCredits : num(liberal?.earned)
  const liberalReq = num(liberal?.required)
  // 인증필수 최소학점 = 필수 과목 전체 학점(이수+미이수), 인증선택 = 전체 - 필수
  const libReqMin = libReqCredits + sumCredits(libReqMissing)
  const libElecMin = Math.max(0, liberalReq - libReqMin)
  const bsmEarned = hasCur ? sumCredits(bsmTaken) : num(bsm?.earned)
  const bsmReq = num(bsm?.required)
  const majorEarned = hasCur ? sumCredits(majorTaken) : num(major?.earned)
  const majorReq = num(major?.required)
  const designCourseCredits = sumCredits(designTaken) // 설계 과목의 일반 학점 합
  // 인정 설계학점: ABEEK가 이수순서(기초설계 선행) 위반 과목을 제외하고 계산한 값 사용
  const designCredits = num(design?.earned)
  const designReq = num(design?.required)
  const majorNonDesignCredits = majorEarned - designCourseCredits

  return (
    <div className="flex flex-col gap-6">
      {/* 전문교양 */}
      <Card
        title={
          <>
            {who}님 전문교양{" "}
            <span className="text-sejong">
              {liberalEarned}/{liberalReq}학점 이수
            </span>
          </>
        }
        action
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <GaugeSection
            label="인증필수"
            secondLabel="최소 이수 학점"
            percent={ratio(libReqCredits, libReqMin)}
            taken={libReqTaken.map(toItem)}
            total={String(libReqCredits)}
            req={String(libReqMin)}
          />
          <GaugeSection
            label="인증선택"
            secondLabel="최소 이수 학점"
            percent={ratio(libElecCredits, libElecMin)}
            taken={libElecItems}
            total={String(libElecCredits)}
            req={String(libElecMin)}
          />
        </div>
      </Card>

      {/* BSM / MSC */}
      <Card
        title={
          <>
            {bsmLabel}{" "}
            <span className="text-sejong">
              {bsmEarned}/{bsmReq}학점 이수
            </span>
          </>
        }
      >
        <GaugeSection
          label={bsmLabel}
          secondLabel="최소 이수 학점"
          percent={ratio(bsmEarned, bsmReq)}
          taken={bsmTaken.map(toItem)}
          missing={bsmMissing.map(toItem)}
          total={String(bsmEarned)}
          req={String(bsmReq)}
        />
      </Card>

      {/* 전공 (전공교과목 + 설계) */}
      <Card
        title={
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span>
              전공{" "}
              <span className="text-sejong">
                {majorEarned}/{majorReq}학점 이수
              </span>
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              전공 {majorNonDesignCredits}학점 · 설계 {designCourseCredits}학점
              이수
            </span>
          </span>
        }
        action
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <GaugeSection
            label="전공교과목"
            secondLabel="최소 이수 학점"
            percent={ratio(majorEarned, majorReq)}
            taken={majorTaken.map(toItem)}
            total={String(majorEarned)}
            req={String(majorReq)}
          />
          <GaugeSection
            label="설계"
            secondLabel="최소 이수 학점"
            percent={ratio(designCredits, designReq)}
            taken={designTaken.map(toDesignItem)}
            total={String(designCredits)}
            req={String(designReq)}
          />
        </div>
      </Card>

      {/* 전공 설계 자세히 보기 */}
      <Card title={<span className="text-sejong">전공 설계 자세히 보기</span>}>
        <GaugeSection
          label="설계"
          secondLabel="최소 이수 학점"
          percent={ratio(designCredits, designReq)}
          taken={designTaken.map(toDesignItem)}
          missing={designMissing.map(toDesignItem)}
          total={String(designCredits)}
          req={String(designReq)}
        />
        {result.designSequence.warnings.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            {result.designSequence.warnings.map((w) => (
              <li key={w}>⚠️ {w}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ---------- 공용 컴포넌트 ----------

function Card({
  title,
  children,
  action,
}: {
  title: React.ReactNode
  children: React.ReactNode
  action?: boolean
}) {
  return (
    <div className="rounded-2xl border p-6 shadow-sm">
      <h3 className="mb-5 text-base font-bold">{title}</h3>
      {children}
      {action && (
        <div className="mt-5 flex justify-end">
          <Link to="/curriculum">
            <Button
              size="sm"
              className="rounded-full bg-sejong text-sejong-foreground hover:bg-sejong/90"
            >
              이수체계도 확인
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

function Legend({ second }: { second: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-sejong" />이수 학점
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-gray-300" />
        {second}
      </span>
    </div>
  )
}

function GaugeSection({
  label,
  secondLabel,
  percent,
  taken,
  missing,
  total,
  req,
}: {
  label: string
  secondLabel: string
  percent: number
  taken: CourseItem[]
  missing?: CourseItem[]
  total: string
  req?: string
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{label}</p>
      <Legend second={secondLabel} />
      <div className="mt-3 flex gap-5">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <Gauge value={percent} size={120} strokeWidth={12} color={ABEEK_NAVY} />
          <p className="text-xs">
            <span className="text-muted-foreground">총 </span>
            <span className="font-semibold text-sejong">{total}</span>
            {req !== undefined && (
              <span className="text-muted-foreground"> / {req} 학점</span>
            )}
          </p>
        </div>
        <div className="flex flex-1 gap-5">
          <CourseCol title="이수한 과목" items={taken} />
          {missing && <CourseCol title="남은 과목" items={missing} />}
        </div>
      </div>
    </div>
  )
}

function CourseCol({ title, items }: { title: string; items: CourseItem[] }) {
  const visible = items.slice(0, MAX_VISIBLE)
  const hasMore = items.length > MAX_VISIBLE
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
        {visible.map((c) => (
          <li
            key={c.courseName}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate text-foreground/80">{c.courseName}</span>
            <span className="shrink-0 text-muted-foreground">
              {c.creditLabel}
            </span>
          </li>
        ))}
      </ul>
      {hasMore && (
        <Dialog>
          <DialogTrigger asChild>
            <button className="mt-2 text-xs font-medium text-sejong hover:underline">
              더 보기 (+{items.length - MAX_VISIBLE})
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <ul className="flex max-h-[60vh] flex-col overflow-y-auto text-sm">
              {items.map((c) => (
                <li
                  key={c.courseName}
                  className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0"
                >
                  <span className="text-foreground/80">{c.courseName}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {c.creditLabel}
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

// ---------- 헬퍼 ----------

const num = (v: number | undefined) => (typeof v === "number" ? v : 0)
const ratio = (a: number, b: number) =>
  b > 0 ? Math.min(100, (a / b) * 100) : a > 0 ? 100 : 0

// 이수 과목 집합 + 과목명→학점 맵 (백엔드 alias 적용: 입력명 → 교과명)
function useTakenInfo(
  result: AbeekResult | null,
  courses: { courseName: string; credit: string }[]
) {
  return useMemo(() => {
    const aliases = result?.courseNameAliases ?? {}
    const set = new Set<string>()
    const credits = new Map<string, number>()
    for (const c of courses) {
      const name = aliases[c.courseName] ?? c.courseName
      set.add(name)
      credits.set(name, Number(c.credit) || 0)
    }
    return { set, credits }
  }, [result, courses])
}
