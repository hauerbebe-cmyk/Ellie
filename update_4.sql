-- Update 4: Fluoxetin (Aufdosieren), Vitamin B12, Trazodon (Notfall). Einmal ausführen.

update meds set taper = taper || '{"title": "Ausschleichen"}'::jsonb where name = 'Alprazolam' and kind = 'taper';

insert into meds (name, dose, kind, times, note, author) values
  ('Vitamin B12', '1 Streukapsel', 'taeglich', '{}', null, 'Dennis'),
  ('Trazodon', null, 'bedarf', '{}', 'Nur im Notfall (z. B. Tierarzt)', 'Dennis');

insert into meds (name, kind, times, taper, author) values
  ('Fluoxetin', 'taper', '{}',
   '{"title": "Aufdosieren", "start": null, "pre": {"mg": 30, "pieces": ""}, "steps": [{"days": 14, "mg": 35, "pieces": ""}, {"days": null, "mg": 40, "pieces": ""}]}'::jsonb,
   'Dennis');

-- Soll-Dosis für Erinnerungen: kann jetzt auch "Start offen" und "dauerhaft"
create or replace function ellie_taper_text(t jsonb, d date) returns text language plpgsql immutable as $$
declare n int; acc int := 0; s jsonb;
begin
  if t->>'start' is null or d < (t->>'start')::date then
    return replace(t->'pre'->>'mg', '.', ',') || ' mg' || coalesce(nullif(' (' || coalesce(t->'pre'->>'pieces', '') || ')', ' ()'), '');
  end if;
  n := d - (t->>'start')::date;
  for s in select * from jsonb_array_elements(t->'steps') loop
    if s->>'days' is null or n < acc + (s->>'days')::int then
      return replace(s->>'mg', '.', ',') || ' mg' || coalesce(nullif(' (' || coalesce(s->>'pieces', '') || ')', ' ()'), '');
    end if;
    acc := acc + (s->>'days')::int;
  end loop;
  return null;
end $$;
