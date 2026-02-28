-- VoiceForge: roadmaps table
-- Run this in the Supabase SQL Editor.

create table if not exists roadmaps (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  goal               text not null,
  estimated_duration text not null default '',
  phases             jsonb not null default '[]',
  milestones         jsonb not null default '[]',
  next_actions       jsonb not null default '[]',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Index for fast per-user look-ups
create index if not exists roadmaps_user_id_idx on roadmaps(user_id);

-- Row Level Security
alter table roadmaps enable row level security;

create policy "Users can view own roadmaps"
  on roadmaps for select
  using (auth.uid() = user_id);

create policy "Users can insert own roadmaps"
  on roadmaps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own roadmaps"
  on roadmaps for update
  using (auth.uid() = user_id);

create policy "Users can delete own roadmaps"
  on roadmaps for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at (reuses function created by 001_create_projects.sql)
drop trigger if exists set_updated_at_roadmaps on roadmaps;
create trigger set_updated_at_roadmaps
  before update on roadmaps
  for each row execute function update_updated_at();
