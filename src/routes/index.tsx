import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ArrowRight,
  Ruler,
  FileText,
  Mic,
  Camera,
  Clock,
  Receipt,
  Sparkles,
  ShieldCheck,
  Check,
  Smartphone,
  Zap,
  BrainCircuit,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HandwerkPilot – KI-Software für Handwerksbetriebe" },
      {
        name: "description",
        content:
          "Angebot, Aufmaß, Zeiterfassung, Baustellenbericht und Rechnung – in einer App. KI-gestützt, mobil, für deutsche Handwerksbetriebe.",
      },
    ],
  }),
  component: Landing,
});

const gewerke = [
  "Stuckateure",
  "Maler",
  "Trockenbauer",
  "Dachdecker",
  "Schreiner",
  "SHK",
  "Elektriker",
  "GaLaBau",
  "Ausbau & Bau",
];

const features = [
  { icon: Ruler, title: "Digitales Aufmaß", desc: "Wand-, Decken-, Fassaden- und Putzflächen in Sekunden. Abzüge für Fenster und Türen inklusive." },
  { icon: FileText, title: "Angebote in Minuten", desc: "Positionen aus Aufmaß, Materialstamm oder direkt aus der Kundenanfrage mit KI vorbereitet." },
  { icon: Mic, title: "KI-Sprachbericht", desc: "Auf der Baustelle einsprechen – KI erstellt Bericht, Materialliste und Rechnungsposten." },
  { icon: Clock, title: "Mobile Zeiterfassung", desc: "Start/Stopp per Klick, Pausen, Fahrtzeit, alles projektgenau abrechenbar." },
  { icon: Camera, title: "Baustellendoku", desc: "Fotos mit Vorher/Nachher, Notiz je Bild, automatischer Fotobericht." },
  { icon: Receipt, title: "Rechnungsgrundlage", desc: "Aus Angebot, Zeiten und Material – ein Klick, fertig zur Abrechnung." },
  { icon: BrainCircuit, title: "KI-Berichtsgenerator", desc: "Aus Notizen, Fotos und Zeiten entsteht ein kundentauglicher Baustellenbericht." },
  { icon: Smartphone, title: "Mobile-first", desc: "Große Buttons, klare Bedienung – funktioniert auf jedem Handy und Tablet." },
  { icon: ShieldCheck, title: "Rollen & Rechte", desc: "Admin, Büro, Bauleiter, Monteur, Azubi – jeder sieht nur was er braucht." },
];

