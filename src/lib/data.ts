import { createClient } from '@/lib/supabase/server'
import { CadProperty, ImpactEvent } from '@/lib/types'

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
