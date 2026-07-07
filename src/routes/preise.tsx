import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/preise")({
  head: () => ({ meta: [{ title: "Preise – HandwerkPilot" }, { name: "description", content: "Preise für HandwerkPilot: Starter 49€, Team 149€, Business 299€ und Enterprise auf Anfrage." }] }),
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <PageHeader title="Preise" subtitle="Monatlich kündbar. Alle Preise zzgl. MwSt." />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Starter", "49 €/Monat", "1–3 Nutzer"],
          ["Team", "149 €/Monat", "bis 10 Nutzer"],
          ["Business", "299 €/Monat", "bis 30 Nutzer"],
          ["Enterprise", "auf Anfrage", "30–100 Nutzer"],
        ].map(([n, p, u]) => (
          <div key={n} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground"><Building2 className="h-5 w-5" /></div>
            <h3 className="mt-3 font-display text-xl font-bold">{n}</h3>
            <div className="text-brand">{p}</div>
            <div className="text-sm text-muted-foreground">{u}</div>
          </div>
        ))}
      </div>
    </div>
  ),
});
