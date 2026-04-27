import Nav from '@/components/Nav'
import CivicIQGauge from '@/components/CivicIQGauge'
import AddressSearch from '@/components/AddressSearch'
import YearlyLedger from '@/components/YearlyLedger'
import {
  getPropertyByAddress,
  getImpactEventsForProperty,
} from '@/lib/data'
import {
  calculateCivicIQ,
} from '@/lib/utils'
import { mockProperty } from '@/lib/mock-data'
import { ImpactEvent } from '@/lib/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; exact?: string }>
}) {
  const { address, exact } = await searchParams
  
  let property = null
  if (address) {
    property = await getPropertyByAddress(address, exact === 'true')
  }
  
  // Fallback to mock if nothing found, for demo purposes
  const activeProperty = property || mockProperty
  const events = await getImpactEventsForProperty(activeProperty)
  const civicIQ = calculateCivicIQ(activeProperty, events)

  // Group events by year
  const groupedEvents = events.reduce((acc, event) => {
    const year = new Date(event.meeting_date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(event)
    return acc
  }, {} as Record<number, ImpactEvent[]>)

  const sortedYears = Object.keys(groupedEvents)
    .map(Number)
    .sort((a, b) => b - a)

  const currentYear = new Date().getFullYear()

  return (
    <>
      <Nav />

      <div className="min-h-screen bg-zinc-50 pt-14">
        {/* address bar */}
        <div className="border-b border-zinc-100 bg-white px-4 py-3">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">
                {property ? 'Showing impact for' : 'Address not found — showing demo data for'}
              </p>
              <p className="truncate text-sm font-medium text-zinc-900">{activeProperty.address}</p>
            </div>
            <div className="hidden sm:block">
              <AddressSearch />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex gap-8 items-start">

            {/* left rail */}
            <aside className="hidden w-64 shrink-0 space-y-4 lg:block lg:sticky lg:top-24">
              <CivicIQGauge data={civicIQ} />

              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                  Property details
                </p>
                <dl className="space-y-2">
                  <Row label="Assessed value" value={`$${activeProperty.assessed_value.toLocaleString()}`} />
                  <Row label="School district" value={activeProperty.school_district_code} />
                  <Row label="City" value={activeProperty.city} />
                  <Row label="Homestead exempt" value={activeProperty.homestead_exempt ? 'Yes' : 'No'} />
                  <Row label="Year built" value={String(activeProperty.year_built ?? '—')} />
                </dl>
              </div>
              
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">
                  Next 12 Months
                </p>
                <p className="text-2xl font-black text-blue-700">
                  +${civicIQ.pending_impact.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600/80 mt-1 leading-relaxed">
                  Total potential impact from upcoming votes and proposed rate changes.
                </p>
              </div>
            </aside>

            {/* main feed */}
            <div className="flex-1 min-w-0">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                    Impact Ledger
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Direct legislative impacts on your property value and costs.
                  </p>
                </div>
              </div>

              {/* mobile civic-iq */}
              <div className="mb-6 lg:hidden">
                <CivicIQGauge data={civicIQ} />
              </div>

              {/* Yearly Groups */}
              <div className="space-y-0">
                {sortedYears.map(year => (
                  <YearlyLedger
                    key={year}
                    year={year}
                    events={groupedEvents[year]}
                    property={activeProperty}
                    defaultOpen={year >= currentYear}
                  />
                ))}
              </div>

              {/* empty state placeholder */}
              {events.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-dashed border-zinc-200">
                  <span className="text-4xl mb-4 text-zinc-300">🏛️</span>
                  <p className="font-bold text-zinc-900">No matching events found</p>
                  <p className="mt-1 text-sm text-zinc-500 max-w-xs mx-auto">
                    We only show events that directly reference your city, school district, or have significant tax impacts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="font-bold text-zinc-800">{value}</dd>
    </div>
  )
}
