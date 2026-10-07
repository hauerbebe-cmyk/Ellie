-- Update 8: Leaderboard für "Ellie Crossing"
create table if not exists game_scores (
  id uuid primary key default gen_random_uuid(),
  player text not null,
  score int not null,
  level int,
  created_at timestamptz default now()
);
alter table game_scores enable row level security;
drop policy if exists "nur wir" on game_scores;
create policy "nur wir" on game_scores for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table game_scores;
