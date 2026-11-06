import { createContext, useContext, useEffect, useState } from "react"
import type { TranscriptResult } from "@/lib/api"

// 성적표를 학생 ID에 묶어 저장 (다른 학생 데이터 혼선 방지)
interface StoredTranscript {
  studentId: number
  result: TranscriptResult
}

interface TranscriptContextValue {
  stored: StoredTranscript | null
  setTranscript: (studentId: number, result: TranscriptResult) => void
  clearTranscript: () => void
}

const STORAGE_KEY = "hackathon.transcript"

const TranscriptContext = createContext<TranscriptContextValue | null>(null)

export function TranscriptProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredTranscript | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      // 구버전(스튜던트 ID 없던) 데이터는 무시
      if (parsed && parsed.studentId != null && parsed.result) {
        return parsed as StoredTranscript
      }
      return null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    else localStorage.removeItem(STORAGE_KEY)
  }, [stored])

  const setTranscript = (studentId: number, result: TranscriptResult) =>
    setStored({ studentId, result })
  const clearTranscript = () => setStored(null)

  return (
    <TranscriptContext.Provider
      value={{ stored, setTranscript, clearTranscript }}
    >
      {children}
    </TranscriptContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranscript() {
  const ctx = useContext(TranscriptContext)
  if (!ctx)
    throw new Error("useTranscript must be used within TranscriptProvider")
  return ctx
}

// 현재 학생(studentId)의 성적표만 반환 (남의 것이면 null)
// eslint-disable-next-line react-refresh/only-export-components
export function transcriptFor(
  stored: StoredTranscript | null,
  studentId: number | string | undefined
): TranscriptResult | null {
  if (!stored || !studentId) return null;
  return String(stored.studentId) === String(studentId) ? stored.result : null
}
