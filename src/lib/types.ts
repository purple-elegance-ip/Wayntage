// ─── Property (from CAD data) ─────────────────────────────────────────────────

export type County = 'collin' | 'denton' | 'dallas' | 'tarrant' | 'rockwall' | 'kaufman' | 'ellis'

export interface CadProperty {
  id: string                  // propid from CAD
  county: County
  year: number
  // Address
  address: string             // situsconcat normalized
  street_number: string
  street_name: string
  street_suffix: string
  unit?: string
  city: string
  zip: string
  // Values
  assessed_value: number      // currvalassessed
  market_value: number        // currvalmarket
  land_value: number          // currvalland
  improvement_value: number   // currvalimprv
  prev_assessed_value: number
  // Taxing entities
  school_district_code: string  // entityschoolcode
  city_code: string             // entitycitycode
  mud_code?: string             // entitymud
  entity_codes: string[]        // entitycodes split
  // Exemptions
  homestead_exempt: boolean     // exempthmstdflag
  exemption_codes: string[]
  // Meta
  prop_type: string
  prop_subtype: string
  year_built?: number
  owner_name: string
  is_owner_occupied: boolean    // mailing addr matches situs addr
}

// ─── Legistar Impact Event ─────────────────────────────────────────────────────

export type ImpactEventType =
  | 'tax_rate_change'
  | 'zoning_change'
  | 'bond_election'
  | 'budget_approval'
  | 'special_assessment'
  | 'school_boundary_change'
  | 'infrastructure'
  | 'other'

export interface ImpactEvent {
  id: string
  county: County
  source: 'legistar' | 'school_district' | 'mud'
  meeting_date: string
  meeting_type: string
  agenda_item_id: string
  title: string
  summary: string               // 3-bullet plain English
  impact_type: ImpactEventType
  // Financial impact (if calculable)
  rate_change_pct?: number      // e.g. 0.0008 = 0.08% rate increase
  avg_dollar_impact?: number    // county-average dollar impact
  // Source validation
  source_pdf_url: string
  source_pdf_page: number       // page where number was found
  confidence: 'high' | 'estimated' | 'low'
  // Civic-IQ contribution
  civic_iq_delta: number        // how much this moves the Civic-IQ score
  important?: boolean           // whether to highlight this event
  created_at: string
}

export interface MeetingGroup {
  meeting_date: string
  meeting_type: string
  ai_summary?: string
  events: ImpactEvent[]
}

// ─── Thread (longitudinal issue tracking) ────────────────────────────────────

export interface Thread {
  id: string
  county: County
  title: string                 // e.g. "Frisco ISD Bond 2025"
  description: string
  started_at: string
  status: 'active' | 'resolved' | 'pending'
  impact_event_ids: string[]    // events that belong to this thread
  total_dollar_impact?: number  // cumulative across all events
  tags: string[]
}

// ─── User & Address ───────────────────────────────────────────────────────────

export interface UserAddress {
  id: string
  user_id: string
  cad_property_id: string       // links to CadProperty.id
  county: County
  address: string
  zip: string
  assessed_value: number
  school_district_code: string
  city_code: string
  mud_code?: string
  homestead_exempt: boolean
  is_primary: boolean
  created_at: string
}

// ─── Impact Card (delivered to user) ─────────────────────────────────────────

export interface ImpactCard {
  id: string
  impact_event_id: string
  user_address_id: string
  // Personalized calculation
  dollar_impact: number         // address-specific
  dollar_impact_confidence: 'exact' | 'estimated'
  calculation_breakdown: {
    assessed_value: number
    rate_change_pct: number
    homestead_adjustment: number
    result: number
  }
  // Delivery
  delivered_push: boolean
  delivered_email: boolean
  delivered_at?: string
  read_at?: string
  created_at: string
}

// ─── Civic-IQ Score ───────────────────────────────────────────────────────────

export interface CivicIQ {
  user_address_id: string
  score: number                 // 0-100
  // Components
  tax_exposure_12m: number      // total dollar impact last 12 months
  pending_impact: number        // total from pending decisions
  zoning_risk: 'low' | 'medium' | 'high'
  school_district_trend: 'improving' | 'stable' | 'declining'
  // Meta
  calculated_at: string
  events_included: number
}
