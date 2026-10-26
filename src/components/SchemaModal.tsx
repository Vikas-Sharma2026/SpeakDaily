import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Database, ShieldCheck, Zap } from 'lucide-react';

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaModal: React.FC<SchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlCode = `-- ==============================================================================
-- SpeakDaily: Database Schema for Supabase
-- ==============================================================================
-- Copy & Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tobcromohibqjfkkvctf/sql/new

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Supabase SQL Schema (db/schema.sql)</h2>
              <p className="text-xs text-stone-500">Auto-creates profiles & practice tables on user signup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-stone-50 border-b border-stone-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Includes Row Level Security (RLS) & Auth Triggers</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/tobcromohibqjfkkvctf/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 font-medium hover:bg-stone-100 transition-colors"
            >
              <span>Open Supabase SQL Editor</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </a>

            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied SQL!' : 'Copy SQL'}</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-stone-950 text-stone-200 leading-relaxed selection:bg-amber-500/30 selection:text-white">
          <pre>{sqlCode}</pre>
        </div>
      </div>
    </div>
  );
};
