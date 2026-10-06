-- Update 2: eigene Bell-Gründe + Fotos. Einmal im Supabase SQL Editor ausführen.

-- Bell-Gründe (gemeinsam für euch beide)
create table bark_reasons (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  icon text,
  active boolean default true,
  author text,
  created_at timestamptz default now()
);
insert into bark_reasons (key, label, icon, created_at) values
  ('hausflur', 'Geräusch im Hausflur', '🚪', now() - interval '3 seconds'),
  ('draussen', 'Geräusch draußen',     '🌳', now() - interval '2 seconds'),
  ('anderes',  'Anderer Grund',        '❓', now() - interval '1 second');
alter table bark_reasons enable row level security;
create policy "nur wir" on bark_reasons for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table bark_reasons;

-- Privater Foto-Speicher (nur eingeloggt sichtbar)
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false);
create policy "fotos lesen"   on storage.objects for select to authenticated using (bucket_id = 'fotos');
create policy "fotos hochladen" on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
create policy "fotos loeschen" on storage.objects for delete to authenticated using (bucket_id = 'fotos');
