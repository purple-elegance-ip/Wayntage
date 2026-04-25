# Wayntage — Data Pipeline Agent Instructions

You are Gemini. Your job is to complete the data ingestion and transformation
pipeline so that when the Supabase database is ready, all data can be loaded
in one command. Follow these tasks in order. Skip any task already done.

---

## TASK 1 — Clean up fake county CAD files

The files below are byte-for-byte copies of the Collin County data. Delete them
(or overwrite them with real data in Tasks 2–3).

Files to delete:
- `CCAD Data/data/cad/dallas/2025.json`
- `CCAD Data/data/cad/dallas/2025_summary.json`
- `CCAD Data/data/cad/denton/2025.json`
- `CCAD Data/data/cad/denton/2025_summary.json`
- `CCAD Data/data/cad/tarrant/2025.json`
- `CCAD Data/data/cad/tarrant/2025_summary.json`
- `CCAD Data/data/cad/ellis/2025.json`
- `CCAD Data/data/cad/ellis/2025_summary.json`
- `CCAD Data/data/cad/johnson/2025.json`
- `CCAD Data/data/cad/johnson/2025_summary.json`
- `CCAD Data/data/cad/kaufman/2025.json`
- `CCAD Data/data/cad/kaufman/2025_summary.json`
- `CCAD Data/data/cad/parker/2025.json`
- `CCAD Data/data/cad/parker/2025_summary.json`
- `CCAD Data/data/cad/rockwall/2025.json`
- `CCAD Data/data/cad/rockwall/2025_summary.json`
- `CCAD Data/data/cad/wise/2025.json`
- `CCAD Data/data/cad/wise/2025_summary.json`

---

## TASK 2 — Parse the real Denton CAD data

A parser script already exists. Run it:

```bash
python3 scripts/parse-denton-cad.py
```

This streams the 4.4 GB ZIP file and outputs:
- `CCAD Data/data/cad/denton/2026.json`   ← Denton properties in Wayntage schema
- `CCAD Data/data/cad/denton/2026_summary.json`

Takes ~5-10 minutes. Do not interrupt it.

Verify: the summary should show cities like DENTON, LEWISVILLE, FLOWER MOUND,
PLANO (Denton portion), THE COLONY, CARROLLTON, FRISCO (Denton portion).
Average assessed value should be $250K–$400K.

---

## TASK 3 — Download Dallas CAD data from data.texas.gov

Dallas CAD publishes bulk data on Texas Open Data Portal.

Search for the dataset:
- Go to: https://data.texas.gov/browse?Dataset-Category_Agency=Dallas+Central+Appraisal+District
- Find the residential property dataset for 2025 (look for "Appraisal" or "Property")
- Note the dataset ID (format like `xxxx-xxxx`)

Then download using the Socrata API (no auth needed):
```
https://data.texas.gov/resource/{DATASET_ID}.json?$limit=50000&$offset=0
```

Save all pages to `CCAD Data/data/cad/dallas/2025.json` — same schema format
as Collin (`propid`, `situsconcat`, `currvalassessed`, etc.).

If the Dallas dataset uses different field names, normalize them to match
the Collin format exactly. The `ingest-cad-data.ts` script handles both
camelCase and lowercase variants.

---

## TASK 4 — Download Tarrant CAD data from data.texas.gov

Same as Task 3 but for Tarrant CAD:
- Search: https://data.texas.gov/browse?Dataset-Category_Agency=Tarrant+Appraisal+District
- Save to: `CCAD Data/data/cad/tarrant/2025.json`

---

## TASK 5 — Expand Legistar meeting coverage (backfill to 2018)

The existing meeting data only covers 2022-2026 for a few cities. Expand it.

### Cities confirmed working on Legistar:
- `plano` → https://webapi.legistar.com/v1/plano/events
- `mckinney` → https://webapi.legistar.com/v1/mckinney/events
- `cityoflewisville` → https://webapi.legistar.com/v1/cityoflewisville/events
- `carrolltontx` → try https://webapi.legistar.com/v1/carrolltontx/events

### Cities to try (may or may not be on Legistar):
- frisco, allen, celina, prosper, denton, garland, irving, grandprairie,
  arlington, fortworth, rowlett, mesquite, duncanville, desoto, lancaster

For each city: GET `/v1/{host}/events?$filter=EventDate ge datetime'2018-01-01'&$orderby=EventDate asc&$top=1000&$skip=0`

If 200 OK and returns events → paginate through all years and fetch agenda items.
If 404 or empty → skip.

### For each meeting event:
1. GET `/v1/{host}/events/{EventId}/eventitems?AgendaNote=1&MinutesNote=1&Attachments=1`
2. For each item with a title, classify it:

**Classification rules** (apply in order, use the FIRST match):

| Keyword in title/agenda text | impact_type | confidence |
|---|---|---|
| "tax rate" + rate numbers (0.XXXX format) | tax_rate_change | high |
| "tax rate" (no numbers) | tax_rate_change | estimated |
| "bond" + dollar amount | bond_election | high |
| "bond" (no amount) | bond_election | estimated |
| "budget" + "ordinance" or "approval" | budget_approval | estimated |
| "zoning case" or "rezoning" or "SUP" or "PD" or "specific use" | zoning_change | high |
| "assessment" + dollar amount | special_assessment | high |
| "school boundary" or "attendance zone" | school_boundary_change | estimated |
| "pavement" or "road" or "water line" or "infrastructure" + dollar amount | infrastructure | estimated |
| anything else with financial language | other | low |
| purely procedural (call to order, pledge, public comment registration) | SKIP | — |

