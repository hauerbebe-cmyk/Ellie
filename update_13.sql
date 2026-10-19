-- Update 13: Gewicht (jeden Montag wiegen) + Push-Erinnerung montags
create table if not exists weights (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  kg numeric not null,
  note text,
  author text,
  created_at timestamptz default now()
);
alter table weights enable row level security;
drop policy if exists "nur wir" on weights;
create policy "nur wir" on weights for all to authenticated using (true) with check (true);
do $$ begin
  alter publication supabase_realtime add table weights;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- Erinnerung: Montag 9 Uhr und (falls noch offen) 19 Uhr
create table if not exists weight_sent (day date, slot int, primary key (day, slot));
alter table weight_sent enable row level security;

create or replace function ellie_weight_reminder() returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  now_b timestamp := now() at time zone 'Europe/Berlin';
  d date := now_b::date;
  h int := extract(hour from now_b);
  sl int; subs jsonb; last_kg numeric;
begin
  if extract(isodow from now_b) <> 1 then return; end if;
  sl := case when h >= 19 then 2 when h >= 9 then 1 else 0 end;
  if sl = 0 then return; end if;
  if exists (select 1 from weights where day = d) then return; end if;
  if exists (select 1 from weight_sent where day = d and slot = sl) then return; end if;
  select jsonb_agg(sub) into subs from push_subscriptions;
  if subs is null then return; end if;
  select kg into last_kg from weights order by day desc, created_at desc limit 1;
  insert into weight_sent values (d, sl);
  perform ellie_push(subs,
    case when sl = 1 then '⚖️ Wiegetag!' else '⚖️ Ellie noch nicht gewogen' end,
    case when sl = 1 then 'Heute ist Montag – Ellie wiegen und in der App eintragen.' else 'Heute noch kein Gewicht eingetragen.' end
      || case when last_kg is not null then ' Letztes Mal: ' || replace(trim(to_char(last_kg, 'FM990.0#')), '.', ',') || ' kg' else '' end,
    'weight');
end $$;
revoke execute on function ellie_weight_reminder() from public, anon, authenticated;
select cron.unschedule('ellie-gewicht') where exists (select 1 from cron.job where jobname = 'ellie-gewicht');
select cron.schedule('ellie-gewicht', '10 * * * 1', 'select ellie_weight_reminder()');
