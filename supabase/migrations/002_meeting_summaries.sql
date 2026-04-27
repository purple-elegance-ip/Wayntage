-- Meeting Summaries for Grouped Insights
create table if not exists meeting_summaries (
  id uuid primary key default gen_random_uuid(),
  county text not null,
  source text not null,
  meeting_date date not null,
  meeting_type text,
  ai_summary text not null,
  created_at timestamptz not null default now(),
  unique(county, source, meeting_date, meeting_type)
);

create index if not exists meeting_summaries_lookup on meeting_summaries(county, meeting_date);

-- Enable RLS
alter table meeting_summaries enable row level security;
create policy "summaries are public" on meeting_summaries for select using (true);
