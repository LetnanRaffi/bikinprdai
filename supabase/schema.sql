-- Supabase schema for PRD Generator
-- Run this in Supabase SQL Editor

create table prds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  form_input jsonb not null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table prds enable row level security;

create policy "Users can manage own PRDs"
  on prds for all using (auth.uid() = user_id);
