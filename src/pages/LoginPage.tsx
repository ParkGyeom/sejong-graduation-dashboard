import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth"
import { login as loginApi, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { BrandHeader } from "@/components/BrandHeader"
import sejongLogo from "@/assets/sejong-logo.svg"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = userId.trim() !== "" && password !== "" && agreed && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    try {
      const student = await loginApi({ userId: userId.trim(), password })
      login(student)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("학번 또는 비밀번호가 올바르지 않습니다.")
      } else {
        setError(
          err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다."
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    "h-13 rounded-md rounded-b-none border-0 border-b border-[#C9CDD2] bg-[#F4F5F7] px-4 text-sm shadow-none focus-visible:border-sejong focus-visible:ring-0"

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <BrandHeader />

      {/* 본문 */}
      <div className="flex flex-1 flex-col items-center px-4 py-20">
          <img src={sejongLogo} alt="세종대학교 로고" className="size-20" />
          <h2 className="mt-4 text-3xl font-bold">졸업까지, 한눈에</h2>
          <p className="mt-1 text-muted-foreground">나의 이수 현황과 졸업 인증을 확인하세요.</p>

          <form
            onSubmit={handleSubmit}
            className="mt-12 flex w-full max-w-md flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="userId" className="text-sm font-semibold">
                학번/아이디
              </Label>
              <Input
                id="userId"
                placeholder="학번을 입력해주세요."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="username"
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                비밀번호
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="세종대학교 포털 비밀번호를 입력해주세요."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  className={cn(inputClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
              />
              <Label htmlFor="agree" className="text-sm font-normal">
                개인정보 수집에 동의합니다.
              </Label>
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-14 rounded-full bg-sejong text-base font-bold text-sejong-foreground hover:bg-sejong/90"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              로그인
            </Button>
          </form>
      </div>
    </div>
  )
}