const plans = [
  { name: "Starter", price: 49, users: "1–3 Nutzer", features: ["Alle Kernmodule", "Aufmaß, Angebot, Bericht", "Mobile App", "E-Mail-Support"] },
  { name: "Team", price: 149, users: "bis 10 Nutzer", featured: true, features: ["Alles aus Starter", "KI-Berichtsgenerator", "KI-Sprachbericht", "Materialverwaltung", "Rollen & Rechte"] },
  { name: "Business", price: 299, users: "bis 30 Nutzer", features: ["Alles aus Team", "Outlook-Integration", "DATEV-Export (bald)", "Prioritäts-Support", "Onboarding"] },
  { name: "Enterprise", price: null, users: "30–100 Nutzer", features: ["Individuelle Preise", "Dedizierter Ansprechpartner", "SLA & Schulung", "GAEB & ZUGFeRD (bald)"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <nav className="hidden gap-8 md:flex">
            <Link to="/funktionen" className="text-sm font-medium text-muted-foreground hover:text-foreground">Funktionen</Link>
            <Link to="/preise" className="text-sm font-medium text-muted-foreground hover:text-foreground">Preise</Link>
            <Link to="/kontakt" className="text-sm font-medium text-muted-foreground hover:text-foreground">Kontakt</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Anmelden</Link>
            </Button>
            <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to="/auth" search={{ mode: "signup" }}>Kostenlos testen</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 opacity-30" style={{
          background: "radial-gradient(60% 40% at 80% 20%, rgba(249,115,22,0.35) 0%, transparent 60%)"
        }} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> KI-gestützte Handwerkersoftware
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Weniger Büro.<br />
              <span className="text-brand">Mehr Baustelle.</span><br />
              Mehr Überblick.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/80">
              Aufmaß, Angebot, Zeiterfassung, Bericht und Rechnung – in einer App. Für Stuckateure, Maler, SHK, Elektriker und alle Ausbaubetriebe in Deutschland.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-14 bg-brand px-8 text-base font-semibold text-brand-foreground hover:bg-brand/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  30 Tage kostenlos testen <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 border-white/30 bg-transparent px-8 text-base text-white hover:bg-white/10">
                <Link to="/funktionen">Funktionen ansehen</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/60">Keine Kreditkarte nötig. Deutscher Support. Server in der EU.</p>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative">
            <div className="rounded-2xl bg-white p-4 shadow-lift text-foreground">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Guten Morgen, Meister Bauer</div>
                  <div className="font-display text-lg font-semibold">Dashboard</div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground text-sm font-semibold">MB</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Heutige Termine", val: "4" },
                  { label: "Aktive Baustellen", val: "7" },
                  { label: "Offene Angebote", val: "3" },
                  { label: "Offene Berichte", val: "5" },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl bg-secondary p-3">
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                    <div className="font-display text-2xl font-bold">{k.val}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { icon: Mic, label: "Sprachbericht" },
                  { icon: FileText, label: "Angebot" },
                  { icon: Camera, label: "Foto hochladen" },
                  { icon: Ruler, label: "Aufmaß" },
                ].map((a) => (
                  <button key={a.label} className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-left text-sm font-medium hover:border-brand hover:text-brand">
                    <a.icon className="h-4 w-4 text-brand" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute -right-4 -top-4 hidden rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground shadow-lift md:block">
              <Zap className="mr-1 inline h-3.5 w-3.5" /> KI eingebaut
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-bold sm:text-4xl">
          Zettelwirtschaft, doppelte Erfassung, vergessene Nachträge – Schluss damit.
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            "Angebote dauern ewig – der Feierabend wird kürzer, nicht der Angebotsstapel.",
            "Zettel von der Baustelle landen erst Tage später im Büro – oder gar nicht.",
            "Nachträge und Material vergessen? Deckungsbeitrag futsch, Kunde diskutiert.",
          ].map((p, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive font-bold">{i + 1}</div>
              <p className="text-base leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lösung / Features */}
      <section className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Alles in einer App</div>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Von der Anfrage bis zur Rechnung</h2>
            <p className="mt-4 text-muted-foreground">Ein System für Büro und Baustelle. Kein Wechsel zwischen Excel, Word, Fotoordner und Zettel.</p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KI-Beispiel */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">KI, die versteht wie Handwerker sprechen</div>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Einsprechen. Fertig.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Der Monteur spricht auf der Baustelle einen Bericht ein – HandwerkPilot macht daraus Tätigkeit, Aufmaß, Materialliste, Zeit, Rechnungsposten und eine Kunden-Zusammenfassung.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Erkennt m², kg, lfm, Materialnamen und Uhrzeiten",
                "Schreibt daraus einen sachlichen deutschen Baustellenbericht",
                "Erstellt automatisch die Kundenmail und die Rechnungsgrundlage",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-brand" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eingabe (Sprache)</div>
              <p className="text-sm italic">
                „Heute bei Familie Müller im Wohnzimmer alte Tapete entfernt, Wandflächen gespachtelt, 36 Quadratmeter, zwei Säcke Spachtelmasse verbraucht, morgen schleifen und grundieren."
              </p>
            </div>
            <div className="flex justify-center"><ArrowRight className="h-6 w-6 rotate-90 text-brand" /></div>
            <div className="rounded-2xl bg-navy p-5 text-white shadow-lift">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">KI-Ergebnis</div>
              <div className="space-y-2 text-sm">
                <div><span className="text-white/60">Tätigkeit:</span> Tapetenentfernung, Wände gespachtelt</div>
                <div><span className="text-white/60">Aufmaß:</span> 36 m² Wandfläche</div>
                <div><span className="text-white/60">Material:</span> 2 Sack Spachtelmasse</div>
                <div><span className="text-white/60">Offen:</span> Schleifen, Grundieren (morgen)</div>
                <div><span className="text-white/60">Rechnungspositionen:</span> 3 Vorschläge</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zielgruppen */}
      <section className="bg-secondary/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Für alle Ausbau- und Baugewerke</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {gewerke.map((g) => (
              <span key={g} className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium">{g}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Preise */}
      <section id="preise" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Faire Preise. Keine Überraschungen.</h2>
          <p className="mt-4 text-muted-foreground">Monatlich kündbar. Alle Preise zzgl. MwSt.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-card ${
                p.featured ? "border-brand bg-navy text-white shadow-lift" : "border-border bg-card"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
                  Beliebt
                </span>
              )}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <div className="mt-4">
                {p.price !== null ? (
                  <div>
                    <span className="font-display text-4xl font-bold">{p.price} €</span>
                    <span className={`text-sm ${p.featured ? "text-white/70" : "text-muted-foreground"}`}>/Monat</span>
                  </div>
                ) : (
                  <span className="font-display text-3xl font-bold">Auf Anfrage</span>
                )}
              </div>
              <div className={`mt-1 text-sm ${p.featured ? "text-white/70" : "text-muted-foreground"}`}>{p.users}</div>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`mt-0.5 h-4 w-4 ${p.featured ? "text-brand" : "text-brand"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-6 ${p.featured ? "bg-brand text-brand-foreground hover:bg-brand/90" : ""}`}
                variant={p.featured ? "default" : "outline"}
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  {p.price !== null ? "Testen" : "Kontakt"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Weniger Büro. Mehr Baustelle. Mehr Überblick.
          </h2>
          <p className="mt-4 text-white/80">Starte in 2 Minuten. Deine Daten liegen auf EU-Servern.</p>
          <Button asChild size="lg" className="mt-8 h-14 bg-brand px-8 text-base font-semibold text-brand-foreground hover:bg-brand/90">
            <Link to="/auth" search={{ mode: "signup" }}>
              Jetzt kostenlos starten <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} HandwerkPilot – Made in Germany</div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/preise">Preise</Link>
            <Link to="/funktionen">Funktionen</Link>
            <Link to="/kontakt">Kontakt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
