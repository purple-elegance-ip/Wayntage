import Nav from '@/components/Nav'
import AddressSearch from '@/components/AddressSearch'

const FEATURES = [
  {
    icon: '📊',
    title: 'Tax rate changes',
    body: 'Every proposed and adopted rate change — county, city, school, and MUD — translated to your actual dollar impact.',
  },
  {
    icon: '🏗️',
    title: 'Zoning & development',
    body: "New subdivisions, rezonings, and density changes near you before they make the news — and before they affect your resale.",
  },
  {
    icon: '🗳️',
    title: 'Bond elections',
    body: 'School and city bonds that pass or fail directly change your tax rate. Know the numbers before you vote.',
  },
]

const STATS = [
  { value: '388K+', label: 'properties tracked' },
  { value: '7', label: 'DFW counties' },
  { value: '2018', label: 'data going back to' },
]

export default function Home() {
  return (
    <>
      <Nav />

      <main className="flex flex-col">
        {/* Hero */}
        <section className="flex min-h-[92vh] flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4 pt-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Now covering Collin &amp; Denton counties
          </div>

          <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-zinc-900 leading-tight">
            Your community, clarified.<br />
            <span className="text-amber-500">Your advantage, secured.</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg text-zinc-500 leading-relaxed">
            Wayntage monitors every government meeting that affects your home —
            tax votes, rezonings, bond elections — and tells you exactly what it
            costs you.
          </p>

          <div className="mt-8 w-full max-w-xl">
            <AddressSearch large />
            <p className="mt-3 text-xs text-zinc-400">
              Free during beta · No account required to preview
            </p>
          </div>

          {/* stats */}
          <div className="mt-16 flex gap-12">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-zinc-900">{s.value}</p>
                <p className="mt-1 text-xs text-zinc-400 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-zinc-100 bg-white px-4 py-24">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">
              What we track
            </p>
            <h2 className="text-center text-3xl font-bold text-zinc-900 mb-12">
              Three decisions that move your tax bill
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              {FEATURES.map(f => (
                <div key={f.title} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="mt-4 font-semibold text-zinc-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For agents CTA */}
        <section className="border-t border-zinc-100 bg-zinc-900 px-4 py-20 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
            For real estate professionals
          </p>
          <h2 className="text-3xl font-bold mb-4">
            Give your buyers a Wayntage Report
          </h2>
          <p className="mx-auto max-w-lg text-zinc-400 text-base leading-relaxed mb-8">
            A pre-offer intelligence brief covering the property&apos;s 12-month tax history,
            pending decisions, and Civic-IQ score. Branded to you. Delivered in 60 seconds.
          </p>
          <button className="rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-zinc-900 hover:bg-amber-400 transition-colors">
            Request agent access →
          </button>
        </section>
      </main>
    </>
  )
}
