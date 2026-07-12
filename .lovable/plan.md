
## Ausgangslage & wichtige Entscheidungen vorab

**1. Microsoft Entra ID – Realität**
Lovable Cloud unterstützt „Sign in with Microsoft" als OAuth-Button nicht nativ (nur Google und Apple). Der saubere Weg für Entra ID ist **SAML SSO** – exakt der Standard, den Unternehmen für AD-Anbindung nutzen. Das bedeutet:
- Kleine Betriebe: E-Mail + Passwort, Admin legt Mitarbeiter an.
- Enterprise-Kunden: SAML SSO gegen ihren eigenen Entra-ID-Tenant. Du gibst dem Kunden pro Betrieb ACS-URL und Entity-ID; er hinterlegt sie in Azure und mappt seine E-Mail-Domain.
- Automatischer Betriebs-Zuordnung: Login via `@firma.de` → wird automatisch dem Betrieb angehängt, dessen SAML-Domain matcht.

Sag Bescheid, wenn du für V1 zuerst eine konkrete Domain (z. B. deine Test-Firma) konfigurieren willst – dann verdrahte ich SAML sofort. Andernfalls bleibt das Feature-Gate „SSO aktivieren" im Admin-Bereich und ich baue nur die UI-Hülle.

**2. Löschen der alten Module – Umfang**
Weg aus Code + DB: `offers`, `invoice_drafts`, `calculations`, `field_reports`, `communications`, `materials` (als Katalog), `customers` (als eigenes Modul), `photos`, `measurements`. Behalten & umbauen: `projects` → wird zu „Baustellen", `tasks`, `time_entries`, `project_messages`, `documents`, `tenants`, `profiles`, `user_roles`. Die zugehörigen Routen unter `src/routes/_authenticated/app.*` werden entfernt.

**3. Architektur-Grundpfeiler**
- **Multi-Tenant per RLS** bleibt tragend – jede neue Tabelle bekommt `tenant_id` + Policy via `is_tenant_member()`.
- **Granulare Rollen**: neues Modell mit `roles` (pro Tenant), `permissions` (Action × Resource), `role_permissions`, `user_roles` (many-to-many). Standardrollen werden per Trigger beim Tenant-Anlegen geseedet, sind aber editierbar.
- **DSGVO**: Accounts nur deaktivieren, nie löschen (`disabled_at`). Chat-Nachrichten Soft-Delete. Alle personenbezogenen Änderungen in `audit_log`.
- **Realtime** via bestehende Supabase-Channels für Chat + Wochenplanung.
- **Mobile-First**: max-w-md zentriert auf Mobile; ab `md:` volle Breite mit Sidebar für Wochenplanung/Mitarbeiter-Tabellen. Kacheln bleiben 2-spaltig.

---

## Design-System (nach Mockup)

