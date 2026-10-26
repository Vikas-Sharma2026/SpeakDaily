-- ==============================================================================
-- SpeakDaily: Database Schema for Supabase
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tobcromohibqjfkkvctf/sql/new
--
-- This script sets up:
-- 1. profiles table (linked to auth.users)
-- 2. practice_sessions table (for saving 2-minute speaking attempts & AI feedback)
-- 3. Row Level Security (RLS) policies for user privacy
-- 4. Automatic user profile creation trigger on signup
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  target_level text default 'Intermediate',
  streak_count int default 0,
  last_practice_date date,
  total_minutes_practiced numeric(6,1) default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. PRACTICE SESSIONS TABLE
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic_title text not null,
  topic_category text default 'General',
  duration_seconds int default 0,
  transcript text,
  overall_score numeric(3,1),
  fluency_score numeric(3,1),
  vocabulary_score numeric(3,1),
  grammar_score numeric(3,1),
  feedback jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS on practice_sessions
alter table public.practice_sessions enable row level security;

-- Policies for practice_sessions
create policy "Users can view their own practice sessions"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own practice sessions"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own practice sessions"
  on public.practice_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own practice sessions"
  on public.practice_sessions for delete
  using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_practice_sessions_user_id on public.practice_sessions(user_id);
create index if not exists idx_practice_sessions_created_at on public.practice_sessions(created_at desc);

-- 3. TRIGGER TO AUTOMATICALLY CREATE PROFILE ON NEW USER SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, streak_count, total_minutes_practiced)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    0,
    0
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. HELPER FUNCTION TO UPDATE USER STREAK ON PRACTICE
create or replace function public.record_practice_session(
  p_user_id uuid,
  p_topic_title text,
  p_topic_category text,
  p_duration_seconds int,
  p_transcript text,
  p_overall_score numeric,
  p_fluency_score numeric,
  p_vocabulary_score numeric,
  p_grammar_score numeric,
  p_feedback jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_session_id uuid;
  v_last_date date;
  v_today date := current_date;
  v_new_streak int;
begin
  -- Insert practice session
  insert into public.practice_sessions (
    user_id,
    topic_title,
    topic_category,
    duration_seconds,
    transcript,
    overall_score,
    fluency_score,
    vocabulary_score,
    grammar_score,
    feedback
  ) values (
    p_user_id,
    p_topic_title,
    p_topic_category,
    p_duration_seconds,
    p_transcript,
    p_overall_score,
    p_fluency_score,
    p_vocabulary_score,
    p_grammar_score,
    p_feedback
  ) returning id into v_session_id;

  -- Update streak and minutes in profile
  select last_practice_date, streak_count into v_last_date, v_new_streak
  from public.profiles where id = p_user_id;

  if v_last_date is null then
    v_new_streak := 1;
  elsif v_last_date = v_today then
    -- Already practiced today, keep streak
    v_new_streak := coalesce(v_new_streak, 1);
  elsif v_last_date = v_today - interval '1 day' then
    -- Consecutive day
    v_new_streak := coalesce(v_new_streak, 0) + 1;
  else
    -- Streak reset
    v_new_streak := 1;
  end if;

  update public.profiles
  set
    streak_count = v_new_streak,
    last_practice_date = v_today,
    total_minutes_practiced = coalesce(total_minutes_practiced, 0) + round((p_duration_seconds::numeric / 60.0), 1),
    updated_at = timezone('utc'::text, now())
  where id = p_user_id;

  return v_session_id;
end;
$$;
