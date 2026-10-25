-- ===========================================================
-- Pit Board — players and leaderboard
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run; it only creates what is missing and replaces functions.
--
-- The public (anon key) can READ names, best scores and the feed.
-- All writes go through the functions below, which check the secret
-- each device got when it registered, so nobody can post as you.
-- ===========================================================

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name ~ '^[A-Za-z0-9 _.-]{2,20}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists players_name_lower on public.players (lower(name));

-- Kept apart from players so names are public but secrets never are
create table if not exists public.player_secrets (
  player_id uuid primary key references public.players (id) on delete cascade,
  secret_hash text not null
);

create table if not exists public.best_scores (
  player_id uuid not null references public.players (id) on delete cascade,
  mode text not null,
  difficulty text not null,
  rounds int not null,
  score numeric(12, 2) not null,
  achieved_at timestamptz not null default now(),
  primary key (player_id, mode, difficulty, rounds)
);
-- Which boards exist (re-run safe: replaces the older arb/mm-only checks)
alter table public.best_scores drop constraint if exists best_scores_mode_check;
alter table public.best_scores drop constraint if exists best_scores_difficulty_check;
alter table public.best_scores drop constraint if exists best_scores_rounds_check;
alter table public.best_scores add constraint best_scores_mode_check
  check (mode in ('arb', 'mm', 'digits', 'switch'));
alter table public.best_scores add constraint best_scores_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard', 'expert', 'fwd-easy', 'fwd-hard', 'bwd-easy', 'bwd-hard', 'standard', 'super'));
alter table public.best_scores add constraint best_scores_rounds_check
  check (rounds in (0, 3, 5, 10, 20, 30, 60, 120));
create index if not exists best_scores_board on public.best_scores (mode, difficulty, rounds, score desc);

-- One row each time someone beats their own best: the "Recent bests" feed
create table if not exists public.best_events (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  mode text not null,
  difficulty text not null,
  rounds int not null,
  score numeric(12, 2) not null,
  prev_score numeric(12, 2),
  created_at timestamptz not null default now()
);
create index if not exists best_events_recent on public.best_events (created_at desc);

-- ---------- access rules ----------
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.best_scores    enable row level security;
alter table public.best_events    enable row level security;

drop policy if exists "public read" on public.players;
drop policy if exists "public read" on public.best_scores;
drop policy if exists "public read" on public.best_events;
create policy "public read" on public.players     for select using (true);
create policy "public read" on public.best_scores for select using (true);
create policy "public read" on public.best_events for select using (true);
-- player_secrets has no policy at all: unreadable from the app

revoke all on public.players, public.player_secrets, public.best_scores, public.best_events from anon, authenticated;
grant select on public.players, public.best_scores, public.best_events to anon, authenticated;

-- ---------- functions ----------
create or replace function public.pb_hash(p_secret text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')
$$;

create or replace function public.pb_check_secret(p_player uuid, p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or not exists (
    select 1 from player_secrets where player_id = p_player and secret_hash = pb_hash(p_secret)
  ) then
    raise exception 'bad_secret';
  end if;
end $$;

create or replace function public.pb_clean_name(p_name text) returns text
language plpgsql immutable as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if v_name !~ '^[A-Za-z0-9 _.-]{2,20}$' then
    raise exception 'invalid_name';
  end if;
  return v_name;
end $$;

-- Claim a name. Returns the secret exactly once; the app keeps it on the device.
create or replace function public.register_player(p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_name text := pb_clean_name(p_name);
  v_id uuid;
  v_secret text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  begin
    insert into players (name) values (v_name) returning id into v_id;
  exception when unique_violation then
    raise exception 'name_taken';
  end;
  insert into player_secrets (player_id, secret_hash) values (v_id, pb_hash(v_secret));
  return json_build_object('id', v_id, 'name', v_name, 'secret', v_secret);
end $$;

create or replace function public.rename_player(p_player uuid, p_secret text, p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_name text := pb_clean_name(p_name);
begin
  perform pb_check_secret(p_player, p_secret);
  begin
    update players set name = v_name where id = p_player;
  exception when unique_violation then
    raise exception 'name_taken';
  end;
  return json_build_object('id', p_player, 'name', v_name);
end $$;

-- Post a finished session. Only a personal best changes the board and the feed.
create or replace function public.submit_score(
  p_player uuid, p_secret text, p_mode text, p_difficulty text, p_rounds int, p_score numeric
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_score numeric := round(p_score, 2);
  v_prev numeric;
begin
  perform pb_check_secret(p_player, p_secret);
  -- Each game's boards, plus loose score bounds. The games run on the
  -- phone, so the bounds only stop absurd numbers.
  if v_score is null or not coalesce(
       (p_mode in ('arb', 'mm') and p_difficulty in ('easy', 'medium', 'hard', 'expert')
          and p_rounds in (3, 5, 10, 20) and abs(v_score) <= 2000 * p_rounds)
    or (p_mode = 'digits' and p_difficulty in ('fwd-easy', 'fwd-hard', 'bwd-easy', 'bwd-hard')
          and p_rounds = 0 and v_score = trunc(v_score) and v_score between 0 and 20)
    or (p_mode = 'switch' and p_difficulty in ('standard', 'hard', 'super')
          and p_rounds in (30, 60, 120) and v_score = trunc(v_score) and v_score between -10 * p_rounds and 2 * p_rounds),
     false) then
    raise exception 'invalid_score';
  end if;

  select score into v_prev from best_scores
  where player_id = p_player and mode = p_mode and difficulty = p_difficulty and rounds = p_rounds
  for update;
  if v_prev is not null and v_score <= v_prev then
    return json_build_object('is_best', false, 'best', v_prev);
  end if;

  insert into best_scores (player_id, mode, difficulty, rounds, score)
  values (p_player, p_mode, p_difficulty, p_rounds, v_score)
  on conflict (player_id, mode, difficulty, rounds)
  do update set score = excluded.score, achieved_at = now();

  insert into best_events (player_id, mode, difficulty, rounds, score, prev_score)
  values (p_player, p_mode, p_difficulty, p_rounds, v_score, v_prev);

  return json_build_object('is_best', true, 'best', v_score, 'prev', v_prev);
end $$;

-- Only the three public entry points are callable from the app
revoke all on function public.pb_hash(text) from public, anon, authenticated;
revoke all on function public.pb_check_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.pb_clean_name(text) from public, anon, authenticated;
revoke all on function public.register_player(text) from public;
revoke all on function public.rename_player(uuid, text, text) from public;
revoke all on function public.submit_score(uuid, text, text, text, int, numeric) from public;
grant execute on function public.register_player(text) to anon, authenticated;
grant execute on function public.rename_player(uuid, text, text) to anon, authenticated;
grant execute on function public.submit_score(uuid, text, text, text, int, numeric) to anon, authenticated;

notify pgrst, 'reload schema';
