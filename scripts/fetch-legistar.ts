/**
 * Fetch new agendas from Legistar (multiple clients) and run the impact pipeline.
 *
 * Pipeline:
 *   1. Poll Legistar API for new meeting events
 *   2. Download agenda PDFs
 *   3. Gemini Flash: classify Impact Events + locate relevant sections
 *   4. Deterministic parser: extract exact numbers from tax tables
 *   5. Save Impact Events to Supabase
 *
 * Usage:
 *   npx tsx scripts/fetch-legistar.ts
 *   npx tsx scripts/fetch-legistar.ts --client mckinney --since 2026-01-01
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import minimist from 'minimist'

const args = minimist(process.argv.slice(2))
const targetClient = args.client
const sinceDate = args.since || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const CLIENTS = ['collin', 'friscotexas', 'allen', 'allentx', 'mckinney']

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })

// ─── Step 1: Fetch recent meetings from Legistar API ─────────────────────────

async function fetchRecentMeetings(client: string, since: string) {
  const apiBase = `https://webapi.legistar.com/v1/${client}`
  const url = `${apiBase}/events?$filter=EventDate ge datetime'${since}'&$orderby=EventDate desc`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Legistar API error for ${client}: ${res.status}`)
  return res.json()
}

// ─── Step 2: Get agenda items for a meeting ───────────────────────────────────

async function fetchAgendaItems(client: string, eventId: number) {
  const apiBase = `https://webapi.legistar.com/v1/${client}`
  const url = `${apiBase}/events/${eventId}/eventitems?AgendaNote=1&MinutesNote=1&Attachments=1`
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

// ─── Step 3: Gemini classification prompt ────────────────────────────────────

const CLASSIFICATION_PROMPT = `
You are analyzing a local government meeting agenda item.

Classify this agenda item and locate the relevant section for financial impact extraction.

Return a JSON object with these fields:
{
  "is_impact_event": boolean,          // true if this affects residents financially or by zoning
  "impact_type": string,               // one of: tax_rate_change, zoning_change, bond_election, budget_approval, special_assessment, school_boundary_change, infrastructure, other
  "title": string,                     // plain English title (max 10 words)
  "summary_bullets": string[],         // exactly 3 plain English bullets explaining impact to a homeowner
  "has_numeric_impact": boolean,       // true if there's a specific tax rate, percentage, or dollar amount
  "relevant_section_description": string, // describe WHERE in the document the number appears (e.g. "Table on page 4 shows proposed vs current tax rate")
  "relevant_page_numbers": number[],   // PDF page numbers containing the key data
  "confidence": "high" | "estimated" | "low"
}

Return ONLY valid JSON. No markdown, no explanation.

AGENDA ITEM:
`

async function classifyWithGemini(agendaText: string) {
  const result = await model.generateContent(CLASSIFICATION_PROMPT + agendaText)
  const text = result.response.text().trim()
  try {
    return JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
  } catch {
    return null
  }
}

// ─── Step 4: Deterministic numeric extraction ─────────────────────────────────

function extractTaxRateFromText(text: string): number | null {
  const patterns = [
    /(\d+\.\d{4})\s*(?:per\s*\$100|\/\$100)/i,
    /tax\s+rate[:\s]+(\d+\.\d{4})/i,
    /proposed\s+rate[:\s]+(\d+\.\d{4})/i,
    /(\d+\.\d{4})\s*(?:cents?\s*per|\$\/)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return parseFloat(match[1])
  }
  return null
}

// ─── Step 5: Save impact event ────────────────────────────────────────────────

async function saveImpactEvent(event: {
  county: string
  meeting_date: string
  meeting_type: string
  agenda_item_id: string
  title: string
  summary: string
  impact_type: string
  rate_change_pct: number | null
  source_pdf_url: string
  source_pdf_page: number
  confidence: string
  raw_llm_response: unknown
}) {
  const { error } = await supabase
    .from('impact_events')
    .upsert(
      { ...event, civic_iq_delta: event.rate_change_pct ? Math.abs(event.rate_change_pct * 1000) : 1 },
      { onConflict: 'agenda_item_id' }
    )
  if (error) console.error('  ❌ Save error:', error.message)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const clientsToProcess = targetClient ? [targetClient] : CLIENTS

  console.log(`🏛️  Wayntage Legistar Ingestion`)
  console.log(`   Since:  ${sinceDate}\n`)

  for (const client of clientsToProcess) {
    console.log(`\n--- Processing Client: ${client} ---`)
    try {
      const meetings = await fetchRecentMeetings(client, sinceDate)
      console.log(`   Found ${meetings.length} meetings\n`)

      for (const meeting of meetings) {
        console.log(`📅 ${meeting.EventDate?.split('T')[0]} — ${meeting.EventBodyName}`)
        const items = await fetchAgendaItems(client, meeting.EventId)

        for (const item of items) {
          if (!item.EventItemTitle) continue
          const agendaText = [
            item.EventItemTitle,
            item.EventItemAgendaNote,
            item.EventItemMinutesNote,
          ].filter(Boolean).join('\n\n')

          const classification = await classifyWithGemini(agendaText)
          if (!classification?.is_impact_event) continue

          console.log(`  ✦ [${classification.impact_type}] ${classification.title}`)

          const rateChange = classification.has_numeric_impact
            ? extractTaxRateFromText(agendaText)
            : null

          const pdfUrl = item.EventItemAttachments?.[0]?.MatterAttachmentHyperlink ?? ''
          const pdfPage = classification.relevant_page_numbers?.[0] ?? 1

          await saveImpactEvent({
            county:           client === 'collin' ? 'collin' : 'unknown',
            meeting_date:     meeting.EventDate?.split('T')[0],
            meeting_type:     meeting.EventBodyName,
            agenda_item_id:   String(item.EventItemId),
            title:            classification.title,
            summary:          classification.summary_bullets?.join(' • ') ?? '',
            impact_type:      classification.impact_type,
            rate_change_pct:  rateChange,
            source_pdf_url:   pdfUrl,
            source_pdf_page:  pdfPage,
            confidence:       classification.confidence,
            raw_llm_response: classification,
          })
        }
      }
    } catch (err) {
      console.error(`   ❌ Error processing ${client}:`, err.message)
    }
  }

  console.log('\n✅ Pipeline complete.')
}

main().catch(console.error)
