import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, FileSpreadsheet, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandHeader } from "@/components/BrandHeader"
import { uploadTranscript, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTranscript } from "@/lib/transcript"
import { cn } from "@/lib/utils"
import sejongLogo from "@/assets/sejong-logo.svg"

const ACCEPT = ".xlsx,.xls"
const MAX_SIZE = 1024 * 1024 // 1MB

function isExcel(file: File) {
  return /\.(xlsx|xls)$/i.test(file.name)
}

export function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setTranscript } = useTranscript()

  const handleBack = () => {
    navigate(-1)
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickFile = (f: File | undefined) => {
    if (!f) return
    if (!isExcel(f)) {
      setError("엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.")
      return
    }
    if (f.size > MAX_SIZE) {
      setError("파일 용량은 최대 1MB까지 가능합니다.")
      return
    }
    setError(null)
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!file) {
      setError("업로드할 엑셀 파일을 선택해주세요.")
      return
    }
    if (!user) {
      setError("로그인 정보가 없습니다. 다시 로그인해주세요.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await uploadTranscript(user.id, file)
      setTranscript(user.id, result)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "업로드 중 오류가 발생했습니다."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <BrandHeader />

      <div className="px-4 pt-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          뒤로가기
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 py-16">
        <img src={sejongLogo} alt="세종대학교 로고" className="size-20" />
        <h2 className="mt-6 text-3xl font-bold">기이수성적조회 엑셀 파일 업로드</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          학사정보시스템 &gt; 수업/성적 &gt; 성적 및 강의 평가 &gt; 기이수성적조회
          엑셀 다운로드
        </p>

        {/* 드롭존 */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "mt-8 flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-6 py-14 text-center text-sm text-muted-foreground transition-colors",
            dragOver
              ? "bg-sejong/5 ring-2 ring-sejong"
              : "bg-[#F4F5F7] hover:bg-[#EEF0F3]"
          )}
        >
          {file ? (
            <div className="flex items-center gap-3 text-foreground">
              <FileSpreadsheet className="size-5 text-sejong" />
              <span className="text-sm font-medium">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="파일 제거"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <p>파일 형식 : XLSX</p>
              <p>파일 용량 : 최대 1MB</p>
              <p className="mt-6">*업로드한 파일은 서버에 별도로 저장되지 않음*</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <p className="mt-6 text-sm">
          파일을 드래그하거나 클릭하여 선택해주세요!
        </p>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 h-12 w-40 rounded-full bg-sejong text-base font-bold text-sejong-foreground hover:bg-sejong/90"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          완료
        </Button>
      </div>
    </div>
  )
}
