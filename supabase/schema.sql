-- ===========================================================
-- PitPrep (formerly Pit Board) — players and leaderboard
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
  check (mode in ('arb', 'mm', 'digits', 'switch', 'confirm', 'series', 'matrix', 'conv', 'data', 'prob', 'take', 'bank', 'next', 'urn', 'likely', 'pzl', 'mdrill', 'msheet', 'mquiz', 'pkodds', 'pkshow', 'pkspot', 'pkread'));
alter table public.best_scores add constraint best_scores_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard', 'expert', 'fwd-easy', 'fwd-hard', 'bwd-easy', 'bwd-hard', 'standard', 'super', 'nextval', 'test', 'survival', 'regular', 'assess', 'quant', 'gk-easy', 'gk-hard', 'fin-easy', 'fin-hard', 'fin-quant', 'mix'));
alter table public.best_scores add constraint best_scores_rounds_check
  check (rounds in (0, 1, 2, 3, 5, 10, 20, 25, 26, 30, 50, 60, 90, 120, 180, 300));
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

-- ---------- moderation ----------
-- Hidden players vanish from every board and the feed (see supabase/admin.sql)
alter table public.players add column if not exists hidden boolean not null default false;

-- Words a name may not contain. whole = only as a separate word, for short words
-- that hide inside ordinary names (Cassie, Hancock, Kshitij, badminton, catering).
-- Checked after look-alike digits are mapped: 0→o 1→i 3→e 4→a 5→s 7→t 8→b.
create table if not exists public.pb_blocked_words (
  word text primary key,
  whole boolean not null default false
);
insert into public.pb_blocked_words (word, whole) values
  -- English
  ('fuck', false), ('cunt', false), ('nigger', false), ('nigga', false), ('faggot', false), ('retard', false),
  ('whore', false), ('bitch', false), ('pussy', false), ('asshole', false), ('penis', false), ('vagina', false),
  ('porn', false), ('hitler', false), ('kkk', false), ('tranny', false), ('spastic', false), ('wetback', false),
  ('shit', true), ('slut', true), ('wank', true), ('twat', true), ('rape', true), ('nazi', true), ('cock', true),
  ('dick', true), ('fag', true), ('ass', true), ('tits', true), ('cum', true), ('sex', true), ('spic', true),
  ('chink', true), ('kike', true), ('paki', true), ('coon', true), ('dyke', true), ('negro', true),
  -- Dutch
  ('kanker', false), ('tyfus', false), ('mongool', false), ('flikker', false), ('nikker', false), ('neger', false),
  ('klootzak', false), ('godver', false),
  ('kut', true), ('lul', true), ('hoer', true), ('tering', true), ('teef', true), ('slet', true),
  -- Reserved: nobody should look official
  ('pitprep', false), ('pitboard', false), ('moderator', false),
  ('admin', true), ('mod', true), ('official', true), ('support', true), ('staff', true), ('system', true), ('root', true)
on conflict (word) do nothing;

-- Light rate limits: new names per network, renames per player
create table if not exists public.pb_rate (
  k text not null,
  at timestamptz not null default now()
);
create index if not exists pb_rate_k on public.pb_rate (k, at);

-- ---------- access rules ----------
alter table public.players        enable row level security;
alter table public.player_secrets enable row level security;
alter table public.best_scores    enable row level security;
alter table public.best_events    enable row level security;
alter table public.pb_blocked_words enable row level security;   -- no policies: not readable from the app
alter table public.pb_rate          enable row level security;

-- Used by the read policies. Security definer, so it sees hidden players too.
create or replace function public.pb_is_hidden(p_player uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select hidden from players where id = p_player), false)
$$;

drop policy if exists "public read" on public.players;
drop policy if exists "public read" on public.best_scores;
drop policy if exists "public read" on public.best_events;
create policy "public read" on public.players     for select using (not hidden);
create policy "public read" on public.best_scores for select using (not public.pb_is_hidden(player_id));
create policy "public read" on public.best_events for select using (not public.pb_is_hidden(player_id));
-- player_secrets has no policy at all: unreadable from the app

revoke all on public.players, public.player_secrets, public.best_scores, public.best_events, public.pb_blocked_words, public.pb_rate from anon, authenticated;
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

-- True when a name contains no blocked word (see pb_blocked_words)
create or replace function public.pb_name_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_low text := translate(lower(coalesce(p_name, '')), '0134578', 'oieastb');
  v_tokens text[] := regexp_split_to_array(v_low, '[^a-z]+');
  v_flat text := regexp_replace(v_low, '[^a-z]', '', 'g');
begin
  return not exists (
    select 1 from pb_blocked_words w
    where (not w.whole and position(w.word in v_flat) > 0)
       or (w.whole and (w.word = any (v_tokens) or w.word = v_flat))
  );
end $$;

create or replace function public.pb_clean_name(p_name text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if v_name !~ '^[A-Za-z0-9 _.-]{2,20}$' then
    raise exception 'invalid_name';
  end if;
  if not pb_name_ok(v_name) then
    raise exception 'blocked_name';
  end if;
  return v_name;
end $$;

-- The caller's network, hashed (from the proxy header; null when absent)
create or replace function public.pb_client_key() returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v text;
begin
  begin
    v := btrim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1));
  exception when others then
    v := '';
  end;
  return case when v = '' then null else 'ip:' || pb_hash(v) end;
end $$;

