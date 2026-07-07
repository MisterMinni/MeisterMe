import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Building2, FileText, Landmark, Archive, Send, TrendingUp } from "lucide-react";
import { ComingSoon } from "@/components/PageHeader";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/buero")({
  head: () => ({ meta: [{ title: "Büro – HandwerkPilot" }] }),
  component: () => (
    <div>
      <PageHeader title="Büro" subtitle="Buchhaltung, Mahnwesen, Exporte. Vieles davon ist in Vorbereitung." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Tile icon={FileText} title="Offene Angebote" desc="Übersicht aller nicht beauftragten Angebote." href="/app/angebote" />
        <Tile icon={Building2} title="Offene Rechnungsgrundlagen" desc="Was ist noch nicht abgerechnet?" href="/app/rechnungsgrundlagen" />
        <Placeholder icon={Send} title="Mahnwesen" text="Automatische 1./2./3. Mahnung mit Fristen." />
        <Placeholder icon={Landmark} title="DATEV-Export" text="Buchungssätze per Klick an die Steuerkanzlei." />
        <Placeholder icon={TrendingUp} title="GAEB-Import/Export" text="GAEB 90/2000/XML für Ausschreibungen." />
        <Placeholder icon={Archive} title="GoBD-Archivierung" text="Rechtssichere, unveränderbare Ablage." />
      </div>
    </div>
  ),
});

function Tile({ icon: Icon, title, desc, href }: any) {
  return (
    <Link to={href} className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-brand"><Icon className="h-5 w-5" /></div>
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
function Placeholder({ icon: Icon, title, text }: any) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon className="h-5 w-5" /></div>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">Bald</span>
      </div>
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
