import { cn } from "@/lib/utils"

const SEJONG_RED = "#D50027"
const TRACK = "#E5E7EB"

interface GaugeProps {
  /** 0-100 */
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
  valueClassName?: string
}

// 하단이 열린 270° 게이지. 중앙에 퍼센트 표시.
export function Gauge({
  value,
  size = 140,
  strokeWidth = 14,
  color = SEJONG_RED,
  className,
  valueClassName,
}: GaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - strokeWidth) / 2
  const startAngle = -135
  const sweep = 270
  const pct = Math.max(0, Math.min(100, value))

  // 0 = 12시 방향, 시계방향 +각도
  const polar = (angle: number) => {
    const rad = (angle * Math.PI) / 180
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
  }
  const arc = (from: number, to: number) => {
    const s = polar(from)
    const e = polar(to)
    const large = to - from > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const valueAngle = startAngle + (sweep * pct) / 100

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        <path
          d={arc(startAngle, startAngle + sweep)}
          fill="none"
          stroke={TRACK}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={arc(startAngle, valueAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn("text-xl font-bold", valueClassName)}
          style={{ color }}
        >
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}
