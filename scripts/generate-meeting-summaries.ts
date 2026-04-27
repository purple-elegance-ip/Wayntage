import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Summaries matching these patterns are considered weak and will be re-generated
const WEAK_PATTERNS = [
  "don't have enough detail",
  "cannot provide",
  "insufficient detail",
  "not enough information",
  "I don't have",
  "do not have enough",
  "agenda item description is incomplete",
  "agenda titles are truncated",
]

function isWeakSummary(text: string): boolean {
  return WEAK_PATTERNS.some(p => text.toLowerCase().includes(p.toLowerCase()))
}

const SYSTEM_PROMPT = `You are a civic intelligence analyst for Wayntage, a platform that helps homeowners understand how local government decisions affect their finances.

Write a 2-3 sentence plain-English narrative of a city council meeting FOR A HOMEOWNER. Your target reader owns a home in this city and wants to know: does this affect my wallet or neighborhood?

RULES:
- If there are tax rate numbers (e.g. 0.4274 per $100), calculate the annual dollar impact for a $400,000 home and state it. Example: "The city held the property tax rate at 0.4274 per $100 — about $1,710/year on a $400K home."
- If a tax rate is proposed but unchanged, say so: "Council held rates flat — no change to your tax bill."
- If there's a bond, state the dollar amount and what it funds. Example: "Voters will decide on a $47M bond for road repairs."
- For zoning changes, describe location and what's proposed in plain English.
- For budget approvals, state the total and the main spending category.
- Lead with the most financially significant item.
- Never say "I don't have enough detail" — if data is thin, say what you CAN say: the meeting type, the date, the number of items considered.
- No bureaucratic language. Write like a knowledgeable neighbor explaining this over the fence.
- 2-3 sentences max. No bullet points. No preamble.

If the agenda titles are purely procedural (call to order, approval of minutes, public comment registration) with no financial content, respond with: "This meeting covered routine procedural items — no financial impact on homeowners."

Respond with only the summary text.`

async function generateSummary(
  meeting: { county: string; meeting_date: string; meeting_type: string },
  events: { impact_type: string; title: string; summary: string; rate_current?: number | null; rate_proposed?: number | null; avg_dollar_impact_estimate?: number | null }[]
): Promise<string | null> {
  const itemsText = events.map(e => {
    let line = `- [${e.impact_type.toUpperCase()}] ${e.title}`
    // Add rate data if available — this is the key signal Claude needs
    if (e.rate_current != null && e.rate_proposed != null) {
      line += ` | Rate: ${e.rate_current} → ${e.rate_proposed} per $100`
    }
    if (e.avg_dollar_impact_estimate != null && e.avg_dollar_impact_estimate !== 0) {
      line += ` | Est. impact: $${e.avg_dollar_impact_estimate.toFixed(0)}/yr on avg home`
    }
    // Include summary only if it's not just a repeat of the title
    if (e.summary && e.summary !== e.title) {
      line += `\n  Detail: ${e.summary.slice(0, 300)}`
    }
    return line
  }).join('\n')

  const userPrompt = `Meeting: ${meeting.meeting_type} — ${meeting.meeting_date} (${meeting.county} County)

Agenda Items:
${itemsText}

Write a 2-3 sentence homeowner-friendly summary:`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const block = message.content[0]
    return block.type === 'text' ? block.text.trim() : null
  } catch (e) {
    console.error(`  ❌ API error for ${meeting.meeting_date}:`, e)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const forceRegenerate = args.includes('--regen-weak')

  console.log('🏛️  Generating Meeting Summaries with Claude...')
  if (forceRegenerate) console.log('   Mode: re-generating weak summaries\n')

  // Fetch events WITH rate data so Claude can do the dollar math
  const { data: events, error } = await supabase
    .from('impact_events')
    .select('county, source, meeting_date, meeting_type, title, summary, impact_type, rate_change_pct, avg_dollar_impact, raw_llm_response')
    .neq('impact_type', 'other')
    .order('meeting_date', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    return
  }

  // Group by meeting
  const groups: Record<string, typeof events> = {}
  events.forEach(e => {
    const key = `${e.county}|${e.source}|${e.meeting_date}|${e.meeting_type}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  const total = Object.keys(groups).length
  console.log(`Found ${total} unique meetings with impactful events.\n`)

  let generated = 0
  let skipped = 0
  let regenerated = 0

  for (const [key, groupEvents] of Object.entries(groups)) {
    const [county, source, meeting_date, meeting_type] = key.split('|')

    // Check if summary already exists
    const { data: existing } = await supabase
      .from('meeting_summaries')
      .select('id, ai_summary')
      .match({ county, source, meeting_date, meeting_type })
      .single()

    if (existing) {
      // Skip unless it's a weak summary and we're in regen mode
      if (!forceRegenerate || !isWeakSummary(existing.ai_summary)) {
        skipped++
        continue
      }
      console.log(`[REGEN] ${meeting_date} ${meeting_type} (${county}) — weak summary detected`)
      regenerated++
    } else {
      console.log(`[${generated + regenerated + 1}/${total}] ${meeting_date} ${meeting_type} (${county})`)
    }

    const ai_summary = await generateSummary(
      { county, meeting_date, meeting_type },
      groupEvents.map(e => {
        const raw = (e as any).raw_llm_response ?? {}
        return {
          impact_type: e.impact_type,
          title: e.title,
          summary: e.summary,
          rate_current: raw.rate_current ?? null,
          rate_proposed: raw.rate_proposed ?? null,
          avg_dollar_impact_estimate: (e as any).avg_dollar_impact ?? raw.avg_dollar_impact_estimate ?? null,
        }
      })
    )

    if (ai_summary) {
      const { error: insertError } = await supabase
        .from('meeting_summaries')
        .upsert(
          { county, source, meeting_date, meeting_type, ai_summary },
          { onConflict: 'county,source,meeting_date,meeting_type' }
        )

      if (insertError) {
        console.error(`  ❌ ${insertError.message}`)
      } else {
        generated++
        console.log(`  ✅ "${ai_summary.slice(0, 130)}..."`)
      }
    }

    // Stay under Haiku rate limits
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n🎉 Done. ${generated} generated, ${regenerated} re-generated, ${skipped} skipped.`)
  if (!forceRegenerate) {
    console.log(`   Tip: run with --regen-weak to re-generate the "I don't have enough detail" summaries.`)
  }
}

main().catch(console.error)
