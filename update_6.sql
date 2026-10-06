-- Update 6: Termine + Linksammlung
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  day date not null,
  time text,
  place text,
  note text,
  author text,
  created_at timestamptz default now()
);
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  title text,
  url text not null,
  note text,
  author text,
  created_at timestamptz default now()
);
alter table appointments enable row level security;
alter table links enable row level security;
drop policy if exists "nur wir" on appointments;
drop policy if exists "nur wir" on links;
create policy "nur wir" on appointments for all to authenticated using (true) with check (true);
create policy "nur wir" on links for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table links;
