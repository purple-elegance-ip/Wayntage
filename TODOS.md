# Wayntage — Open TODOs

> Owner: Gemini (data pipeline) + Developer (app)
> Last updated: 2026-04-27

---

## DATA PIPELINE TODOs (Gemini)

### TODO-D1 — Expand meeting coverage to 2018
Current meeting data only covers 2022–2026 for a handful of cities.
Expand all confirmed Legistar cities back to 2018 per the instructions in AGENTS.md Task 5.

Priority cities:
- `plano`, `mckinney`, `cityoflewisville`, `carrolltontx` — confirmed on Legistar
- `frisco`, `allen`, `celina`, `prosper`, `denton` — try, may 404

Output: `CCAD Data/data/meetings/{city}/{year}.json`
After done: re-run `npx tsx scripts/ingest-meetings.ts` and `npx tsx scripts/generate-meeting-summaries.ts`

---

### TODO-D2 — Populate real Denton + Dallas CAD data
Fake CAD files (Denton, Dallas, Tarrant, and others) are byte-for-byte copies of Collin County data.
Run the Denton parser and download Dallas/Tarrant from data.texas.gov per AGENTS.md Tasks 1–4.

Impact: property lookups for Denton/Dallas addresses return the wrong assessed value → dollar
impact calculations are wrong for those users.

---

### TODO-D3 — Improve Gemini classification quality for rate extraction
~72% of non-`other` events have `avg_dollar_impact_estimate = 0` (no numeric impact extracted).
Many tax_rate_change events have `rate_current = null` and `rate_proposed = null` even when
the raw agenda text contains rates like "0.4274 per $100".

Fix: tighten the rate extraction regex in the Gemini classification prompt:
- Pattern: `(\d+\.\d{4})\s+per\s+\$?100`
- Also handle: `\$(\d+\.\d+)` (dollar-per-$100 notation), `(\d+)\s+cents\s+per\s+\$?100`
- Set `has_numeric_impact: true` whenever either rate is extracted

Re-classify existing records: re-run Gemini on all `tax_rate_change` events where
`rate_current IS NULL`, update `raw_llm_response`, then re-run `ingest-meetings.ts`.

---

### TODO-D4 — Add school district meeting data
School board meetings (MISD, PISD, FISD, etc.) are not yet in the pipeline.
These are high-signal for homeowners — bond elections and tax rate changes at the ISD level
often have larger dollar impacts than city council actions.

Legistar hosts some ISDs; others use BoardDocs or Granicus. Check:
- `mckinney-isd` on Legistar
- `plano-isd` on Legistar
- Fall back to scraping public agendas from district websites

Output: same `{year}.json` format, `source_county` = county, `impact_type` as normal.

---

### TODO-D5 — Backfill `source_pdf_url` for non-Legistar records
All current PDF links point to `{host}.legistar.com/LegislationDetail.aspx?ID={agenda_item_id}`.
These are meeting detail pages, not the actual PDFs. For cities that attach PDFs to agenda
items, the real URL is in `EventItemMatterAttachments[0].MatterAttachmentHyperlink` from the
Legistar API.

Fix: when fetching agenda items in Task 5, also fetch attachments and store the direct PDF URL
in `source_pdf_url` if available.

---

## APP TODOs (Developer)

### TODO-A1 — Add mid-string address search (contains mode)
Current fix uses prefix-match (`ilike('address', '${input}%')`).
The pg_trgm GIN index (`idx_properties_address_trgm`) is now deployed and supports full
contains-style search. When the prefix search returns 0 results, fall back to a
contains match (`ilike('address', '%${input}%')`). This handles users who type a street
name without the house number.

File: `src/components/AddressSearch.tsx` — `fetchSuggestions()`

---

### TODO-A2 — Add a loading skeleton to the dashboard
When the user navigates to `/dashboard?address=...`, the page does a server-side data fetch
(property lookup + events + meeting grouping + summaries). Currently renders nothing until
complete. Add a `loading.tsx` in `src/app/dashboard/` with a skeleton that matches the
YearlyLedger layout.

---

### TODO-A3 — Parallelize dashboard data fetching
`src/lib/data.ts` — `getMeetingGroupsForProperty` calls events then summaries sequentially.
The summary fetch can start earlier; consider returning events first and streaming in summaries
via a separate client fetch, or at minimum `Promise.all` the two DB calls where possible.

---

### TODO-A4 — Show "no results" state for unknown addresses
If the property lookup returns null, the dashboard falls back to a mock property with generic
Collin County data. Users who enter a Denton or Dallas address get Collin County results with
wrong dollar amounts. Show a clear "Address not found in our database" message instead of
silent fallback data.

File: `src/app/dashboard/page.tsx`

---

## AI USAGE EFFICIENCY NOTES

### Current setup
- Model: `claude-haiku-4-5` (generate-meeting-summaries.ts)
- Prompt caching: system prompt marked `cache_control: { type: 'ephemeral' }` — ~870 tokens
- Rate limit throttle: 300ms between API calls
- Batch mode: not used (sequential, one meeting at a time)

### Observed costs (approx, from session)
- ~186 meetings generated in the first full run
- ~88 summaries re-generated with `--regen-weak`
- Haiku input: $1/M tokens, output: $5/M tokens
- System prompt: ~870 tokens. With cache hits, cost ≈ $0.10/M (10% of uncached rate)
- Estimated total spend: ~$0.15–$0.30 for all summaries

### What's working
- **Prompt cache**: system prompt is stable (never changes between calls) — should be hitting
  cache on every call after the first. Verify by checking `usage.cache_read_input_tokens` in
  the API response.
- **Haiku is the right model** for this task: structured summarization from structured input,
  no reasoning needed, 2-3 sentence output target. Opus/Sonnet would 10-20x the cost for no
  quality gain here.

### Improvements to implement
1. **Use Batch API** for the initial bulk run (`POST /v1/messages/batches`).
   - 50% discount on input + output tokens
   - Can submit 500+ meetings in one batch call, results available within ~1 hour
   - Ideal for the weekly re-run after new meeting data is ingested
   - Keep streaming/sequential mode for on-demand re-generation (`--regen-weak`)

2. **Verify cache hit rate**: add `console.log` of `usage.cache_read_input_tokens` to confirm
   cache is being used. If 0, the system prompt may be changing between calls (e.g. timestamp
   in prompt). Current prompt is static — should be fine.

3. **Context reuse for same-city meetings**: meetings from the same city on the same day could
   be grouped and summarized in one call instead of one call per meeting. Reduces API calls ~3x
   for cities with multiple meetings per day. Trade-off: more complex prompt, harder to
   attribute summary to specific meeting.

4. **Smart re-generation trigger**: instead of `--regen-weak` (re-checks all summaries),
   add a `needs_resummary` boolean column to `meeting_summaries`. Set it to `true` when new
   events are ingested for that meeting. The summary script then only re-runs affected meetings.

5. **Model upgrade path**: if/when Haiku 4.7 releases, evaluate switching. Haiku 4.5 is the
   current budget tier. Sonnet 4.6 with adaptive thinking would improve quality for bond/zoning
   summaries that need inference, but at 3x cost. Not worth it now given data quality constraints
   (thin agenda text is the bottleneck, not model quality).
