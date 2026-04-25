import type { CivicIQ } from '@/lib/types'

const RISK_LABEL = {
  low: { text: 'Low zoning risk', color: 'text-emerald-600' },
  medium: { text: 'Medium zoning risk', color: 'text-amber-600' },
  high: { text: 'High zoning risk', color: 'text-red-600' },
}

const TREND_LABEL = {
  improving: { text: 'School district improving', icon: '↑', color: 'text-emerald-600' },
  stable: { text: 'School district stable', icon: '→', color: 'text-zinc-500' },
  declining: { text: 'School district declining', icon: '↓', color: 'text-red-600' },
}

function scoreColor(score: number) {
  if (score >= 70) return '#10b981'  // emerald
  if (score >= 40) return '#f59e0b'  // amber
  return '#ef4444'                   // red
}

function ArcGauge({ score }: { score: number }) {
  const r = 54
  const cx = 70
  const cy = 70
  const startAngle = 220
  const endAngle = -40
  const totalArc = startAngle - endAngle  // 260 degrees

  function polar(angle: number) {
    const rad = (angle * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
  }

  function arc(fromDeg: number, toDeg: number) {
    const from = polar(fromDeg)
    const to = polar(toDeg)
    const large = Math.abs(fromDeg - toDeg) > 180 ? 1 : 0
    return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 0 ${to.x} ${to.y}`
  }

  const filledEnd = startAngle - (score / 100) * totalArc
  const color = scoreColor(score)

  return (
    <svg viewBox="0 0 140 100" className="w-40 h-28">
      {/* track */}
      <path
        d={arc(startAngle, endAngle)}
        fill="none"
        stroke="#e4e4e7"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* fill */}
      <path
        d={arc(startAngle, filledEnd)}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* score text */}
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="26" fontWeight="700" fill={color}>
        {score}
      </text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fill="#71717a">
        CIVIC-IQ
      </text>
    </svg>
  )
}

export default function CivicIQGauge({ data }: { data: CivicIQ }) {
  const risk = RISK_LABEL[data.zoning_risk]
  const trend = TREND_LABEL[data.school_district_trend]

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center">
        <ArcGauge score={data.score} />
        <p className="mt-1 text-xs text-zinc-400">
          Based on {data.events_included} events · updated today
        </p>
      </div>

      <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
        <Row
          label="12-month exposure"
          value={`$${data.tax_exposure_12m.toLocaleString()}`}
          sub="in tax changes"
          valueClass="text-zinc-900 font-semibold"
        />
        <Row
          label="Pending decisions"
          value={data.pending_impact > 0 ? `+$${data.pending_impact.toLocaleString()}` : 'None'}
          sub="if all pass"
          valueClass={data.pending_impact > 0 ? 'text-amber-600 font-semibold' : 'text-zinc-400'}
        />
        <Row
          label="Zoning risk"
          value={risk.text}
          valueClass={risk.color}
        />
        <Row
          label="School trend"
          value={`${trend.icon} ${trend.text}`}
          valueClass={trend.color}
        />
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub?: string
  valueClass: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-right">
        <span className={`text-sm ${valueClass}`}>{value}</span>
        {sub && <span className="ml-1 text-xs text-zinc-400">{sub}</span>}
      </span>
    </div>
  )
}
