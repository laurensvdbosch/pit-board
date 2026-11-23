-- ===========================================================
-- PitPrep — admin snippets
-- Copy ONE snippet at a time into Supabase → SQL Editor → Run.
-- Don't run this whole file at once. Replace 'SomeName' with the real name;
-- names match without caring about upper/lower case.
-- ===========================================================


-- ---------- Look around ----------

-- Newest players (hidden ones too)
select name, hidden, created_at
from public.players
order by created_at desc
limit 50;

-- Everyone currently hidden
select name, created_at from public.players where hidden order by name;

-- How much space the database uses (the free plan allows 500 MB)
select pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Players and scores so far
select (select count(*) from public.players) as players,
       (select count(*) from public.best_scores) as best_scores,
       (select count(*) from public.best_events) as feed_events;


-- ---------- Moderate a player ----------

-- Hide a player: gone from every board and the feed straight away.
-- Their account keeps working, so they can't just make a new one with the same name.
update public.players set hidden = true where lower(name) = lower('SomeName');

-- Show them again
update public.players set hidden = false where lower(name) = lower('SomeName');

-- Rename someone (for example a borderline name the filter missed)
update public.players set name = 'Player123' where lower(name) = lower('SomeName');

-- Delete a player and all their scores for good (can't be undone)
delete from public.players where lower(name) = lower('SomeName');

-- One-off cleanup from testing: the stray test account
delete from public.players where name = 'Tester';


-- ---------- The name filter ----------

-- Block another word anywhere in a name (also catches 0→o 1→i 3→e 4→a 5→s 7→t 8→b look-alikes)
insert into public.pb_blocked_words (word, whole) values ('someword', false) on conflict (word) do nothing;

-- Block a short word only when it's a separate word (so it doesn't hit ordinary names)
insert into public.pb_blocked_words (word, whole) values ('someword', true) on conflict (word) do nothing;

-- Existing names the current filter would now reject (new words only apply to new names)
select name, hidden from public.players where not public.pb_name_ok(name) order by name;
