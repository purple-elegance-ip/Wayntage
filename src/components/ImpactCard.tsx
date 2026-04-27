'use client'

import { useState } from 'react'
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

/**
 * Strips common legislative boilerplate from titles to get to the core subject.
 */
function cleanTitle(title: string) {
  return title
    .replace(/^(Consider|Discuss|Act|Consider\/Discuss\/Act|Consideration|Discussion|Action)\s+on\s+(an\s+)?(Ordinance|Resolution|Item|Request|Public Hearing|Order|Presentation)\s+(of\s+the\s+City\s+Council\s+)?(of\s+the\s+City\s+of\s+[A-Za-z]+)?\s*(amending|approving|authorizing|concerning|regarding|relating\s+to)?/i, '')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()) // Re-capitalize first letter
}

export default function ImpactCard({
  event,
  dollarImpact,
}: {
  event: ImpactEvent
  dollarImpact?: number | null
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const type = TYPE_META[event.impact_type] ?? TYPE_META.other
  const confidence = CONFIDENCE_BADGE[event.confidence]
  
  const displayTitle = cleanTitle(event.title)
  const bullets = event.summary.split(' • ').filter(b => b.trim() && b !== event.title)
  
  const hasDetails = bullets.length > 0 || event.source_pdf_url

  return (
    <article 
      onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      className={`group rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition-all
        ${hasDetails ? 'cursor-pointer hover:shadow-md hover:border-zinc-200' : ''}
        ${isExpanded ? 'ring-2 ring-zinc-100' : ''}`}
    >
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
            <h3 className={`text-sm font-semibold text-zinc-900 leading-snug ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {displayTitle}
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
      {(isExpanded || bullets.length > 0) && (
        <ul className={`mt-3 space-y-1.5 ${!isExpanded && bullets.length > 0 ? 'line-clamp-2' : ''}`}>
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-600 leading-snug">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
              {b}
            </li>
          ))}
          {bullets.length === 0 && isExpanded && (
            <li className="text-xs italic text-zinc-400">No additional summary bullets available for this item.</li>
          )}
        </ul>
      )}

      {/* footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-50 pt-4">
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
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            >
              PDF ↗
            </a>
          )}
        </div>
      </div>
      
      {isExpanded && event.title !== displayTitle && (
        <div className="mt-4 rounded-xl bg-zinc-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Full Original Title</p>
          <p className="text-xs text-zinc-500 leading-relaxed">{event.title}</p>
        </div>
      )}
    </article>
  )
}
