-- Update 10: Gassi-Tracking (GPS-Route, Statistiken, Fotos, Pfötchen)
alter table walks add column if not exists title text;
alter table walks add column if not exists start_at timestamptz;
alter table walks add column if not exists duration_s int;
alter table walks add column if not exists distance_m int;
alter table walks add column if not exists route jsonb;
alter table walks add column if not exists marks jsonb;
alter table walks add column if not exists photos jsonb;
alter table walks add column if not exists kudos jsonb;

-- Fotos dürfen ersetzt werden (z. B. erneuter Upload)
drop policy if exists "fotos aendern" on storage.objects;
create policy "fotos aendern" on storage.objects for update to authenticated using (bucket_id = 'fotos');

-- Push an die andere Person: neue getrackte Runde / Pfötchen bekommen
create or replace function ellie_walk_push() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare subs jsonb; km text; who text;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.distance_m, 0) < 100 and coalesce(jsonb_array_length(new.photos), 0) = 0 then return new; end if;
    select jsonb_agg(sub) into subs from push_subscriptions where author is distinct from new.author;
    km := case when coalesce(new.distance_m, 0) >= 100 then replace(to_char(new.distance_m / 1000.0, 'FM990.00'), '.', ',') || ' km · ' else '' end;
    perform ellie_push(subs, '🐾 ' || coalesce(new.author, 'Jemand') || ' war mit Ellie Gassi',
      km || coalesce(new.minutes, 0) || ' Min. – ' || coalesce(new.title, 'Gassi-Runde') || '. Gib ein Pfötchen!', 'walk');
  elsif tg_op = 'UPDATE' and coalesce(jsonb_array_length(new.kudos), 0) > coalesce(jsonb_array_length(old.kudos), 0) then
    select k into who from jsonb_array_elements_text(new.kudos) k where not coalesce(old.kudos, '[]'::jsonb) ? k limit 1;
    select jsonb_agg(sub) into subs from push_subscriptions where author = new.author;
    perform ellie_push(subs, '🐾 Pfötchen von ' || coalesce(who, 'jemandem'),
      coalesce(who, 'Jemand') || ' findet deine ' || coalesce(new.title, 'Gassi-Runde') || ' super!', 'walk');
  end if;
  return new;
end $$;
revoke execute on function ellie_walk_push() from public, anon, authenticated;
drop trigger if exists walk_push_trg on walks;
create trigger walk_push_trg after insert or update on walks for each row execute function ellie_walk_push();