-- At most p_max events per key in the window. Entries older than a day are dropped.
create or replace function public.pb_rate_limit(p_key text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null then return; end if;
  delete from pb_rate where at < now() - interval '1 day';
  if (select count(*) from pb_rate where k = p_key and at > now() - p_window) >= p_max then
    raise exception 'too_many';
  end if;
  insert into pb_rate (k) values (p_key);
end $$;

-- Claim a name. Returns the secret exactly once; the app keeps it on the device.
create or replace function public.register_player(p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_name text := pb_clean_name(p_name);
  v_id uuid;
  v_secret text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  -- 20 new names per network per hour: plenty for a shared campus network, not for a script.
  -- A failed claim (name taken) rolls back, so it doesn't count.
  perform pb_rate_limit(pb_client_key(), 20, interval '1 hour');
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
  perform pb_rate_limit('rename:' || p_player, 5, interval '1 hour');
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
          and p_rounds in (30, 60, 120) and v_score = trunc(v_score) and v_score between -10 * p_rounds and 2 * p_rounds)
    or (p_mode = 'confirm' and p_difficulty in ('easy', 'hard')
          and p_rounds in (1, 2, 3) and v_score = trunc(v_score) and v_score between 0 and 1000)
    or (p_mode = 'series' and p_difficulty = 'standard'
          and p_rounds = 300 and v_score = trunc(v_score) and v_score between 0 and 20)
    or (p_mode = 'series' and p_difficulty = 'nextval'
          and p_rounds = 300 and v_score = trunc(v_score) and v_score between -20 and 20)
    or (p_mode = 'matrix' and p_difficulty = 'test'
          and p_rounds = 0 and v_score = trunc(v_score) and v_score between 0 and 20)
    or (p_mode = 'matrix' and p_difficulty = 'survival'
          and p_rounds = 0 and v_score = trunc(v_score) and v_score between 0 and 2000)
    or (p_mode = 'conv' and p_difficulty in ('gk-easy', 'gk-hard', 'fin-easy', 'fin-hard', 'fin-quant', 'mix')
          and p_rounds in (25, 50) and v_score between -3 * p_rounds and p_rounds)
    or (p_mode = 'data' and p_difficulty in ('standard', 'hard')
          and p_rounds = 20 and v_score = trunc(v_score) and v_score between 0 and 20)
    or (p_mode = 'prob' and p_difficulty in ('easy', 'hard', 'assess')
          and p_rounds in (10, 20) and v_score = trunc(v_score) and v_score between -p_rounds and p_rounds)
    or (p_mode = 'take' and p_difficulty = 'standard'
          and p_rounds = 60 and v_score between -2000 and 2000)
    or (p_mode = 'bank' and p_difficulty = 'standard'
          and p_rounds = 10 and v_score = trunc(v_score) and v_score between 0 and 100)
    or (p_mode = 'next' and p_difficulty in ('standard', 'hard')
          and p_rounds = 26 and v_score = trunc(v_score) and v_score between -2000 and 2000)
    or (p_mode = 'urn' and p_difficulty = 'standard'
          and p_rounds = 10 and v_score = trunc(v_score) and v_score between 0 and 100)
    or (p_mode = 'likely' and p_difficulty = 'standard'
          and p_rounds = 0 and v_score = trunc(v_score) and v_score between 0 and 2000)
    or (p_mode = 'pzl' and p_difficulty = 'standard'
          and p_rounds = 5 and v_score = trunc(v_score) and v_score between 0 and 200)
    or (p_mode = 'mdrill' and p_difficulty = 'standard'
          and p_rounds = 120 and v_score = trunc(v_score) and v_score between 0 and 400)
    or (p_mode = 'msheet' and p_difficulty in ('regular', 'assess', 'quant')
          and p_rounds in (10, 20, 50) and v_score = trunc(v_score) and v_score between 0 and p_rounds)
    or (p_mode = 'mquiz' and p_difficulty in ('easy', 'medium', 'hard', 'quant')
          and p_rounds = 20 and v_score = trunc(v_score) and v_score between -20 and 20)
    or (p_mode = 'pkodds' and p_difficulty = 'standard'
          and p_rounds = 180 and v_score = trunc(v_score) and v_score between -300 and 300)
    or (p_mode = 'pkshow' and p_difficulty = 'standard'
          and p_rounds = 90 and v_score = trunc(v_score) and v_score between -200 and 200)
    or (p_mode in ('pkspot', 'pkread') and p_difficulty = 'standard'
          and p_rounds = 10 and v_score = trunc(v_score) and v_score between -10 and 10),
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
revoke all on function public.pb_name_ok(text) from public, anon, authenticated;
revoke all on function public.pb_client_key() from public, anon, authenticated;
revoke all on function public.pb_rate_limit(text, int, interval) from public, anon, authenticated;
revoke all on function public.pb_is_hidden(uuid) from public;
grant execute on function public.pb_is_hidden(uuid) to anon, authenticated;
revoke all on function public.register_player(text) from public;
revoke all on function public.rename_player(uuid, text, text) from public;
revoke all on function public.submit_score(uuid, text, text, text, int, numeric) from public;
grant execute on function public.register_player(text) to anon, authenticated;
grant execute on function public.rename_player(uuid, text, text) to anon, authenticated;
grant execute on function public.submit_score(uuid, text, text, text, int, numeric) to anon, authenticated;

notify pgrst, 'reload schema';
