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
  
  // Get events for the property's county
  // We can filter by city too if we want to be more specific
  const { data, error } = await supabase
    .from('impact_events')
    .select('*')
    .eq('county', property.county)
    .order('meeting_date', { ascending: false })
    
  if (error) return []
  return data as ImpactEvent[]
}

export function calculateCivicIQ(property: CadProperty, events: ImpactEvent[]): CivicIQ {
  // Simple heuristic for now:
  // - Base score 50
  // - +1 for each impact event
  // - Penalty for high tax rate changes
  
  const score = Math.min(100, Math.max(0, 50 + events.length))
  
  // Calculate tax exposure (events with rate_change_pct)
  const taxExposure = events.reduce((sum, e) => {
    if (e.rate_change_pct) {
      return sum + (property.assessed_value * e.rate_change_pct)
    }
    return sum
  }, 0)
  
  // Pending impact (future dates)
  const now = new Date().toISOString().split('T')[0]
  const pendingImpact = events
    .filter(e => e.meeting_date > now && e.avg_dollar_impact)
    .reduce((sum, e) => sum + (e.avg_dollar_impact || 0), 0)

  return {
    user_address_id: property.id,
    score,
    tax_exposure_12m: taxExposure,
    pending_impact: pendingImpact,
    zoning_risk: 'low',
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
