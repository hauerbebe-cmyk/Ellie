# 🐾 Ellie-App

Kleine App für Ellie: Medikamente (Soll vs. Ist), Bellistima, Tagesprotokoll, Notizen und ein zufälliger Spitzname auf der Startseite. Läuft auf beiden iPhones, alle Einträge synchronisieren live.

## Einrichtung (alles vom iPhone aus, ca. 15 Min.)

### 1. Datenbank (Supabase, kostenlos)
1. Auf supabase.com mit GitHub anmelden → **New project** (Name z. B. `ellie`, Region Frankfurt, Passwort egal, aber merken).
2. Links **SQL Editor** → Inhalt von `schema.sql` reinkopieren → **Run**. Danach genauso `seed.sql` (Spitznamen-Grundstock + Alprazolam-Ausschleichplan).
   *Schon mit der alten Version eingerichtet?* Dann erst `alter table meds add column taper jsonb;` ausführen, danach `seed.sql`.
3. Links **Authentication → Users → Add user → Create new user**: einmal für dich, einmal für Jana (E-Mail + Passwort, Haken bei *Auto Confirm User*).
4. **Authentication → Sign In / Providers**: *Allow new users to sign up* **ausschalten** (dann kommt niemand Fremdes rein).
5. **Project Settings → API** (bzw. *API Keys*): die **Project URL** und den **publishable** (oder *anon public*) Key kopieren.

### 2. Code (GitHub)
1. Die Dateien in ein neues Repo `ellie` hochladen.
2. In `config.js` URL und Key eintragen und speichern.
3. **Settings → Pages** → Branch `main`, Ordner `/ (root)` → Save. Nach 1–2 Min. läuft die App unter `https://<dein-name>.github.io/ellie/`.

### 3. Auf die iPhones
Link in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**. Danach über das Pfoten-Icon starten, einloggen, Namen eingeben – fertig.

## Gut zu wissen
- Der Key in `config.js` darf öffentlich sein: Ohne Login sieht man trotzdem nichts.
- Spitznamen: ⚙️ auf der Startseite (mehrere mit Komma trennen).
- Medikamentenplan: Reiter *Medis* → **Plan**.
- Alprazolam-Ausschleichplan: Die App berechnet die Tagesdosis selbst (inkl. welche Tablettenstücke). Wenn sich alles verschiebt: *Plan* → Alprazolam → „Heute ist Tag …“ anpassen.
- Update 2 (Bell-Gründe + Fotos): `update_2.sql` einmal im SQL Editor ausführen. Neue Gründe legt ihr in *Bellistima* über „Neuer Grund …“ an, Fotos über ⚙️ → Fotos.
- Excel-Export: Reiter *Protokoll* → **📊 Excel** → Teilen (Mail, Dateien, …). Drei Blätter: Protokoll (inkl. Bellen + Medis pro Tag), Medikamente (Soll/Ist), Bellistima.
- Ohne Supabase-Daten in `config.js` läuft die App im Demo-Modus.
- Kostenloses Supabase-Projekt pausiert nach ~1 Woche ohne Nutzung – bei täglicher Nutzung kein Thema.
