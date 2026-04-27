'use client'

import { useState } from 'react'
import type { ImpactEvent, CadProperty, ImpactEventType } from '@/lib/types'
import { calculatePersonalImpact } from '@/lib/utils'

interface MeetingCardProps {
  meetingDate: string
  meetingType: string
  aiSummary: string
  events: ImpactEvent[]
  property: CadProperty
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function cleanTitle(title: string) {
  return title
    .replace(/^Conduct\s+(a\s+)?Public\s+Hearing\s+(to\s+)?(Consider|Discuss|Act|Consider\/Discuss\/Act)?\s*(on\s+)?/i, '')
    .replace(/^(Consider|Discuss|Act|Consider\/Discuss\/Act|Consideration|Discussion|Action)\s+on\s+(an?\s+)?(Ordinance|Resolution|Item|Request|Public Hearing|Order|Presentation)\s+(of\s+the\s+City\s+Council\s+)?(of\s+the\s+City\s+of\s+[A-Za-z]+)?\s*(amending|approving|authorizing|concerning|regarding|relating\s+to)?/i, '')
    .replace(/\.\.\.$/,'')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
    || title
}

// When there's no dollar amount, show what kind of impact this event represents.
// $0 is misleading — these events have indirect, deferred, or neighborhood-level effects.
const IMPACT_SIGNAL: Record<ImpactEventType, { label: string; classes: string; tooltip: string }> = {
  bond_election:          { label: 'Bond Vote',       classes: 'bg-blue-50 text-blue-700',    tooltip: 'Voter-approved debt — funds future projects, typically raises future tax rates' },
  zoning_change:          { label: 'Rezoning',         classes: 'bg-amber-50 text-amber-700',  tooltip: 'Land use changes near your area can affect property values' },
  infrastructure:         { label: 'Local Project',    classes: 'bg-violet-50 text-violet-700',tooltip: 'Road, utility, or park work in your area — affects neighborhood quality' },
  budget_approval:        { label: 'Budget Passed',    classes: 'bg-zinc-100 text-zinc-600',   tooltip: 'City spending plan approved — sets tax revenue priorities for the year' },
  tax_rate_change:        { label: 'Rate Held Flat',   classes: 'bg-emerald-50 text-emerald-700', tooltip: 'Tax rate unchanged — no bill increase this cycle' },
  special_assessment:     { label: 'Assessment',       classes: 'bg-orange-50 text-orange-700',tooltip: 'Special fee levied on properties in the affected area' },
  school_boundary_change: { label: 'School Boundary',  classes: 'bg-sky-50 text-sky-700',      tooltip: 'Attendance zone change — can affect school assignment and property values' },
  other:                  { label: 'Item',             classes: 'bg-zinc-100 text-zinc-400',   tooltip: '' },
}

// Pick the most significant event type in a meeting for the header badge
function primaryEventType(events: ImpactEvent[]): ImpactEventType {
  const priority: ImpactEventType[] = [
    'bond_election', 'tax_rate_change', 'special_assessment',
    'zoning_change', 'school_boundary_change', 'infrastructure',
    'budget_approval', 'other',
  ]
  for (const t of priority) {
    if (events.some(e => e.impact_type === t)) return t
  }
  return 'other'
}

const WEAK_PATTERNS = [
  "don't have enough detail", "cannot provide", "insufficient detail",
  "not enough information", "I don't have", "do not have enough",
]

export default function MeetingCard({ meetingDate, meetingType, aiSummary, events, property }: MeetingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const totalMeetingImpact = events.reduce((sum, e) => sum + calculatePersonalImpact(property, e), 0)
  const hasDollarImpact = Math.round(Math.abs(totalMeetingImpact)) > 0

  const usefulSummary = aiSummary && !WEAK_PATTERNS.some(p => aiSummary.toLowerCase().includes(p.toLowerCase()))
    ? aiSummary
    : null

  const topType = primaryEventType(events)
  const topSignal = IMPACT_SIGNAL[topType]

  return (
    <div className={`overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-all
      ${isExpanded ? 'ring-2 ring-zinc-100 shadow-md' : 'shadow-sm hover:shadow-md hover:border-zinc-200'}`}>

      {/* Meeting Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {meetingType}
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-200" />
              <time className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {formatDate(meetingDate)}
              </time>
            </div>

            {usefulSummary ? (
              <p className="text-sm text-zinc-700 leading-relaxed">
                {usefulSummary}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed">
                {events.length} agenda item{events.length !== 1 ? 's' : ''} — tap to review
              </p>
            )}
          </div>

          {/* Impact signal — dollars if we have them, type badge if we don't */}
          <div className="text-right shrink-0">
            {hasDollarImpact ? (
              <>
                <p className={`text-lg font-black ${totalMeetingImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {totalMeetingImpact > 0 ? '+' : '−'}${Math.round(Math.abs(totalMeetingImpact)).toLocaleString('en-US')}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">Est. annual impact</p>
              </>
            ) : (
              <span
                className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${topSignal.classes}`}
                title={topSignal.tooltip}
              >
                {topSignal.label}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center border-t border-zinc-50 pt-3">
          <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700">
            {isExpanded ? 'Collapse' : `See ${events.length} item${events.length !== 1 ? 's' : ''}`}
            <svg
              className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Items */}
      {isExpanded && (
        <div className="bg-zinc-50/50 border-t border-zinc-100 p-4 space-y-3">
          {events.map(event => {
            const impact = calculatePersonalImpact(property, event)
            const hasDollar = Math.round(Math.abs(impact)) > 0
            const signal = IMPACT_SIGNAL[event.impact_type]

            return (
              <div key={event.id} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-zinc-800 leading-snug">
                      {cleanTitle(event.title)}
                    </h4>
                  </div>

                  {/* Per-item: dollars or type badge */}
                  {hasDollar ? (
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${impact > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {impact > 0 ? '+' : '−'}${Math.round(Math.abs(impact)).toLocaleString('en-US')}
                      <span className="block text-[9px] font-medium opacity-70 text-center">/yr</span>
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${signal.classes}`}
                      title={signal.tooltip}
                    >
                      {signal.label}
                    </span>
                  )}
                </div>

                {/* Summary bullets — only if they add info beyond the title */}
                {(() => {
                  const bullets = event.summary.split(' • ').filter(b => b.trim() && b !== event.title)
                  return bullets.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {bullets.map((bullet, idx) => (
                        <li key={idx} className="text-xs text-zinc-500 flex gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-200" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null
                })()}

                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold ${signal.classes} rounded px-1.5 py-0.5`}>
                    {event.impact_type.replaceAll('_', ' ')}
                  </span>
                  {event.source_pdf_url && (
                    <a
                      href={event.source_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                    >
                      Official record ↗
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
