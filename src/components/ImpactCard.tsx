import type { ImpactEvent } from '@/lib/types'

const TYPE_META: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  tax_rate_change:      { label: 'Tax Rate',     icon: '📊', bg: 'bg-red-50',     text: 'text-red-700' },
  bond_election:        { label: 'Bond Vote',    icon: '🗳️',  bg: 'bg-purple-50',  text: 'text-purple-700' },
  zoning_change:        { label: 'Zoning',       icon: '🏗️',  bg: 'bg-blue-50',    text: 'text-blue-700' },
  budget_approval:      { label: 'Budget',       icon: '📋',  bg: 'bg-zinc-100',   text: 'text-zinc-700' },
  special_assessment:   { label: 'Assessment',   icon: '💰',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  school_boundary_change:{ label: 'School Zone', icon: '🏫',  bg: 'bg-green-50',   text: 'text-green-700' },
  infrastructure:       { label: 'Infrastructure',icon: '🔧', bg: 'bg-sky-50',     text: 'text-sky-700' },
  other:                { label: 'Civic',        icon: '🏛️',  bg: 'bg-zinc-100',   text: 'text-zinc-600' },
}

const CONFIDENCE_BADGE = {
  high:      { label: 'Confirmed',  cls: 'bg-emerald-50 text-emerald-700' },
  estimated: { label: 'Estimated',  cls: 'bg-amber-50 text-amber-700' },
  low:       { label: 'Low confidence', cls: 'bg-zinc-100 text-zinc-500' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ImpactCard({
  event,
  dollarImpact,
}: {
  event: ImpactEvent
  dollarImpact?: number | null
}) {
  const type = TYPE_META[event.impact_type] ?? TYPE_META.other
  const confidence = CONFIDENCE_BADGE[event.confidence]
  const bullets = event.summary.split(' • ')

  return (
    <article className="group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${type.bg}`}>
            {type.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${type.text}`}>
                {type.label}
              </span>
              {event.important && (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                  Match
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 leading-snug">
              {event.title}
            </h3>
          </div>
        </div>

        {/* dollar impact badge */}
        {dollarImpact != null && (
          <div className={`shrink-0 rounded-xl px-3 py-1.5 text-center ${dollarImpact === 0 ? 'bg-zinc-50' : dollarImpact > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <p className={`text-lg font-bold leading-none ${dollarImpact === 0 ? 'text-zinc-400' : dollarImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {dollarImpact === 0 ? '—' : `${dollarImpact > 0 ? '+' : '-'}$${Math.abs(dollarImpact).toLocaleString()}`}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">est. / yr</p>
          </div>
        )}
      </div>

      {/* bullets */}
      <ul className="mt-3 space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-600 leading-snug">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
            {b}
          </li>
        ))}
      </ul>

      {/* footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${confidence.cls}`}>
            {confidence.label}
          </span>
          <span className="text-[11px] text-zinc-400">{event.meeting_type}</span>
        </div>
        <div className="flex items-center gap-3">
          <time className="text-[11px] text-zinc-400">{formatDate(event.meeting_date)}</time>
          {event.source_pdf_url && (
            <a
              href={event.source_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700"
            >
              Source ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
