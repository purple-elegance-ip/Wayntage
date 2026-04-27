'use client'

import { useState } from 'react'
import type { ImpactEvent, CadProperty } from '@/lib/types'
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
    .replace(/^(Consider|Discuss|Act|Consider\/Discuss\/Act|Consideration|Discussion|Action)\s+on\s+(an\s+)?(Ordinance|Resolution|Item|Request|Public Hearing|Order|Presentation)\s+(of\s+the\s+City\s+Council\s+)?(of\s+the\s+City\s+of\s+[A-Za-z]+)?\s*(amending|approving|authorizing|concerning|regarding|relating\s+to)?/i, '')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

export default function MeetingCard({ meetingDate, meetingType, aiSummary, events, property }: MeetingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const totalMeetingImpact = events.reduce((sum, e) => sum + calculatePersonalImpact(property, e), 0)

  return (
    <div className={`overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-all
      ${isExpanded ? 'ring-2 ring-zinc-100 shadow-md' : 'shadow-sm hover:shadow-md hover:border-zinc-200'}`}>
      
      {/* Meeting Header & AI Summary */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {meetingType}
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-200" />
              <time className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {formatDate(meetingDate)}
              </time>
            </div>
            
            <h3 className="text-base font-bold text-zinc-900 leading-tight mb-2">
              Meeting Overview
            </h3>
            
            <p className="text-sm text-zinc-600 leading-relaxed italic">
              "{aiSummary || 'AI Summary pending... grouping relevant items below.'}"
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className={`text-lg font-black ${totalMeetingImpact === 0 ? 'text-zinc-300' : totalMeetingImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalMeetingImpact === 0 ? '$0' : `${totalMeetingImpact > 0 ? '+' : '-'}$${Math.abs(totalMeetingImpact).toLocaleString()}`}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-tighter text-zinc-400">Meeting Impact</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center border-t border-zinc-50 pt-3">
          <button className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700">
            {isExpanded ? 'Hide specific sections' : `Show ${events.length} impactful sections`}
            <svg 
              className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Sections (Agenda Items) */}
      {isExpanded && (
        <div className="bg-zinc-50/50 border-t border-zinc-100 p-4 space-y-3">
          {events.map(event => {
            const impact = calculatePersonalImpact(property, event)
            return (
              <div key={event.id} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      {event.impact_type.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-zinc-800 leading-snug">
                      {cleanTitle(event.title)}
                    </h4>
                  </div>
                  {impact !== 0 && (
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${impact > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {impact > 0 ? '+' : '-'}$${Math.abs(impact).toLocaleString()}
                    </span>
                  )}
                </div>
                
                <ul className="mt-2 space-y-1">
                  {event.summary.split(' • ').filter(b => b.trim() && b !== event.title).map((bullet, idx) => (
                    <li key={idx} className="text-xs text-zinc-500 flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-200" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                {event.source_pdf_url && (
                  <div className="mt-3 flex justify-end">
                    <a 
                      href={event.source_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                    >
                      View Source Document ↗
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
