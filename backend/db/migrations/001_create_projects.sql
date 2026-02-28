-- VoiceForge: projects table
-- Run this in the Supabase SQL Editor.

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  language    text not null check (language in ('python', 'html')),
  code        text not null default '',
  updated_at  timestamptz not null default now()
);

-- Index for fast per-user look-ups
create index if not exists projects_user_id_idx on projects(user_id);

-- Row Level Security
alter table projects enable row level security;

create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on projects;
create trigger set_updated_at
  before update on projects
  for each row execute function update_updated_at();