**Summary bullets**: Write 3 plain English bullets explaining impact to a homeowner.
Example for a tax rate change:
- "Collin County proposes raising the property tax rate from 0.1520 to 0.1534 per $100 assessed value"
- "For a home assessed at $400,000, this means roughly $56 more per year"
- "Public hearing scheduled before the vote — check the city website to comment"

**Rate extraction** (for tax_rate_change):
- Look for patterns: `0.XXXX per $100`, `$X.XXXX`, `XX cents per $100`
- Set `rate_current` and `rate_proposed` as floats
- Set `avg_dollar_impact_estimate` = (rate_proposed - rate_current) / 100 * 450000
  (uses $450K as Collin County average assessed value)

### Output format per city-year:
Save to `CCAD Data/data/meetings/{city}/{year}.json` as a JSON array:

```json
[
  {
    "source_host": "mckinney",
    "source_city": "McKinney",
    "source_county": "Collin",
    "meeting_date": "2023-08-15",
    "meeting_type": "City Council",
    "meeting_body_id": 195,
    "event_id": 5222,
    "agenda_item_id": 98522,
    "agenda_item_number": "6B",
    "title": "Consider ordinance adopting FY2023-24 tax rate",
    "summary_bullets": [
      "McKinney City Council proposes holding the tax rate at 0.4274 per $100 assessed value",
      "For a $400,000 home with homestead exemption, annual city taxes remain approximately $1,710",
      "Rate unchanged from prior year — no dollar impact increase for most homeowners"
    ],
    "impact_type": "tax_rate_change",
    "has_numeric_impact": true,
    "rate_change_raw_text": "0.4274 per $100",
    "rate_current": 0.4274,
    "rate_proposed": 0.4274,
    "rate_unit": "per_100",
    "avg_dollar_impact_estimate": 0.0,
    "affected_area": "citywide",
    "affected_zip_codes": [],
    "source_pdf_url": "https://legistar...",
    "source_pdf_page": 1,
    "confidence": "high",
    "civic_iq_delta": 3.0,
    "raw_agenda_text": "...",
    "classification_notes": "Wayntage AI v2"
  }
]
```

**Checkpoint/resume**: save processed `event_id` values to
`CCAD Data/data/meetings/{city}/checkpoint.json` so you can resume if interrupted.

**Rate limit**: wait 300ms between API calls to avoid hammering the Legistar API.

### When done with each city, update:
`CCAD Data/data/meetings/_index.json` with city, county, year range, and event count.

---

## TASK 6 — Verify data integrity

Run these checks and report results:

```python
import json, glob, os

# Check 1: CAD data
for f in glob.glob('CCAD Data/data/cad/*/2025.json') + glob.glob('CCAD Data/data/cad/*/2026.json'):
    county = f.split('/')[-2]
    data = json.load(open(f))
    cities = set(r.get('situscity','') for r in data[:100])
    print(f'{county}: {len(data):,} records | cities: {list(cities)[:3]}')

# Check 2: No duplicate county files (all should have distinct first prop_id)
prop_ids = {}
for f in glob.glob('CCAD Data/data/cad/*/2025.json') + glob.glob('CCAD Data/data/cad/*/2026.json'):
    county = f.split('/')[-2]
    data = json.load(open(f))
    first_id = data[0].get('propid', '?') if data else '?'
    if first_id in prop_ids:
        print(f'DUPLICATE: {county} has same first propid as {prop_ids[first_id]}')
    prop_ids[first_id] = county

# Check 3: Meeting data
index = json.load(open('CCAD Data/data/meetings/_index.json'))
for city in index['cities']:
    print(f'{city["host"]}: {city["impact_events"]} events, years={city["years"]}')
```

Report the output here so the developer can verify before database ingestion.

---

## TASK 7 — Write a final ingest manifest

Create `CCAD Data/INGEST_MANIFEST.json` listing every file ready to ingest,
with county, year, record count, and file path. Example:

```json
{
  "cad": [
    {"county": "collin", "year": 2025, "records": 388299, "file": "CCAD Data/data/cad/collin/2025.json"},
    {"county": "denton", "year": 2026, "records": 0, "file": "CCAD Data/data/cad/denton/2026.json"}
  ],
  "meetings": [
    {"city": "mckinney", "county": "collin", "years": [2022,2023,2024], "events": 1101, "dir": "CCAD Data/data/meetings/mckinney"}
  ],
  "generated_at": "2026-04-21T00:00:00Z",
  "ready_to_ingest": true
}
```

Set `ready_to_ingest: true` only if Tasks 1-6 are all complete and checks pass.

---

## Notes for Gemini

- All paths are relative to `/Users/zees/Documents/Wayntage/`
- Do not modify files in `src/` or `scripts/` — those are the developer's code
- Do not run `npm` or `npx` commands — only Python and curl/fetch
- The ingest scripts (`scripts/ingest-cad-data.ts`, `scripts/ingest-meetings.ts`)
  will be run by the developer after Supabase is set up
- If a Legistar API call returns HTTP 500, skip that city (it's not on Legistar)
- If a data.texas.gov dataset has more than 1M rows, paginate in chunks of 50,000
- Write clean JSON — no trailing commas, valid UTF-8
