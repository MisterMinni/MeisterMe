# MeisterMe

MeisterMe ist eine eigenständig betriebene All-in-One-Plattform für Stuckateure,
Maler, Trockenbauer und weitere Ausbaugewerke. Die Anwendung verbindet
Baustellenorganisation, Personal, Zeiterfassung, CRM, Aufmaß, Angebote,
Rechnungen, Kommunikation und KI-Werkzeuge.

## Architektur

- React 19 und TanStack Start für Web, SSR und sichere Serverfunktionen
- Supabase für Postgres, Auth, Storage und Row Level Security
- frei konfigurierbarer OpenAI-kompatibler KI-Anbieter
- installierbare Progressive Web App für Windows, macOS, Android und iOS
- Capacitor 8 als nativer iOS-/Android-Container für die Stores

Es bestehen keine Laufzeit-, Build- oder Telemetrieverbindungen zu externen App-Buildern.

## Lokal starten

Voraussetzungen: Node.js 22+, npm und optional Docker Desktop für den lokalen
Supabase-Stack.

```bash
npm install
copy .env.example .env.local
npm run dev
```

In `.env.local` werden die URL und der Publishable Key des eigenen
Supabase-Projekts gesetzt. Secret Keys dürfen nie mit `VITE_` beginnen.

## Supabase

Das produktionsnahe Cloudprojekt `MeisterMe` läuft in Frankfurt (`eu-central-1`):

- Projekt-Ref: `hxaactuknctpkywptrfo`
- API-URL: `https://hxaactuknctpkywptrfo.supabase.co`
- Postgres: 17

Die lokale, nicht versionierte `.env.local` ist bereits mit URL und modernem
Publishable Key verbunden. Für Mitarbeiteranlage, Passwort-Reset und andere
Admin-Aktionen muss zusätzlich ein eigener `SUPABASE_SECRET_KEY` ausschließlich
in der Server- bzw. Deployment-Umgebung gesetzt werden.

`supabase/schema.sql` ist nur noch eine lesbare Referenz des historischen
Kernschemas. Der reproduzierbare Stand liegt ausschließlich unter
`supabase/migrations`.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Das Schema setzt RLS für jede über die Data API erreichbare Tabelle und vergibt
Data-API-Rechte explizit. Neue Tabellen müssen diesem Muster folgen.

## KI konfigurieren

Die KI-Schlüssel werden ausschließlich in der Server-Umgebung gesetzt:

```dotenv
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=...
AI_MODEL=...
```

Der Anbieter muss den OpenAI-kompatiblen Endpunkt `/chat/completions`
unterstützen. Im KI-Assistenten stehen Sprachbericht, Baubericht, Kundenmail,
Angebotsentwurf und Materialschätzung bereit. Ergebnisse sind Entwürfe und vor
geschäftlicher Nutzung fachlich zu prüfen.

## Desktop und PWA

Nach HTTPS-Deployment lässt sich MeisterMe in Chrome und Edge direkt als
Desktop-App installieren. Manifest, Service Worker und Offline-Fallback liegen
in `public/`.

## Vercel Preview / Staging

Der Branch eines Pull Requests wird als Vercel Preview bereitgestellt. Das
Nitro-Build ist bereits für TanStack Start eingerichtet; `vercel.json` platziert
die Serverfunktionen in Frankfurt (`fra1`) nahe am Supabase-Projekt.

1. Das GitHub-Repository in Vercel importieren und `main` als Production Branch
   wählen.
2. Die Werte aus `.env.staging.example` als **Preview Environment Variables**
   hinterlegen. Secret- und KI-Schlüssel niemals mit `VITE_` benennen.
3. Den Preview-Build auslösen oder lokal `npm run deploy:preview` verwenden.
4. Die erzeugte URL mit `npm run smoke:remote -- --url=<preview-url>` prüfen.

Vercel setzt bei jedem Build automatisch `VERCEL=1`. Dadurch verwendet der
Prebuild-Check das strenge Staging-Profil und stoppt das Deployment, solange
`SUPABASE_SECRET_KEY`, `AI_API_KEY` oder `AI_MODEL` fehlen. Lokal genügt für den
Build das Core-Profil aus `.env.local`.

Die maschinenlesbare Health-Route liegt unter `/healthz` und gibt weder Schlüssel
noch Konfigurationswerte aus.

## iOS und Android

TanStack-Serverfunktionen verwenden absichtlich same-origin Requests. Deshalb
zeigt der native Container auf das produktive HTTPS-Deployment:

```powershell
$env:MEISTERME_APP_URL = "https://app.meisterme.de"
npm run mobile:sync
npm run mobile:open:android
```

Das iOS-Projekt kann vorbereitet, aber nur auf macOS mit Xcode signiert und zum
App Store hochgeladen werden. Vor einem Store-Release sind außerdem App-Icons,
Screenshots, Datenschutzerklärung, Support-URL, Apple-/Google-Developerkonten
und die jeweilige Datenschutzdeklaration erforderlich.

## Qualität

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run smoke
npm run check
```

## Sicherheit

- Niemals `SUPABASE_SECRET_KEY` oder `AI_API_KEY` in Clientcode oder Git legen.
- Publishable Keys sind für Browsercode vorgesehen; RLS ist die Datenbarriere.
- Änderungen an Rollen, Storage oder RLS vor dem Release mit mehreren Testkonten
  aus unterschiedlichen Betrieben prüfen.
- Nach einem versehentlichen Passwort- oder Secret-Commit das Geheimnis immer
  rotieren. Das Entfernen aus dem aktuellen Branch bereinigt keine Git-Historie.
