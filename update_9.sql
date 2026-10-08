-- Update 9: Ellie Run 3D (Leaderboard-Spalten, Geist-Replays, Rekord-Push)
alter table game_scores add column if not exists game text default 'crossing';
alter table game_scores add column if not exists seed text;
alter table game_scores add column if not exists replay jsonb;
alter table game_scores add column if not exists meta jsonb;

-- Push an die anderen, wenn jemand in Ellie Run 3D die Führung übernimmt
create or replace function ellie_record_push() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare other_best int; own_prev int; subs jsonb;
begin
  if new.game is distinct from 'run3d' then return new; end if;
  select max(score) into other_best from game_scores where game = 'run3d' and player <> new.player;
  if other_best is null or new.score <= other_best then return new; end if;
  select coalesce(max(score), 0) into own_prev from game_scores where game = 'run3d' and player = new.player and id <> new.id;
  if own_prev > other_best then return new; end if;   -- war schon vorne
  select jsonb_agg(sub) into subs from push_subscriptions where author is distinct from new.player;
  perform ellie_push(subs, '🏆 ' || new.player || ' ist vorne!',
    new.player || ' hat deinen Rekord in Ellie Run 3D geknackt: ' || new.score || ' Punkte. Revanche? 😏', 'run3d');
  return new;
end $$;
revoke execute on function ellie_record_push() from public, anon, authenticated;
drop trigger if exists game_record_trg on game_scores;
create trigger game_record_trg after insert on game_scores for each row execute function ellie_record_push();
