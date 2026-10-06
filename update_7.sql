-- Update 7: Gassi, Dokumente, Notfall-Karte, Wochenrückblick (Sonntag 19 Uhr)

create table if not exists walks (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  time text,
  minutes int,
  calm int,
  place text,
  note text,
  author text,
  created_at timestamptz default now()
);
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text,
  path text not null,
  mime text,
  size int,
  author text,
  created_at timestamptz default now()
);
create table if not exists info (
  id text primary key,
  data jsonb,
  author text,
  updated_at timestamptz default now()
);
do $$
declare t text;
begin
  foreach t in array array['walks','documents','info'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "nur wir" on %I', t);
    execute format('create policy "nur wir" on %I for all to authenticated using (true) with check (true)', t);
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- privater Speicher für Dokumente
insert into storage.buckets (id, name, public) values ('dokumente', 'dokumente', false) on conflict do nothing;
drop policy if exists "dokumente lesen" on storage.objects;
drop policy if exists "dokumente hochladen" on storage.objects;
drop policy if exists "dokumente loeschen" on storage.objects;
create policy "dokumente lesen" on storage.objects for select to authenticated using (bucket_id = 'dokumente');
create policy "dokumente hochladen" on storage.objects for insert to authenticated with check (bucket_id = 'dokumente');
create policy "dokumente loeschen" on storage.objects for delete to authenticated using (bucket_id = 'dokumente');

-- Wochenrückblick
create table if not exists weekly_sent (week date primary key);
alter table weekly_sent enable row level security;

create or replace function ellie_weekly() returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  now_b timestamp := now() at time zone 'Europe/Berlin';
  d date := now_b::date;
  wk date := d - 6;
  subs jsonb; b_now int; b_prev int; mood_avg numeric; exp int := 0; given int := 0; walk int; apt int; dd date; body text; first_log date;
begin
  if extract(isodow from now_b) <> 7 or extract(hour from now_b) <> 19 then return; end if;
  if exists (select 1 from weekly_sent where week = wk) then return; end if;
  select jsonb_agg(sub) into subs from push_subscriptions;
  if subs is null then return; end if;
  select count(*) into b_now from barks where (created_at at time zone 'Europe/Berlin')::date between wk and d;
  select count(*) into b_prev from barks where (created_at at time zone 'Europe/Berlin')::date between wk - 7 and wk - 1;
  select avg(dl.mood) into mood_avg from daily_log dl where dl.day between wk and d;
  select coalesce(sum(w.minutes), 0) into walk from walks w where w.day between wk and d;
  select min(day) into first_log from med_logs;
  if first_log is not null then
    for dd in select generate_series(greatest(wk, first_log), d, interval '1 day')::date loop
      select exp + coalesce(sum(greatest(coalesce(array_length(m.times, 1), 0), 1)), 0) into exp from meds m
      where m.active is not false and m.kind <> 'bedarf'
        and (m.kind <> 'taper' or ellie_taper_text(m.taper, dd) is not null)
        and dd >= (m.created_at at time zone 'Europe/Berlin')::date;
    end loop;
    select count(*) into given from med_logs l join meds m on m.id = l.med_id
    where l.day between greatest(wk, first_log) and d and not l.skipped and m.kind <> 'bedarf';
  end if;
  select count(*) into apt from appointments where day between d + 1 and d + 7;
  body := b_now || '× gebellt'
    || case when b_prev > 0 then ' (' || case when b_now >= b_prev then '+' else '' end || round((b_now - b_prev) * 100.0 / b_prev) || ' %)' else '' end
    || case when mood_avg is not null then ' · Stimmung Ø ' || replace(round(mood_avg, 1)::text, '.', ',') else '' end
    || case when exp > 0 then ' · Medis ' || least(given, exp) || '/' || exp || case when given >= exp then ' ✓' else '' end else '' end
    || case when walk > 0 then ' · Gassi ' || replace(round(walk / 60.0, 1)::text, '.', ',') || ' h' else '' end
    || case when apt > 0 then ' · nächste Woche ' || apt || ' Termin' || case when apt > 1 then 'e' else '' end else '' end;
  insert into weekly_sent values (wk);
  perform ellie_push(subs, '🐾 Ellies Woche', body, 'weekly');
end $$;
revoke execute on function ellie_weekly() from public, anon, authenticated;
select cron.schedule('ellie-wochenrueckblick', '5 * * * 0', 'select ellie_weekly()');
