
# MeisterMe – Bauplan

Deutschsprachige, mobile-first SaaS für Handwerksbetriebe. Alle 20 Module werden angelegt; der Kern-MVP-Flow (Kunde → Projekt → Aufmaß → Angebot → Einsatzbericht mit KI → Zeit/Material → Kundenmail + Rechnungsgrundlage) ist voll funktional, Rand-Module (Outlook-Sync, DATEV, GAEB, GoBD, E-Rechnung, Großhändler-APIs) sind als saubere UI-Platzhalter angelegt.

## Design-Richtung (fix)

- **Farben**: Dunkelblau `#0B1E3F` (Primary), Tiefblau `#0A1730` (Sidebar/Hero), Weiß `#FFFFFF`, Orange `#F97316` (Akzent/CTA), warmes Grau `#F5F5F4` als Flächen.
- **Typografie**: `@fontsource/inter-tight` für Headlines (semibold/bold), `@fontsource/inter` für Body. Große Type-Skala, hohe Kontraste.
- **UI-Sprache**: Große Buttons (min 56 px Höhe auf Mobil), kräftige Icons (lucide) in Orange auf dunklen Kacheln, klare Kartenoptik mit spürbaren Schatten und 14–16 px Radius. Keine lila Gradients, keine dünnen Weights.
- **Motion**: sanfte Fade/Slide-Ins (framer-motion), Hover-Lift auf Kacheln.

## Technischer Stack

- TanStack Start + TanStack Query (Standard-Template).
- **Lovable Cloud** (Supabase) für Auth, DB, Storage.
- **Lovable AI Gateway** (google/gemini-2.5-flash) für Sprachbericht, Berichtsgenerator, Kundenmail, Angebotsvorbereitung – Aufruf über `createServerFn` mit `requireSupabaseAuth`.
- Auth: E-Mail + Passwort.
- Storage-Bucket `handwerk-files` (privat) für Fotos/Dokumente.

## Datenmodell (Supabase)

Alle Tabellen mit `tenant_id` (Betrieb) + RLS „nur eigener Mandant".

- `tenants` – Betrieb (Name, Anschrift, Logo, Gewerk-Default).
- `profiles` – 1:1 zu `auth.users`, Felder: `full_name`, `tenant_id`, `phone`.
- `app_role` enum: `admin`, `buero`, `bauleiter`, `monteur`, `azubi`.
- `user_roles` (user_id, role, tenant_id) + `has_role()` SECURITY DEFINER.
- `customers` (Firma, Ansprechpartner, Adresse, Telefon, E-Mail, Notizen).
- `projects` (customer_id, Adresse, Gewerk, Status-Enum, Beschreibung, Budget, Start/Ende).
- `project_members` (project_id, user_id).
- `measurements` (project_id, Raum, L/B/H, Fenster/Tür-Abzüge JSON, berechnete Fläche/Umfang, Notizen) – Berechnung clientseitig, gespeichert.
- `materials` (Artikelnr, Bezeichnung, Einheit, EK, VK, Lieferant, Bestand).
- `project_materials` (project_id, material_id, Menge, Ort: Angebot/Einsatz).
- `offers` (Nummer, customer_id, project_id, Status, MwSt, Rabatt, Summen).
- `offer_positions` (offer_id, Pos, Text, Menge, Einheit, EP, GP, Typ Material/Arbeit).
- `time_entries` (user_id, project_id, Start, Ende, Pause, Fahrtzeit, Tätigkeit).
- `field_reports` (Einsatzberichte: project_id, Datum, Start/Ende, Pause, Fahrtzeit, Tätigkeit, Probleme, offene Punkte, Material JSON, Kundenunterschrift URL, Status, KI-generierter Text).
- `photos` (project_id, report_id?, url, notiz, tag: vorher/nachher).
- `tasks` (project_id, title, assignee, due_date, status, priority).
- `invoice_drafts` (project_id, Positionen JSON, Summen, Status).
- `communications` (customer_id, kanal, betreff, body, richtung, timestamp).
- `documents` (owner_type, owner_id, url, kind, name).
- `calculations` (project_id, material_kosten, lohn_kosten, stundensatz, gk_zuschlag, gewinn, vk, db).

