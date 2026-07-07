import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/funktionen")({
  head: () => ({ meta: [{ title: "Funktionen – MeisterMe" }, { name: "description", content: "Alle Funktionen: Aufmaß, Angebot, Zeiterfassung, KI-Sprachbericht, Rechnung." }] }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader title="Funktionen" subtitle="Alles was du für Büro und Baustelle brauchst." />
      <p className="text-muted-foreground">Aufmaß, Angebot, Kalkulation, Zeiterfassung, Einsatzbericht, KI-Sprachbericht, Fotos, Aufgaben, Rechnungsgrundlagen, Materialstamm, Outlook-Anbindung, Rollen & Rechte, Mandantenfähigkeit.</p>
    </div>
  ),
});
