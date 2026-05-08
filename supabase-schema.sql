-- ============================================
-- KanjiDuel — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  elo integer not null default 500,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Match rooms (for matchmaking)
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  status text default 'waiting' check (status in ('waiting', 'active', 'finished')),
  category text default 'all',
  rounds integer default 10,
  current_round integer default 0,
  p1_score integer default 0,
  p2_score integer default 0,
  current_kanji jsonb,
  question_type text,
  round_started_at timestamptz,
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "Rooms are viewable by participants"
  on rooms for select using (
    auth.uid() = player1_id or auth.uid() = player2_id or status = 'waiting'
  );

create policy "Players can update their room"
  on rooms for update using (
    auth.uid() = player1_id or auth.uid() = player2_id
  );

create policy "Authenticated users can create rooms"
  on rooms for insert with check (auth.uid() = player1_id);

-- Match history
create table public.matches (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  winner_id uuid references profiles(id),
  p1_score integer,
  p2_score integer,
  p1_elo_change integer,
  p2_elo_change integer,
  rounds integer,
  category text,
  played_at timestamptz default now()
);

alter table public.matches enable row level security;

create policy "Matches are viewable by everyone"
  on matches for select using (true);

create policy "System can insert matches"
  on matches for insert with check (
    auth.uid() = player1_id or auth.uid() = player2_id
  );

-- Enable realtime on rooms
alter publication supabase_realtime add table rooms;