RLS-Policies: SELECT/INSERT/UPDATE/DELETE nur wenn `tenant_id = get_current_tenant(auth.uid())`. Rollen-Gates zusätzlich für Rechnungs-/Angebotstabellen (Monteur/Azubi kein Schreibrecht).

Demo-Seeder-Migration legt für Tenant „Stuck & Putz Meister GmbH" 4 Kunden, 5 Projekte, Aufmaße, Materialien, Zeiten, 2 Angebote, 1 Rechnungsgrundlage an.

## Routen-Architektur

Public:
- `/` Landingpage (Hero, Problem, Lösung, Features, KI-Vorteile, Gewerke, Preise, CTA, Footer).
- `/preise`, `/funktionen`, `/kontakt`.
- `/auth` (Login/Signup, beim Signup wird `tenant` + Admin-Rolle angelegt).

Authenticated (`_authenticated/`, App-Shell mit Sidebar + Topbar + Mobile-Bottom-Nav):
- `/app` Dashboard
- `/app/kunden`, `/app/kunden/$id`
- `/app/projekte`, `/app/projekte/$id` (Tabs: Übersicht, Aufmaß, Material, Berichte, Fotos, Aufgaben, Angebote, Rechnungsgrundlagen, Dokumente, Team)
- `/app/angebote`, `/app/angebote/$id`
- `/app/aufmass` (Übersicht) – Detail über Projekt-Tab
- `/app/kalkulation/$projectId`
- `/app/berichte` (Einsatzberichte), `/app/berichte/$id`
- `/app/zeiten` (Start/Stopp + Wochenübersicht)
- `/app/material`
- `/app/fotos`
- `/app/ki-sprachbericht`
- `/app/rechnungsgrundlagen`
- `/app/aufgaben` (Kalender + Liste + „Heute")
- `/app/kommunikation`
- `/app/dokumente`
- `/app/buero` (offene Posten, Mahnwesen, DATEV, GAEB, GoBD – Platzhalter)
- `/app/integrationen/outlook`
- `/app/einstellungen` (Betrieb, Nutzer/Rollen, Rechnungsdaten)

## KI-Server-Funktionen (`src/lib/ai.functions.ts`)

Alle mit `requireSupabaseAuth`, Modell `google/gemini-2.5-flash` via Lovable AI Gateway, strukturiertes JSON via `Output.object` + zod:

1. `parseVoiceReport({ text, projectId })` → { tätigkeit, aufmaß[], material[], arbeitszeit_min, offene_punkte[], interner_bericht, kunden_zusammenfassung, rechnungspositionen[] } → speichert `field_report` + schlägt Material/Zeiten vor.
2. `generateReport({ reportId })` → professioneller deutscher Bericht (sachlich, kundentauglich, Materialliste, offene Punkte, nächster Schritt).
3. `generateCustomerEmail({ reportId | offerId })` → { betreff, body } (Outlook-Entwurf-tauglich).
4. `prepareOfferFromRequest({ customerRequest, projectId })` → Positionen mit Menge/EP/Material.
5. `estimateMaterialFromMeasurement({ measurementId, gewerk })` → Materialbedarf (Spachtel, Putz, Farbe, Dämmung, Laufmeter etc.) für Stuckateur/Maler/Trockenbau.

## MVP-Flow (voll klickbar)

1. Signup → Tenant + Admin.
2. Dashboard → „Neuer Kunde" → Kunde speichern.
3. „Neues Projekt" mit Kunde + Gewerk (Stuckateur).
4. Projekt-Tab „Aufmaß" → Raum anlegen, L/B/H, Fenster-Abzug → Fläche/Umfang berechnet → „Materialbedarf schätzen (KI)" → Vorschläge übernehmen.
5. Tab „Angebot" → „Aus Aufmaß Angebot erstellen" oder „Aus Kundenanfrage vorbereiten (KI)" → Positionen editieren → Status setzen.
6. Tab „Berichte" → mobile Einsatzbericht-Maske → Textfeld für Sprachbericht → „KI auswerten" ruft `parseVoiceReport` → Zeit/Material werden vorbelegt → speichern.
7. Bericht öffnen → „Bericht mit KI erstellen" → sauberer Text → „Kundenmail generieren" → Vorschau + Kopieren/„An Outlook senden"-Platzhalter.
8. „Rechnungsgrundlage erzeugen" → Positionen aus Angebot + Zeiten + Material → editieren → speichern → PDF-Export-Platzhalter.

## Modul-Umsetzung

- **Kern voll funktional**: Auth, Dashboard, Kunden, Projekte, Aufmaß, Angebote, Einsatzberichte, KI-Sprachbericht/Berichtsgenerator, Zeiterfassung, Material, Fotos (Upload+Vorher/Nachher), Aufgaben, Rechnungsgrundlage, Kommunikation (intern), Dokumente (Upload/Liste), Kalkulation, Einstellungen/Rollen.
- **Platzhalter mit klarer „In Vorbereitung"-Kennzeichnung**: Outlook-Sync (Button „Mit Microsoft 365 verbinden"), DATEV-Export, GAEB-Import/Export, GoBD-Archivierung, E-Rechnung/ZUGFeRD, Großhändler-APIs, Soll/Ist-Vergleich, KI-Fotoerkennung (Schaden/Fortschritt/Material), PDF-Export (jetzt: Druckansicht + Download-Platzhalter), Sprachaufnahme (jetzt: Textfeld – Mic-Icon vorbereitet).

