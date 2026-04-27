import type { ImpactEvent, CivicIQ, UserAddress, CadProperty } from './types'

export const mockProperty: CadProperty = {
  id: 'landmark-celina-city-hall',
  county: 'collin',
  year: 2025,
  address: 'CELINA CITY HALL (DEMO MODE)',
  street_number: '142',
  street_name: 'N OHIO',
  street_suffix: 'ST',
  city: 'CELINA',
  zip: '75009',
  assessed_value: 1_250_000,
  market_value: 1_250_000,
  land_value: 250_000,
  improvement_value: 1_000_000,
  prev_assessed_value: 1_200_000,
  school_district_code: 'SCE',
  city_code: 'CCE',
  mud_code: '',
  entity_codes: ['GCN', 'JCN', 'SCE', 'CCE'],
  homestead_exempt: false,
  exemption_codes: [],
  prop_type: 'Commercial',
  prop_subtype: 'Public',
  year_built: 1920,
  owner_name: 'CITY OF CELINA',
  is_owner_occupied: false,
}

export const mockUserAddress: UserAddress = {
  id: 'ua-001',
  user_id: 'user-001',
  cad_property_id: 'landmark-celina-city-hall',
  county: 'collin',
  address: 'Celina City Hall',
  zip: '75009',
  assessed_value: 1_250_000,
  school_district_code: 'SCE',
  city_code: 'CCE',
  homestead_exempt: false,
  is_primary: true,
  created_at: '2026-01-15T00:00:00Z',
}

export const mockImpactEvents: ImpactEvent[] = [
  {
    id: 'evt-001',
    county: 'collin',
    source: 'legistar',
    meeting_date: '2026-03-18',
    meeting_type: 'Collin County Commissioners Court',
    agenda_item_id: 'CC-2026-0318-07',
    title: 'FY 2026 Tax Rate Adoption',
    summary: 'Collin County adopts a proposed tax rate of 0.1534 per $100 assessed value • Up from 0.1520 — a significant annual impact on commercial and public parcels • Public comment period open through April 5',
    impact_type: 'tax_rate_change',
    rate_change_pct: 0.000014,
    avg_dollar_impact: 175,
    source_pdf_url: 'https://legistar.com/collin/pdf/2026-0318-taxrate.pdf',
    source_pdf_page: 4,
    confidence: 'high',
    civic_iq_delta: 6.8,
    created_at: '2026-03-18T14:00:00Z',
  },
  {
    id: 'evt-002',
    county: 'collin',
    source: 'legistar',
    meeting_date: '2026-02-24',
    meeting_type: 'Celina City Council',
    agenda_item_id: 'CC-2026-0224-03',
    title: 'Downtown Master Plan Update',
    summary: 'City Council considers updates to the Downtown master plan affecting public facilities • Discussion includes potential expansion of municipal office space • Community impact analysis scheduled for May',
    impact_type: 'infrastructure',
    source_pdf_url: 'https://legistar.com/celina/pdf/2026-0224-rezoning.pdf',
    source_pdf_page: 2,
    confidence: 'high',
    civic_iq_delta: 3.2,
    created_at: '2026-02-24T19:00:00Z',
  }
]

export const mockCivicIQ: CivicIQ = {
  user_address_id: 'ua-001',
  score: 85,
  tax_exposure_12m: 175,
  pending_impact: 0,
  zoning_risk: 'low',
  school_district_trend: 'stable',
  calculated_at: '2026-04-21T00:00:00Z',
  events_included: 2,
}

export const mockDollarImpacts: Record<string, number | null> = {
  'evt-001': 175,
  'evt-002': 0,
}
