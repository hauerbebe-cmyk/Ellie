-- Update 5: Appetit + Auffälligkeiten im Protokoll, eigene Punkte, Wetter-Sicherung, Tablettenvorrat.

alter table daily_log add column if not exists appetite int;
alter table daily_log add column if not exists symptoms text[] default '{}';
alter table daily_log add column if not exists weather jsonb;

create table if not exists log_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null,               -- 'symptom' oder 'tag'
  label text not null,
  icon text,
  active boolean default true,
  author text,
  created_at timestamptz default now(),
  unique (kind, label)
);
insert into log_options (kind, label, icon, created_at)
select 'symptom', x.label, x.icon, now() - interval '1 hour' + (x.n || ' seconds')::interval
from unnest(array['Unruhe','Schlecht geschlafen','Starkes Hecheln','Zittern','Erbrechen','Durchfall','Viel getrunken','Lecken / Kratzen','Verstecken','Wackelig / benommen','Gereizt'],
            array['😰','😴','🥵','🫨','🤢','💩','💧','🐾','🙈','😵‍💫','😠']) with ordinality as x(label, icon, n)
on conflict do nothing;
insert into log_options (kind, label, icon, created_at)
select 'tag', x.label, x.icon, now() - interval '1 hour' + (x.n || ' seconds')::interval
from unnest(array['Verspielt','Verschmust','Entspannt','Ruhig','Müde','Aufgedreht','Ängstlich','Neugierig','Viel gebellt'],
            array['🎾','🥰','😌','🤫','💤','⚡','😟','👀','🗣️']) with ordinality as x(label, icon, n)
on conflict do nothing;
alter table log_options enable row level security;
drop policy if exists "nur wir" on log_options;
create policy "nur wir" on log_options for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table log_options;

create table if not exists stock (
  id uuid primary key default gen_random_uuid(),
  med_id uuid references meds(id) on delete cascade,
  label text,
  unit text default 'Tbl.',
  count numeric not null,
  counted_at timestamptz default now(),
  per_day numeric,                  -- Stück pro Tag (bzw. pro Gabe bei Bedarf)
  mg_per_unit numeric,              -- für Dosispläne: mg pro Tablette
  use_key text,                     -- für Alprazolam: welche Tablettensorte
  author text,
  created_at timestamptz default now()
);
alter table stock enable row level security;
drop policy if exists "nur wir" on stock;
create policy "nur wir" on stock for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table stock;

-- Alprazolam: pro Stufe hinterlegen, wie viel von welcher Tablette gebraucht wird (Startdatum bleibt)
update meds set taper = jsonb_set(
  '{"title": "Ausschleichen", "units": {"0.5": "0,5 mg Tabletten", "0.25": "0,25 mg Tabletten"},
    "pre": {"mg": 0.5, "pieces": "1 Tbl. 0,5 mg", "use": {"0.5": 1}},
    "steps": [
      {"days": 10, "mg": 0.4375, "pieces": "¾ Tbl. 0,5 mg + ¼ Tbl. 0,25 mg", "use": {"0.5": 0.75, "0.25": 0.25}},
      {"days": 10, "mg": 0.375,  "pieces": "¾ Tbl. 0,5 mg", "use": {"0.5": 0.75}},
      {"days": 10, "mg": 0.3125, "pieces": "½ Tbl. 0,5 mg + ¼ Tbl. 0,25 mg", "use": {"0.5": 0.5, "0.25": 0.25}},
      {"days": 14, "mg": 0.25,   "pieces": "½ Tbl. 0,5 mg", "use": {"0.5": 0.5}},
      {"days": 14, "mg": 0.1875, "pieces": "¼ Tbl. 0,5 mg + ¼ Tbl. 0,25 mg", "use": {"0.5": 0.25, "0.25": 0.25}},
      {"days": 14, "mg": 0.125,  "pieces": "¼ Tbl. 0,5 mg", "use": {"0.5": 0.25}},
      {"days": 14, "mg": 0.0625, "pieces": "¼ Tbl. 0,25 mg", "use": {"0.25": 0.25}}
    ]}'::jsonb, '{start}', taper->'start')
where name = 'Alprazolam' and kind = 'taper';