## Landingpage-Struktur

Hero (dunkelblau, Orange-CTA, Device-Mockup rechts) → Problem-Statement mit 3 Pain-Karten → Lösung/Feature-Grid (9 Kacheln mit Icons) → KI-Vorteile-Sektion (3 Highlights mit Beispiel-Sprachbericht → KI-Output) → Zielgruppen (Gewerke-Chips) → Preistabelle 4 Karten (Team hervorgehoben) → Testimonial-Platzhalter → CTA-Band → Footer. Claim „Weniger Büro. Mehr Baustelle. Mehr Überblick." prominent im Hero.

## Reihenfolge der Umsetzung

1. Lovable Cloud aktivieren + Schema-Migration + RLS + Demo-Daten + Storage-Bucket.
2. Design-Tokens (styles.css), Fonts, App-Shell (Sidebar + Topbar + Mobile-Bottom-Nav), Logo.
3. Landingpage + Auth-Flow (Signup legt Tenant + Admin-Rolle an).
4. Dashboard mit echten Aggregaten.
5. Kunden + Projekte (inkl. Tabs-Grundgerüst).
6. Aufmaß + Kalkulation.
7. Angebote (mit KI-Vorbereitung).
8. Einsatzberichte + KI-Sprachbericht + KI-Berichtsgenerator.
9. Zeiterfassung + Material + Fotos + Aufgaben + Dokumente + Kommunikation.
10. Rechnungsgrundlage + Kundenmail.
11. Rand-Module (Outlook, Büro, Einstellungen, Integrationen) als Platzhalter-Seiten.
12. Rollen-Gating in UI (Monteur/Azubi sehen weniger).

## Was NICHT enthalten ist (bewusst als Platzhalter)

Echte Sprachaufnahme im Browser, echter PDF-Export, echter Microsoft-Graph-OAuth, echte Zahlungsabwicklung, echter DATEV/GAEB/ZUGFeRD-Export, echte Großhändler-Schnittstellen. Diese Punkte werden sichtbar als „Bald verfügbar" markiert, damit der Nutzer den Roadmap-Kontext sieht.

Bereit zur Umsetzung – bitte mit „Implement plan" bestätigen.
