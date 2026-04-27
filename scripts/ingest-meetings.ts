/**
 * Ingest Gemini-classified meeting data into Supabase impact_events table.
 *
 * Usage:
 *   npx tsx scripts/ingest-meetings.ts
 *   npx tsx scripts/ingest-meetings.ts --city mckinney
 *   npx tsx scripts/ingest-meetings.ts --dir ../CCAD\ Data/data/meetings
 *
 * Reads from: data/meetings/{city}/{year}.json  (Gemini output)
 * Writes to:  Supabase `impact_events` table
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateStableId(county: string, agendaItemId: string): string {
  const hash = crypto.createHash('sha256')
    .update(`${county}-${agendaItemId}`)
    .digest('hex')
  
  // Format as UUID: 8-4-4-4-12
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32)
  ].join('-')
}

// Host → county mapping (expand as more cities are added)
const HOST_COUNTY: Record<string, string> = {
  plano:            'collin',
  mckinney:         'collin',
  frisco:           'collin',
  allen:            'collin',
  celina:           'collin',
  prosper:          'collin',
  cityoflewisville: 'denton',
  denton:           'denton',
  aubrey:           'denton',
  carrolltontx:     'denton',
  cityofdallas:     'dallas',
  grandprairie:     'dallas',
  mesquite:         'dallas',
  garland:          'dallas',
  arlington:        'tarrant',
  fortworth:        'tarrant',
  fortworthgov:     'tarrant',
}

const BATCH_SIZE = 100

interface GeminiMeetingRecord {
  source_host: string
  source_city: string
  source_county?: string
  meeting_date: string
  meeting_type: string
  event_id: number
  agenda_item_id: number
  title: string
  summary_bullets: string[]
  impact_type: string
  has_numeric_impact: boolean
  rate_change_raw_text: string
  rate_current: number | null
  rate_proposed: number | null
  avg_dollar_impact_estimate: number
  source_pdf_url: string
  source_pdf_page: number
  confidence: string
  civic_iq_delta: number
}

function normalize(raw: GeminiMeetingRecord) {
  const host = raw.source_host?.toLowerCase() ?? ''
  const county = HOST_COUNTY[host] ?? raw.source_county?.toLowerCase() ?? 'unknown'
  const agendaItemId = String(raw.agenda_item_id)

  const rateDelta = raw.rate_current && raw.rate_proposed
    ? (raw.rate_proposed - raw.rate_current) / 100
    : null

  // Clean up the placeholder summary bullets Gemini produced
  const summaryBullets = raw.summary_bullets ?? []
  const isPlaceholder = summaryBullets.some(b =>
    b.startsWith('Classification:') || b === 'Automated summary based on agenda text.'
  )
  const summary = isPlaceholder
    ? raw.title                        // fall back to title if bullets are template noise
    : summaryBullets.join(' • ')

  return {
    id:               generateStableId(county, agendaItemId),
    county,
    source:           'legistar' as const,
    meeting_date:     raw.meeting_date,
    meeting_type:     raw.meeting_type,
    agenda_item_id:   agendaItemId,
    title:            raw.title?.slice(0, 200) ?? 'Untitled',
    summary,
    impact_type:      raw.impact_type ?? 'other',
    rate_change_pct:  rateDelta,
    avg_dollar_impact: raw.avg_dollar_impact_estimate || null,
    // Construct Legistar URL from host + agenda_item_id if Gemini didn't populate a direct PDF URL
    source_pdf_url:   raw.source_pdf_url ||
      (host && agendaItemId
        ? `https://${host}.legistar.com/LegislationDetail.aspx?ID=${agendaItemId}`
        : null),
    source_pdf_page:  raw.source_pdf_page ?? 1,
    confidence:       raw.confidence ?? 'low',
    civic_iq_delta:   raw.civic_iq_delta ?? 1,
    raw_llm_response: raw as unknown,
  }
}

async function ingestCity(cityDir: string, cityName: string) {
  const files = fs.readdirSync(cityDir)
    .filter(f => f.match(/^\d{4}\.json$/))
    .sort()

  if (files.length === 0) {
    console.log(`  ⚠️  No year files in ${cityName}`)
    return 0
  }

  let total = 0

  for (const file of files) {
    const year = file.replace('.json', '')
    const filePath = path.join(cityDir, file)
    const raw: GeminiMeetingRecord[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    // Skip records with no meaningful impact type
    const records = raw
      .filter(r => r.agenda_item_id && r.meeting_date)
      .map(normalize)

    if (records.length === 0) continue

    let inserted = 0
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('impact_events')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        console.error(`    ❌ ${year} batch ${i}: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    console.log(`    ✓ ${year}: ${inserted} / ${records.length} records`)
    total += inserted
  }

  return total
}

async function main() {
  const args = process.argv.slice(2)

  const dirArg = args.find(a => a.startsWith('--dir='))?.split('=')[1]
    ?? (args.indexOf('--dir') !== -1 ? args[args.indexOf('--dir') + 1] : null)

  const cityArg = args.find(a => a.startsWith('--city='))?.split('=')[1]
    ?? (args.indexOf('--city') !== -1 ? args[args.indexOf('--city') + 1] : null)

  const meetingsDir = dirArg
    ? path.resolve(dirArg)
    : path.join(__dirname, '..', 'CCAD Data', 'data', 'meetings')

  if (!fs.existsSync(meetingsDir)) {
    console.error(`❌ Meetings dir not found: ${meetingsDir}`)
    console.error(`   Pass --dir path/to/meetings or symlink data/meetings`)
    process.exit(1)
  }

  console.log(`🏛️  Wayntage Meeting Ingestion`)
  console.log(`   Source: ${meetingsDir}\n`)

  const cities = fs.readdirSync(meetingsDir)
    .filter(d => !d.startsWith('_') && !d.startsWith('.'))
    .filter(d => fs.statSync(path.join(meetingsDir, d)).isDirectory())
    .filter(d => !cityArg || d === cityArg)

  let grandTotal = 0

  for (const city of cities) {
    const cityDir = path.join(meetingsDir, city)
    console.log(`📅 ${city}`)
    const count = await ingestCity(cityDir, city)
    console.log(`   → ${count} total ingested\n`)
    grandTotal += count
  }

  console.log(`✅ Done. ${grandTotal} impact events ingested.`)
}

main().catch(console.error)
