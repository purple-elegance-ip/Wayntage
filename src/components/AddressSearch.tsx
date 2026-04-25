'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  '1201 Parkside Pl, Celina, TX 75009',
  '4500 Eldorado Pkwy, McKinney, TX 75070',
  '8200 Preston Rd, Plano, TX 75024',
  '2800 Maumee Dr, Frisco, TX 75034',
]

export default function AddressSearch({ large = false }: { large?: boolean }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = SUGGESTIONS.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && value.length > 1
  )

  function handleSubmit(address: string) {
    if (!address.trim()) return
    setLoading(true)
    router.push(`/dashboard?address=${encodeURIComponent(address.trim())}`)
  }

  return (
    <div className="relative w-full max-w-xl">
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-white shadow-sm transition-shadow
          ${focused ? 'border-zinc-300 shadow-md ring-2 ring-zinc-100' : 'border-zinc-200'}
          ${large ? 'px-5 py-4' : 'px-4 py-3'}
        `}
      >
        <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit(value)}
          placeholder="Enter your home address..."
          className={`flex-1 bg-transparent outline-none placeholder-zinc-400
            ${large ? 'text-base' : 'text-sm'} text-zinc-900`}
        />
        <button
          onClick={() => handleSubmit(value)}
          disabled={loading || !value.trim()}
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white
            hover:bg-zinc-700 disabled:opacity-40 transition-colors"
        >
          {loading ? '…' : 'Check'}
        </button>
      </div>

      {/* suggestions dropdown */}
      {focused && filtered.length > 0 && (
        <ul className="absolute top-full mt-2 w-full rounded-xl border border-zinc-100 bg-white py-1 shadow-lg z-50">
          {filtered.map(s => (
            <li key={s}>
              <button
                onMouseDown={() => { setValue(s); handleSubmit(s) }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
