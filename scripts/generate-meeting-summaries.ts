import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

async function generateSummary(meeting: any, events: any[]) {
  const itemsText = events.map(e => `- [${e.impact_type.toUpperCase()}] ${e.title}: ${e.summary}`).join('\n')
  
  const prompt = `
    You are a civic intelligence analyst for Wayntage. 
    Summarize the overall impact of the following city council/commissioners meeting on local residents.
    Focus on financial impacts (taxes, budgets), zoning changes, and major infrastructure.
    Keep it to 2-3 concise, professional, but easy-to-read sentences. 
    Avoid bureaucratic boilerplate.
    
    Meeting: ${meeting.meeting_type} on ${meeting.meeting_date} (${meeting.county} County)
    
    Agenda Items:
    ${itemsText}
    
    Summary:
  `

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (e) {
    console.error(`Error generating summary for ${meeting.meeting_date}:`, e)
    return null
  }
}

async function main() {
  console.log('🏛️  Generating Meeting Summaries...')

  // 1. Fetch all unique meeting groups
  const { data: events, error } = await supabase
    .from('impact_events')
    .select('county, source, meeting_date, meeting_type, title, summary, impact_type')
    .neq('impact_type', 'other') // Only summarize impactful meetings
    .order('meeting_date', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    return
  }

  // 2. Group by meeting
  const groups: Record<string, any[]> = {}
  events.forEach(e => {
    const key = `${e.county}|${e.source}|${e.meeting_date}|${e.meeting_type}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  console.log(`Found ${Object.keys(groups).length} unique meetings with impactful events.`)

  // 3. Process each group
  let count = 0
  for (const [key, groupEvents] of Object.entries(groups)) {
    const [county, source, meeting_date, meeting_type] = key.split('|')
    
    // Check if summary already exists
    const { data: existing } = await supabase
      .from('meeting_summaries')
      .select('id')
      .match({ county, source, meeting_date, meeting_type })
      .single()

    if (existing) {
      // console.log(`✓ Summary exists for ${meeting_date} ${meeting_type}`)
      continue
    }

    console.log(`Generating summary for ${meeting_date} ${meeting_type}...`)
    const ai_summary = await generateSummary({ county, meeting_date, meeting_type }, groupEvents)
    
    if (ai_summary) {
      const { error: insertError } = await supabase
        .from('meeting_summaries')
        .upsert({
          county,
          source,
          meeting_date,
          meeting_type,
          ai_summary
        }, { onConflict: 'county,source,meeting_date,meeting_type' })

      if (insertError) {
        console.error(`❌ Error saving summary:`, insertError.message)
      } else {
        count++
        console.log(`✅ Saved: "${ai_summary.slice(0, 100)}..."`)
      }
    }
    
    // Rate limiting / safety delay
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`🎉 Done. Generated ${count} new summaries.`)
}

main().catch(console.error)
