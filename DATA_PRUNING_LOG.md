# Data Pruning Rationale & Log

## Overview
To maintain high performance and stay within Supabase storage limits (500MB free tier), we implement pruning strategies to remove "low-signal" data.

## Pruning Rules

### 1. Ultra-Low-Value Properties
**Threshold:** `assessed_value < $50,000`
**Rationale:**
- **Signal-to-Noise:** Properties valued under $50k in the North Texas area (Collin, Denton, Tarrant) are rarely primary residential homes. They are typically common areas, utility easements, slivers of land, or parking parcels.
- **Target Audience:** Our primary value proposition is tracking tax and zoning impacts for homeowners. Homeowners in these counties almost exclusively own properties valued significantly higher.
- **Storage Efficiency:** Removing these records reduces the index size and table bloat without impacting the user experience for 99% of the target demographic.

## Execution Log

| Date | Action | Records Removed | Notes |
|------|--------|-----------------|-------|
| 2026-04-26 | Removed properties < $50k | 27,444 | Initial database cleanup. Collin: 11,834, Denton: 12,947, Tarrant: 2,663. |
| 2026-04-26 | Shelved Tarrant County | 570,308 | Focused data strategy on Collin/Denton corridor (Celina, Prosper, McKinney, etc.). Removed ~52% of total rows to stay under storage limits. |
