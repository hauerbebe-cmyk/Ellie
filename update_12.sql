-- Update 12: Kaustangen-Zähler im Protokoll
create table if not exists chews (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  author text,
  created_at timestamptz default now()
);
alter table chews enable row level security;
drop policy if exists "nur wir" on chews;
create policy "nur wir" on chews for all to authenticated using (true) with check (true);
do $$ begin
  alter publication supabase_realtime add table chews;
exception when duplicate_object then null; when undefined_object then null;
end $$;
