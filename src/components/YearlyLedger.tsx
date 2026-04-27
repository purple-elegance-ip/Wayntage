'use client'

import { useState } from 'react'
import type { ImpactEvent, CadProperty } from '@/lib/types'
import ImpactCard from './ImpactCard'
import { calculatePersonalImpact } from '@/lib/data'

interface YearlyLedgerProps {
  year: number
  events: ImpactEvent[]
  property: CadProperty
  defaultOpen?: boolean
}

export default function YearlyLedger({ year, events, property, defaultOpen = false }: YearlyLedgerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const totalImpact = events.reduce((sum, e) => sum + calculatePersonalImpact(property, e), 0)
  const matchCount = events.filter(e => e.important).length
  
  const isFuture = year >= new Date().getFullYear()

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all">
      {/* Yearly Summary Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-zinc-50
          ${isOpen ? 'border-b border-zinc-100' : ''}`}
      >
        <div className="flex items-center gap-4">
          <div className={`flex flex-col items-center justify-center rounded-xl px-3 py-2 text-center
            ${isFuture ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
              {isFuture ? 'Next' : 'Year'}
            </span>
            <span className="text-xl font-black leading-none mt-1">{year}</span>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              {isFuture ? 'Proposed & Pending Actions' : `Historical Annual Impact`}
            </h3>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xs text-zinc-500">{events.length} events</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
              <span className="text-xs font-medium text-blue-600">{matchCount} direct matches</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className={`text-xl font-black ${totalImpact === 0 ? 'text-zinc-300' : totalImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalImpact === 0 ? '$0' : `${totalImpact > 0 ? '+' : '-'}$${Math.abs(totalImpact).toLocaleString()}`}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Total Est. Impact</p>
          </div>
          
          <svg 
            className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Events List */}
      {isOpen && (
        <div className="bg-zinc-50/50 p-4">
          <div className="space-y-4">
            {events.map(event => (
              <ImpactCard
                key={event.id}
                event={event}
                dollarImpact={calculatePersonalImpact(property, event)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
