-- Ellie-App: komplett in den Supabase SQL Editor kopieren und auf "Run" tippen.

create table nicknames (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  author text,
  created_at timestamptz default now()
);

create table meds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dose text,
  kind text default 'taeglich',      -- 'taeglich' oder 'bedarf'
  times text[] default '{}',         -- z. B. {08:00,20:00}
  note text,
  active boolean default true,
  taper jsonb,                       -- Ausschleichplan (Start + Stufen)
  author text,
  created_at timestamptz default now()
);

create table med_logs (
  id uuid primary key default gen_random_uuid(),
  med_id uuid references meds(id) on delete cascade,
  day date not null,
  slot text,                         -- Uhrzeit, 'taeglich' oder 'bedarf'
  amount text,                       -- was wirklich gegeben wurde
  skipped boolean default false,
  note text,
  author text,
  created_at timestamptz default now()
);

create table barks (
  id uuid primary key default gen_random_uuid(),
  reason text,
  author text,
  created_at timestamptz default now()
);

create table daily_log (
  id uuid primary key default gen_random_uuid(),
  day date unique not null,
  mood int,
  tags text[] default '{}',
  text text,
  author text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  pinned boolean default false,
  author text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Nur eingeloggte Nutzer (also ihr zwei) dürfen lesen und schreiben
do $$
declare t text;
begin
  foreach t in array array['nicknames','meds','med_logs','barks','daily_log','notes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "nur wir" on %I for all to authenticated using (true) with check (true)', t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;
