-- Update 3: Erinnerungen per Push. Einmal im Supabase SQL Editor ausführen
-- (vorher __TOKEN__ durch denselben Token wie in der Edge Function ersetzen).

alter table meds add column if not exists remind_at text;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  sub jsonb not null,
  author text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "nur wir" on push_subscriptions;
create policy "nur wir" on push_subscriptions for all to authenticated using (true) with check (true);

create table if not exists push_tests (
  id uuid primary key default gen_random_uuid(),
  endpoint text,
  author text,
  created_at timestamptz default now()
);
alter table push_tests enable row level security;
drop policy if exists "nur wir" on push_tests;
create policy "nur wir" on push_tests for all to authenticated using (true) with check (true);

create table if not exists reminder_sent (med_id uuid, day date, primary key (med_id, day));
alter table reminder_sent enable row level security;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Schickt eine Mitteilung über die Edge Function an die übergebenen Geräte
create or replace function ellie_push(subs jsonb, title text, body text, tag text default 'ellie')
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if subs is null or jsonb_array_length(subs) = 0 then return; end if;
  perform net.http_post(
    url := 'https://jqxlygkyclebhbhdnclg.supabase.co/functions/v1/erinnerung',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ellie-token', '__TOKEN__'),
    body := jsonb_build_object('subs', subs, 'title', title, 'body', body, 'tag', tag)
  );
end $$;

-- Soll-Dosis laut Ausschleichplan an einem Tag (null = Plan vorbei)
create or replace function ellie_taper_text(t jsonb, d date) returns text language plpgsql immutable as $$
declare n int := d - (t->>'start')::date; acc int := 0; s jsonb;
begin
  if n < 0 then return replace(t->'pre'->>'mg', '.', ',') || ' mg (' || (t->'pre'->>'pieces') || ')'; end if;
  for s in select * from jsonb_array_elements(t->'steps') loop
    if n < acc + (s->>'days')::int then
      return replace(s->>'mg', '.', ',') || ' mg (' || (s->>'pieces') || ')';
    end if;
    acc := acc + (s->>'days')::int;
  end loop;
  return null;
end $$;

-- Läuft alle 5 Minuten: offene Medikamente nach Erinnerungszeit melden (1× pro Tag und Medikament)
create or replace function ellie_reminders() returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  d date := (now() at time zone 'Europe/Berlin')::date;
  hm text := to_char(now() at time zone 'Europe/Berlin', 'HH24:MI');
  subs jsonb; m record; soll text;
begin
  select jsonb_agg(sub) into subs from push_subscriptions;
  if subs is null then return; end if;
  for m in select * from meds
    where active is not false and kind <> 'bedarf' and coalesce(remind_at, '') <> '' and remind_at <= hm
  loop
    if exists (select 1 from reminder_sent where med_id = m.id and day = d) then continue; end if;
    if m.kind = 'taper' then
      soll := ellie_taper_text(m.taper, d);
      if soll is null then continue; end if;
    else
      soll := coalesce(m.dose, '');
    end if;
    if (select count(*) from med_logs where med_id = m.id and day = d) >= greatest(coalesce(array_length(m.times, 1), 0), 1) then continue; end if;
    insert into reminder_sent values (m.id, d);
    perform ellie_push(subs, '💊 ' || m.name || ' noch offen',
      'Heute noch nicht eingetragen.' || case when soll <> '' then ' Soll: ' || soll else '' end, 'med-' || m.id);
  end loop;
end $$;

-- Test-Mitteilung aus der App (Einstellungen → Erinnerungen → Test)
create or replace function ellie_push_test() returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform ellie_push((select jsonb_agg(sub) from push_subscriptions where endpoint = new.endpoint),
    '🐾 Test von Ellie', 'Klappt! So sehen die Erinnerungen aus.', 'test');
  return new;
end $$;
drop trigger if exists push_test_trg on push_tests;
create trigger push_test_trg after insert on push_tests for each row execute function ellie_push_test();

revoke execute on function ellie_push(jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function ellie_reminders() from public, anon, authenticated;
revoke execute on function ellie_push_test() from public, anon, authenticated;

select cron.schedule('ellie-erinnerung', '*/5 * * * *', 'select ellie_reminders()');
