import { createClient } from '@/lib/supabase/server'
import { CadProperty, ImpactEvent, CivicIQ } from '@/lib/types'

export async function getPropertyByAddress(address: string, exact = false): Promise<CadProperty | null> {
  const supabase = await createClient()
  
  // Clean up input
  const cleanAddress = address.trim().toUpperCase()

  // Try exact match first
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('address', cleanAddress)
    .limit(1)
    .single()
    
  if (data) return data as CadProperty

  if (exact) return null

  // Try a simple ILIKE if exact match fails
  const { data: fuzzyData } = await supabase
    .from('properties')
    .select('*')
    .ilike('address', `%${cleanAddress}%`)
    .limit(1)
    .single()
      
  return fuzzyData as CadProperty | null
}

export async function getImpactEventsForProperty(property: CadProperty): Promise<ImpactEvent[]> {
  const supabase = await createClient()
  
  // 1. Fetch all non-'other' events for the county
  // This drastically reduces the 224-page noise issue
  const { data, error } = await supabase
    .from('impact_events')
    .select('*')
    .eq('county', property.county)
    .neq('impact_type', 'other')
    .order('meeting_date', { ascending: false })
    
  if (error || !data) return []

  const rawEvents = data as ImpactEvent[]

  // 2. Filter and Score for Relevancy
  // We look for city and school district mentions in the title/summary
  const city = property.city.toUpperCase()
  const sd = property.school_district_code.toUpperCase()

  const filtered = rawEvents.map(event => {
    const text = (event.title + ' ' + event.summary).toUpperCase()
    
    // Scoring logic
    let score = 0
    if (text.includes(city)) score += 10
    if (text.includes(sd)) score += 10
    if (['tax_rate_change', 'bond_election'].includes(event.impact_type)) score += 5
    
    return { ...event, relevance: score }
  })
  .filter(e => e.relevance > 0) // Only show things that mention their city, SD, or are major tax events
  .sort((a, b) => b.relevance - a.relevance)
  .map(e => ({
    ...e,
    important: e.relevance >= 10
  }))

  return filtered as ImpactEvent[]
}

export function calculateCivicIQ(property: CadProperty, events: ImpactEvent[]): CivicIQ {
  // Base score 50
  // Each high-relevance event adds 2, low relevance adds 1
  let score = 50
  events.forEach(e => {
    score += (e.important ? 2 : 1)
  })
  
  score = Math.min(100, Math.max(0, score))
  
  // Calculate tax exposure (events with rate_change_pct)
  // Use property.assessed_value for a personalized estimate
  const taxExposure = events.reduce((sum, e) => {
    if (e.rate_change_pct) {
      return sum + (property.assessed_value * e.rate_change_pct)
    }
    return sum
  }, 0)
  
  // Pending impact (future dates)
  const now = new Date().toISOString().split('T')[0]
  const pendingImpact = events
    .filter(e => e.meeting_date > now)
    .reduce((sum, e) => {
      if (e.rate_change_pct) return sum + (property.assessed_value * e.rate_change_pct)
      return sum + (e.avg_dollar_impact || 0)
    }, 0)

  return {
    user_address_id: property.id,
    score,
    tax_exposure_12m: taxExposure,
    pending_impact: pendingImpact,
    zoning_risk: events.some(e => e.impact_type === 'zoning_change' && e.important) ? 'medium' : 'low',
    school_district_trend: 'stable',
    calculated_at: new Date().toISOString(),
    events_included: events.length
  }
}

export function calculatePersonalImpact(property: CadProperty, event: ImpactEvent): number {
  if (event.rate_change_pct) {
    return property.assessed_value * event.rate_change_pct
  }
  return event.avg_dollar_impact || 0
}
