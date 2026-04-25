/**
 * Ingest CAD property data from Gemini-generated JSON files into Supabase.
 *
 * Usage:
 *   npx tsx scripts/ingest-cad-data.ts --county collin
 *   npx tsx scripts/ingest-cad-data.ts --all
 *
 * Reads from: ../data/cad/{county}/2025.json  (Gemini output)
 * Writes to:  Supabase `properties` table
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COUNTY_MAP: Record<string, string> = {
  collin: 'collin',
  denton: 'denton',
  dallas: 'dallas',
  tarrant: 'tarrant',
}

const DATA_DIR = path.join(__dirname, '..', 'data', 'cad')
const BATCH_SIZE = 500

function normalizeRecord(raw: Record<string, unknown>, county: string) {
  const situsNum   = String(raw.situsbldgnum  ?? raw.situsBldgNum  ?? '')
  const situsName  = String(raw.situsstreetname ?? raw.situsStreetName ?? '')
  const situsSuffix = String(raw.situsstreetsuffix ?? raw.situsStreetSuffix ?? '')
  const situsCity  = String(raw.situscity    ?? raw.situsCity    ?? '')
  const situsZip   = String(raw.situszip     ?? raw.situsZip     ?? '')
  const situsConcat = String(raw.situsconcat ?? raw.situsConcat  ?? '')

  const entityCodes = String(raw.entitycodes ?? raw.entityCodes ?? '')
  const exemptCodes = String(raw.exemptcodes ?? raw.exemptCodes ?? '')

  const ownerAddrZip = String(raw.owneraddrzip ?? raw.ownerAddrZip ?? '')
  const isOwnerOccupied = situsZip && ownerAddrZip
    ? situsZip.slice(0, 5) === ownerAddrZip.slice(0, 5)
    : false

  return {
    id:                   `${county}-${raw.propid ?? raw.propID}`,
    county,
    year:                 Number(raw.propyear ?? raw.propYear ?? 2025),
    address:              situsConcat,
    street_number:        situsNum,
    street_name:          situsName,
    street_suffix:        situsSuffix,
    unit:                 String(raw.situsunit ?? raw.situsUnit ?? '') || null,
    city:                 situsCity,
    zip:                  situsZip,
    assessed_value:       Number(raw.currvalassessed ?? raw.currValAssessed ?? 0),
    market_value:         Number(raw.currvalmarket   ?? raw.currValMarket   ?? 0),
    land_value:           Number(raw.currvalland     ?? raw.currValLand     ?? 0),
    improvement_value:    Number(raw.currvalimprv    ?? raw.currValImprv    ?? 0),
    prev_assessed_value:  Number(raw.prevvalassessed ?? raw.prevValAssessed ?? 0),
    school_district_code: String(raw.entityschoolcode ?? raw.entitySchoolCode ?? '') || null,
    city_code:            String(raw.entitycitycode   ?? raw.entityCityCode   ?? '') || null,
    mud_code:             String(raw.entitymud        ?? raw.entityMUD        ?? '') || null,
    entity_codes:         entityCodes ? entityCodes.split(',').map(s => s.trim()) : [],
    homestead_exempt:     String(raw.exempthmstdflag ?? raw.exemptHmstdFlag ?? 'false') === 'true',
    exemption_codes:      exemptCodes ? exemptCodes.split(',').map(s => s.trim()) : [],
    prop_type:            String(raw.proptype    ?? raw.propType    ?? ''),
    prop_subtype:         String(raw.propsubtype ?? raw.propSubType ?? ''),
    year_built:           raw.imprvyearbuilt ? Number(raw.imprvyearbuilt) : null,
    owner_name:           String(raw.ownername  ?? raw.ownerName  ?? ''),
    is_owner_occupied:    isOwnerOccupied,
  }
}

async function ingestCounty(county: string) {
  const filePath = path.join(DATA_DIR, county, '2025.json')

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  No data file for ${county} at ${filePath} — skipping`)
    return
  }

  console.log(`\n📂 Loading ${county} data...`)
  const raw: Record<string, unknown>[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  // Filter residential only
  const residential = raw.filter(r => {
    const subtype = String(r.propsubtype ?? r.propSubType ?? '').toLowerCase()
    return subtype.includes('residential') || subtype.includes('single family')
  })

  console.log(`   ${raw.length.toLocaleString()} total → ${residential.length.toLocaleString()} residential`)

  const records = residential.map(r => normalizeRecord(r, county))

  // Upsert in batches
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('properties')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`   ❌ Batch ${i}-${i + BATCH_SIZE} failed:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`   ✓ ${inserted.toLocaleString()} / ${records.length.toLocaleString()}\r`)
    }
  }

  console.log(`\n   ✅ ${county}: ${inserted.toLocaleString()} properties ingested`)
}

async function main() {
  const args = process.argv.slice(2)
  const all = args.includes('--all')
  const countyArg = args.find(a => a.startsWith('--county='))?.split('=')[1]
    ?? (args.indexOf('--county') !== -1 ? args[args.indexOf('--county') + 1] : null)

  const counties = all
    ? Object.keys(COUNTY_MAP)
    : countyArg
      ? [countyArg]
      : ['collin']

  console.log(`🏠 Wayntage CAD Ingestion`)
  console.log(`   Counties: ${counties.join(', ')}`)
  console.log(`   Data dir: ${DATA_DIR}\n`)

  for (const county of counties) {
    await ingestCounty(county)
  }

  console.log('\n🎉 Done.')
}

main().catch(console.error)