Neue Tokens in `src/styles.css`:
- Background: sehr helles Beige/Weiß `oklch(0.985 0.005 90)`
- Card: reines Weiß, `rounded-2xl`, weicher Schatten
- Primary/Navy: `#0B1B34` (Topbar, Icons in Kacheln)
- Accent/Orange: `#F26A21` (Avatar, „Arbeit beenden", Aktions-FAB)
- Kachel-Icons: dunkelblauer Kreis, weißes Icon
- Typografie: bestehende Display/Sans behalten, aber Größenskala reduzieren

Topbar-Redesign: dunkles Navy, Suchleiste links (bleibt), rechts nur Avatar-Kreis in Orange mit Initialen. Aktuelles User-Menü umziehen ins Profil-Bottom-Sheet.

---

## Umsetzung in 6 Iterationen

**Iter 1 – Abriss + neue DB-Foundation (1 Migration)**
- Drop der alten Tabellen (mit CASCADE) und Löschen der zugehörigen Routen/Komponenten/Server-Fns.
- Neue Tabellen: `roles`, `permissions` (seed), `role_permissions`, `user_role_assignments` (ersetzt `user_roles`), `sites` (umbenannt aus `projects`, neu: `color`, `image_url`, `start_date`, `end_date`, `status`), `site_members`, `absences`, `absence_balances`, `qualifications`, `employee_qualifications`, `equipment`, `weekly_assignments`, `time_entries` (erweitert um `activity_type`, `photos`, `voice_note`), `audit_log`, `notifications`.
- Neue Functions: `has_permission(user, resource, action)`, `current_tenant_id()` bleibt, `seed_default_roles(tenant_id)` als Trigger auf `tenants`.
- RLS + GRANTs für alle neuen Tabellen.
- Storage-Buckets: `site-images`, `chat-media`, `employee-docs`, `absence-attachments`.

**Iter 2 – Neues Design-System + Shell**
- Farb-Tokens & Radius in `styles.css` überschreiben.
- `AppShell` neu: dunkle Topbar, GlobalSearch links, Orange-Avatar rechts → öffnet Sheet mit Profil/Einstellungen/Team/SSO/Abmelden (letztere abhängig von Permission).
- Kein Burger, keine Sidebar. Auf Nicht-Dashboard-Seiten: „Zurück zum Dashboard" Chip oben.
- Dashboard als Kachel-Grid (2 Spalten mobil, 4 auf Desktop, max-w-4xl), gefiltert nach Permissions.

**Iter 3 – Baustellen (WhatsApp-Style)**
- Liste sortiert: Heute → Diese Woche → Aktiv → Archiv. Jede Karte mit Farbstreifen + Bild-Thumb + Status-Pill.
- Detail mit Tabs: Übersicht, Chat, Material, Dokumente, Team.
- Chat erweitert: Bilder-Upload, Voice-Memos (MediaRecorder API), Reply-to, `@mention` mit Popover, Read-Receipts, Systemnachrichten via DB-Trigger bei Team-Änderungen und Statuswechsel.
- Nur User mit `sites:create` sehen den FAB.

**Iter 4 – Zeiterfassung + Bautagesbericht**
- Fullscreen-Timer-Ansicht: XL-Digital-Clock, Start/Pause/Beenden, Baustellen-Switcher (öffnet Sheet), Tätigkeits-Chip.
- Beim Beenden: Foto- und Sprachbericht-Sheet → speichert in `time_entries.photos[]` + `voice_note_url`, ruft AI-Server-Fn auf, die Bautagesbericht generiert und an die Baustelle anhängt.
- Korrektur-Flow: Mitarbeiter editiert → Status `pending_approval`, Push an Bauleiter, Genehmigen setzt `approved_by`.

**Iter 5 – Wochenplanung + Abwesenheiten**
- Wochenplanung: Grid Mitarbeiter × Wochentage, Drag-&-Drop mit `@dnd-kit`, Baustellen-Palette links, farbige Blöcke. Konfliktprüfung serverseitig in `assign_weekly()` (Urlaub, Doppelbelegung, Wochenstunden).
- Mobile: Read-only Ansicht „Meine Einsätze" (Liste pro Tag).
- Abwesenheits-Antrag: Wizard mit Live-Berechnung (Arbeitstage minus Feiertage nach BL des Betriebs), Attest-Upload optional. Status-Timeline.
- Admin-Übersicht: Tabs Offen/Genehmigt/Abgelehnt, Bulk-Approve, Warnung bei Team-Überschneidungen.

**Iter 6 – Mitarbeiter- & Rollenverwaltung + SSO-Setup**
- Mitarbeiter-Detail mit Tabs: Persönliches, Arbeit, Qualifikationen, Arbeitsmittel, Dokumente, Urlaub. Deaktivieren statt Löschen.
- Rollen-Editor: Matrix Aktion × Ressource, individuelle Rollen anlegen.
- SAML-SSO-Setup-UI: Admin trägt Metadata-URL + Domains ein → ruft `supabase--configure_saml_sso` (das machst du dann pro Kunde einmal, für die App zeige ich ACS+Entity-ID an).
- Push-Benachrichtigungen: Web Push (VAPID) für Chat/Planungsänderungen/Urlaubs-Entscheidung.

---

## Was NICHT in V1 kommt (bewusst)

Kunden-Modul (kommt in V2 mit Angeboten), Angebote/Rechnungen/Kalkulation/GAEB/DATEV/ZUGFeRD (V2+), native Mobile-App (V3, gleicher API-Layer), Materialbestellung/Lagerbestand (V2), Zwei-Faktor (nach V1 als Add-on).

---

## Technische Details

- **Auth**: `_authenticated`-Layout bleibt integration-managed. SAML-User bekommen beim ersten Login automatisch `profiles`-Zeile + Tenant-Match über E-Mail-Domain in neuer Tabelle `tenant_sso_domains`.
- **Server-Funktionen**: `createServerFn` mit `requireSupabaseAuth` für alle privilegierten Aktionen (Rollen zuweisen, Abwesenheit genehmigen, Zeiten korrigieren). Admin-Aktionen wie `admin.createUser`/`deleteUser` bleiben in `team.functions.ts` (Namen ggf. auf `employees.functions.ts`).
- **AI**: Lovable AI Gateway (`google/gemini-2.5-flash`) für Bautagesbericht-Generierung.
- **Realtime**: `postgres_changes` auf `project_messages` (schon da), neu auf `weekly_assignments` und `notifications`.
- **Push**: `web-push`-Subscription in `push_subscriptions`, Trigger via Edge-DB-Function via `pg_net` → interne `/api/public/notify`-Route mit HMAC-Signatur.

---

## Meine Empfehlungen als Architekt (weichen leicht von der Spec ab)

1. **„Mitarbeiter haben keine Einstellungen"** ist zu strikt – lass sie zumindest Passwort ändern, Sprache wählen, Push-Benachrichtigungen togglen und Profilbild hochladen. Alles andere (Betrieb, Rolle, Wochenstunden) bleibt read-only.
2. **Chat-Retention**: 12 Monate ist für Bau-Doku zu kurz (Gewährleistung 5 Jahre). Vorschlag: Nachrichten bleiben, aber personenbezogene Daten in Chat werden nach Austritt eines Mitarbeiters pseudonymisiert („Ehemaliger Mitarbeiter").
3. **Wochenplanung mit Drag&Drop auf Touch** ist auf dem Handy fummelig – ich baue Mobile bewusst als Tap-Auswahl (Zelle antippen → Bottom-Sheet mit Baustellen-Liste), Desktop bekommt Drag&Drop.
4. **Ressourcen-Berechtigungen** modelliere ich lieber als **Scopes** (`sites.own`, `sites.tenant`, `time.own`) statt reiner Action-Liste – so kannst du „Bauleiter sieht Zeiten des eigenen Teams" sauber ausdrücken ohne Custom-Code pro Rolle.

---

## Bestätigung

Iter 1 (Abriss + neue DB) ist die riskanteste Änderung. **Sag Bescheid, wenn ich den Rundumschlag mit CASCADE-Drop machen darf** – dann geht Iter 1 sofort raus und die Folgeschritte kommen automatisch. Ohne dein OK breche ich das Löschen nicht los.
