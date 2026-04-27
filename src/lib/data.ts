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
  return getEventsByCriteria(property.county, property.city, property.school_district_code)
}

export async function getEventsByZip(zip: string): Promise<{ events: ImpactEvent[], county: string }> {
  // Simple mapping for North Texas target corridor
  const ZIP_COUNTY_MAP: Record<string, string> = {
    '75009': 'collin', // Celina
    '75078': 'collin', // Prosper
    '75070': 'collin', // McKinney
    '75071': 'collin', // McKinney
    '75072': 'collin', // McKinney
    '75033': 'collin', // Frisco
    '75034': 'collin', // Frisco
    '75035': 'collin', // Frisco
    '75036': 'denton', // Frisco
    '75023': 'collin', // Plano
    '75024': 'collin', // Plano
    '75025': 'collin', // Plano
    '75093': 'collin', // Plano
    '75002': 'collin', // Allen
    '75013': 'collin', // Allen
    '75067': 'denton', // Lewisville
    '75077': 'denton', // Lewisville
    '76201': 'denton', // Denton
    '76205': 'denton', // Denton
    '76207': 'denton', // Denton
    '76208': 'denton', // Denton
    '76209': 'denton', // Denton
    '76210': 'denton', // Denton
    '75006': 'denton', // Carrollton
    '75007': 'denton', // Carrollton
    '75010': 'denton', // Carrollton
    '76227': 'denton', // Aubrey
  }

  const county = ZIP_COUNTY_MAP[zip] || 'collin' // Fallback to collin for demo
  const events = await getEventsByCriteria(county)
  return { events, county }
}

async function getEventsByCriteria(county: string, city?: string, schoolDistrict?: string): Promise<ImpactEvent[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('impact_events')
    .select('*')
    .eq('county', county)
    .neq('impact_type', 'other')
    .order('meeting_date', { ascending: false })
    
  if (error || !data) return []

  const rawEvents = data as ImpactEvent[]

  // Filter and Score
  const filtered = rawEvents.map(event => {
    const text = (event.title + ' ' + event.summary).toUpperCase()
    let score = 0
    
    if (city && text.includes(city.toUpperCase())) score += 10
    if (schoolDistrict && text.includes(schoolDistrict.toUpperCase())) score += 10
    
    // For zip-only search, we just want major tax events and anything in the county
    if (['tax_rate_change', 'bond_election', 'budget_approval'].includes(event.impact_type)) score += 5
    
    // If no city/SD provided (Zip fallback), we show everything non-'other' with a base score
    if (!city && !schoolDistrict) score += 1

    return { ...event, relevance: score }
  })
  .filter(e => e.relevance > 0)
  .sort((a, b) => b.relevance - a.relevance)
  .map(e => ({
    ...e,
    important: e.relevance >= 10
  }))

  return filtered as ImpactEvent[]
}
