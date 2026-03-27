-- Run in Supabase SQL Editor or via CLI. One JSON blob per user (library + sessions + active run).

create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_app_data_updated_at_idx on public.user_app_data (updated_at desc);

alter table public.user_app_data enable row level security;

create policy "Users can read own app data"
  on public.user_app_data
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own app data"
  on public.user_app_data
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own app data"
  on public.user_app_data
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
