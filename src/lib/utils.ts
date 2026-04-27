import { CadProperty, ImpactEvent, CivicIQ } from '@/lib/types'

export function calculatePersonalImpact(property: CadProperty, event: ImpactEvent): number {
  if (event.rate_change_pct) {
    return property.assessed_value * event.rate_change_pct
  }
  return event.avg_dollar_impact || 0
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
