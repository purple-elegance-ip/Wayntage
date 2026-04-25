import Nav from '@/components/Nav'
import CivicIQGauge from '@/components/CivicIQGauge'
import ImpactCard from '@/components/ImpactCard'
import AddressSearch from '@/components/AddressSearch'
import {
  mockImpactEvents,
  mockCivicIQ,
  mockProperty,
  mockDollarImpacts,
} from '@/lib/mock-data'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>
}) {
  const { address } = await searchParams
  const displayAddress = address ?? mockProperty.address

  // TODO: replace with real Supabase queries once DB is live
  // const property = await getPropertyByAddress(displayAddress)
  // const events   = await getImpactEventsForProperty(property)
  // const civicIQ  = await getCivicIQ(property.id)
  const events  = mockImpactEvents
  const civicIQ = mockCivicIQ

  const pending = events.filter(e =>
    ['tax_rate_change', 'bond_election', 'special_assessment'].includes(e.impact_type) &&
    new Date(e.meeting_date) > new Date('2026-01-01')
  )

  return (
    <>
      <Nav />

      <div className="min-h-screen bg-zinc-50 pt-14">
        {/* address bar */}
        <div className="border-b border-zinc-100 bg-white px-4 py-3">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">Showing impact for</p>
              <p className="truncate text-sm font-medium text-zinc-900">{displayAddress}</p>
            </div>
            <div className="hidden sm:block">
              <AddressSearch />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex gap-8 items-start">

            {/* left rail */}
            <aside className="hidden w-64 shrink-0 space-y-4 lg:block">
              <CivicIQGauge data={civicIQ} />

              {/* pending actions */}
              {pending.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
                    Pending decisions
                  </p>
                  <p className="text-2xl font-bold text-amber-700">
                    +${civicIQ.pending_impact.toLocaleString()}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    potential annual increase if all pass
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {pending.map(e => (
                      <li key={e.id} className="text-xs text-amber-800 flex items-start gap-1.5">
                        <span className="mt-0.5">·</span>
                        {e.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                  Property
                </p>
                <dl className="space-y-2">
                  <Row label="Assessed value" value={`$${mockProperty.assessed_value.toLocaleString()}`} />
                  <Row label="School district" value={mockProperty.school_district_code} />
                  <Row label="City" value={mockProperty.city} />
                  <Row label="Homestead exempt" value={mockProperty.homestead_exempt ? 'Yes' : 'No'} />
                  <Row label="Year built" value={String(mockProperty.year_built ?? '—')} />
                </dl>
              </div>
            </aside>

            {/* main feed */}
            <div className="flex-1 min-w-0">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Impact feed
                </h2>
                <span className="text-sm text-zinc-400">{events.length} events</span>
              </div>

              {/* mobile civic-iq */}
              <div className="mb-6 lg:hidden">
                <CivicIQGauge data={civicIQ} />
              </div>

              <div className="space-y-4">
                {events.map(event => (
                  <ImpactCard
                    key={event.id}
                    event={event}
                    dollarImpact={mockDollarImpacts[event.id]}
                  />
                ))}
              </div>

              {/* empty state placeholder */}
              {events.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <span className="text-4xl mb-4">🏛️</span>
                  <p className="font-medium text-zinc-700">No impact events yet</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    We&apos;ll notify you when something affects this address.
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
      <dd className="font-medium text-zinc-700">{value}</dd>
    </div>
  )
}
