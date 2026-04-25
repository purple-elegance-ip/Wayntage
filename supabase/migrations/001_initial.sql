-- Wayntage — Initial Schema
-- Run: supabase db push

-- ─── Properties (from CAD bulk data) ─────────────────────────────────────────
create table if not exists properties (
  id              text primary key,           -- propid from CAD
  county          text not null,
  year            int  not null,
  address         text not null,
  street_number   text,
  street_name     text,
  street_suffix   text,
  unit            text,
  city            text not null,
  zip             text not null,
  assessed_value  bigint not null default 0,
  market_value    bigint not null default 0,
  land_value      bigint not null default 0,
  improvement_value bigint not null default 0,
  prev_assessed_value bigint not null default 0,
  school_district_code text,
  city_code       text,
  mud_code        text,
  entity_codes    text[],
  homestead_exempt boolean not null default false,
  exemption_codes text[],
  prop_type       text,
  prop_subtype    text,
  year_built      int,
  owner_name      text,
  is_owner_occupied boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists properties_zip     on properties(zip);
create index if not exists properties_city    on properties(city);
create index if not exists properties_county  on properties(county);
create index if not exists properties_school  on properties(school_district_code);
create index if not exists properties_address on properties using gin(to_tsvector('english', address));

-- ─── Impact Events (from Legistar pipeline) ───────────────────────────────────
create table if not exists impact_events (
  id                  uuid primary key default gen_random_uuid(),
  county              text not null,
  source              text not null default 'legistar',
  meeting_date        date not null,
  meeting_type        text,
  agenda_item_id      text,
  title               text not null,
  summary             text not null,
  impact_type         text not null,
  rate_change_pct     numeric(10, 8),
  avg_dollar_impact   numeric(10, 2),
  source_pdf_url      text,
  source_pdf_page     int,
  confidence          text not null default 'estimated',
  civic_iq_delta      numeric(5, 2) not null default 0,
  raw_llm_response    jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists events_county      on impact_events(county);
create index if not exists events_meeting_date on impact_events(meeting_date desc);
create index if not exists events_type        on impact_events(impact_type);

-- ─── Threads (longitudinal issue tracking) ────────────────────────────────────
create table if not exists threads (
  id                  uuid primary key default gen_random_uuid(),
  county              text not null,
  title               text not null,
  description         text,
  started_at          date not null,
  status              text not null default 'active',
  total_dollar_impact numeric(10, 2),
  tags                text[],
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists thread_events (
  thread_id   uuid references threads(id) on delete cascade,
  event_id    uuid references impact_events(id) on delete cascade,
  primary key (thread_id, event_id)
);

-- ─── User Addresses ───────────────────────────────────────────────────────────
create table if not exists user_addresses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  property_id         text references properties(id),
  county              text not null,
  address             text not null,
  zip                 text not null,
  assessed_value      bigint,
  school_district_code text,
  city_code           text,
  mud_code            text,
  homestead_exempt    boolean not null default false,
  is_primary          boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists user_addresses_user on user_addresses(user_id);

-- ─── Impact Cards ─────────────────────────────────────────────────────────────
create table if not exists impact_cards (
  id                      uuid primary key default gen_random_uuid(),
  impact_event_id         uuid not null references impact_events(id),
  user_address_id         uuid not null references user_addresses(id) on delete cascade,
  dollar_impact           numeric(10, 2) not null,
  dollar_impact_confidence text not null default 'estimated',
  calculation_breakdown   jsonb,
  delivered_push          boolean not null default false,
  delivered_email         boolean not null default false,
  delivered_at            timestamptz,
  read_at                 timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists cards_user_addr on impact_cards(user_address_id);
create index if not exists cards_event     on impact_cards(impact_event_id);
create index if not exists cards_unread    on impact_cards(user_address_id) where read_at is null;

-- ─── Civic-IQ Scores ─────────────────────────────────────────────────────────
create table if not exists civic_iq_scores (
  id                      uuid primary key default gen_random_uuid(),
  user_address_id         uuid not null references user_addresses(id) on delete cascade,
  score                   numeric(5, 1) not null,
  tax_exposure_12m        numeric(10, 2) not null default 0,
  pending_impact          numeric(10, 2) not null default 0,
  zoning_risk             text not null default 'low',
  school_district_trend   text not null default 'stable',
  events_included         int not null default 0,
  calculated_at           timestamptz not null default now()
);

create index if not exists civiciq_user_addr on civic_iq_scores(user_address_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table user_addresses  enable row level security;
alter table impact_cards    enable row level security;
alter table civic_iq_scores enable row level security;

create policy "users own their addresses"
  on user_addresses for all
  using (auth.uid() = user_id);

create policy "users see their own cards"
  on impact_cards for select
  using (
    user_address_id in (
      select id from user_addresses where user_id = auth.uid()
    )
  );

create policy "users see their own civic-iq"
  on civic_iq_scores for select
  using (
    user_address_id in (
      select id from user_addresses where user_id = auth.uid()
    )
  );

-- Properties and events are public read
alter table properties    enable row level security;
alter table impact_events enable row level security;
alter table threads       enable row level security;

create policy "properties are public" on properties    for select using (true);
create policy "events are public"     on impact_events for select using (true);
create policy "threads are public"    on threads       for select using (true);
