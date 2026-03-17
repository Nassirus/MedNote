-- ══════════════════════════════════════════════
-- MedSchedule — Supabase Schema
-- Запусти это в Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════

-- 1. Profiles (расширение auth.users)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  email           text,
  notify_delay    int default 30,
  quiet_start     text default '22:00',
  quiet_end       text default '08:00',
  notifications   boolean default true,
  mediq_sync      boolean default false,
  mediq_token     text,
  created_at      timestamptz default now()
);

-- 2. Schedule items
create table if not exists public.schedule_items (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text not null default 'routine',
  title       text not null,
  time        text not null default '08:00',
  notes       text,
  freq        text default 'Ежедневно',
  date        date,
  done        boolean default false,
  done_at     timestamptz,
  created_at  timestamptz default now()
);

-- 3. Notes
create table if not exists public.notes (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text default 'Без названия',
  content     text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ══════════════════════════════════════════════
-- Row Level Security (RLS) — обязательно!
-- ══════════════════════════════════════════════

alter table public.profiles       enable row level security;
alter table public.schedule_items enable row level security;
alter table public.notes          enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Schedule policies
create policy "Users can view own items"
  on public.schedule_items for select using (auth.uid() = user_id);
create policy "Users can insert own items"
  on public.schedule_items for insert with check (auth.uid() = user_id);
create policy "Users can update own items"
  on public.schedule_items for update using (auth.uid() = user_id);
create policy "Users can delete own items"
  on public.schedule_items for delete using (auth.uid() = user_id);

-- Notes policies
create policy "Users can view own notes"
  on public.notes for select using (auth.uid() = user_id);
create policy "Users can insert own notes"
  on public.notes for insert with check (auth.uid() = user_id);
create policy "Users can update own notes"
  on public.notes for update using (auth.uid() = user_id);
create policy "Users can delete own notes"
  on public.notes for delete using (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- Auto-create profile on signup
-- ══════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
