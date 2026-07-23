import { Boxes, Calculator, DatabaseZap, Warehouse } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialsPanel } from "@/components/commercial/MaterialsPanel";
import { PageHeader } from "@/components/PageHeader";
import { useSetPageHeader } from "@/components/page-header-context";
import { useHasPermission } from "@/lib/handwerk";
import { useCommercialOffice } from "@/lib/use-commercial-office";

export function CommercialCatalogPage() {
  useSetPageHeader({ title: "Material & Leistungen", backTo: "/app/buero" });
  const office = useCommercialOffice();
  const canWrite = useHasPermission("materials:write");

  if (office.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Materialstamm konnte nicht geladen werden</AlertTitle>
        <AlertDescription>
          {office.error instanceof Error ? office.error.message : "Bitte versuche es erneut."}
        </AlertDescription>
      </Alert>
    );
  }

  if (office.isLoading || !office.data || !office.profile || !office.tenantId) {
    return (
      <div
        className="h-80 animate-pulse rounded-2xl bg-slate-100"
        aria-label="Material wird geladen"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material & Leistungen"
        subtitle="Betriebliche Stammdaten werden einmal gepflegt; geplanter und tatsächlicher Verbrauch gehört anschließend direkt zur Baustelle."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <ScopeCard
          icon={Boxes}
          title="Material- & Leistungskatalog"
          description="Artikel, Einheiten, EK/VK, Verschnitt, Lieferanten und wiederverwendbare Leistungsbausteine."
          status="Jetzt verfügbar"
        />
        <ScopeCard
          icon={Warehouse}
          title="Lager & Beschaffung"
          description="Bestände, Mindestmengen, Bestellungen und Entnahmen werden als eigener betrieblicher Ablauf ergänzt."
          status="Nächste Ausbaustufe"
        />
        <ScopeCard
          icon={Calculator}
          title="Baustellenverbrauch"
          description="Sollmengen aus der Vorkalkulation und Ist-Verbrauch gehören in die jeweilige Auftragsakte."
          status="Im Auftrag verortet"
        />
      </div>

      <MaterialsPanel
        data={office.data}
        tenantId={office.tenantId}
        userId={office.profile.id}
        canWrite={canWrite}
        onChanged={office.refreshCommercialOffice}
      />

      <Card className="border-dashed">
        <CardHeader className="sm:flex-row sm:items-start sm:gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-brand">
            <DatabaseZap className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">
              DATEV gehört zur Finanzübergabe, nicht ins Lager
            </CardTitle>
            <CardDescription className="mt-1 leading-5">
              Die spätere DATEV-Anbindung exportiert Rechnungen, Zahlungen, Eingangsbelege und
              Kontierungen. Materialbewegungen bleiben im Lager und fließen über ihre Kosten in die
              Baustellen-Nachkalkulation ein.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          So bleibt die Bedienung fachlich sauber: Artikelstamm und Lager betriebsweit, Verbrauch
          und Kosten auftragsbezogen, Buchhaltung über Belege und Konten.
        </CardContent>
      </Card>
    </div>
  );
}

function ScopeCard({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: typeof Boxes;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-4 font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        <p className="mt-3 text-xs font-semibold text-brand">{status}</p>
      </CardContent>
    </Card>
  );
}
