import { CircleAlert, Euro, FileCheck2, FileText } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { InvoicesPanel } from "@/components/commercial/InvoicesPanel";
import { OffersPanel } from "@/components/commercial/OffersPanel";
import { PageHeader } from "@/components/PageHeader";
import { useSetPageHeader } from "@/components/page-header-context";
import { formatEur, useHasPermission } from "@/lib/handwerk";
import { useCommercialOffice } from "@/lib/use-commercial-office";

export function CommercialDocumentsPage() {
  useSetPageHeader({ title: "Angebote & Rechnungen", backTo: "/app/buero" });
  const office = useCommercialOffice();
  const canWriteOffers = useHasPermission("offers:write");
  const canWriteInvoices = useHasPermission("invoices:write");

  if (office.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Belege konnten nicht geladen werden</AlertTitle>
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
        aria-label="Belege werden geladen"
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const openOffers = office.data.offers.filter(
    (offer) => !["accepted", "rejected", "expired"].includes(offer.status),
  );
  const openInvoices = office.data.invoices.filter(
    (invoice) => !["paid", "cancelled"].includes(invoice.status),
  );
  const overdueInvoices = openInvoices.filter(
    (invoice) => invoice.due_date && invoice.due_date < today,
  );
  const outstanding = openInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.gross_amount) - Number(invoice.paid_amount)),
    0,
  );
  const shared = {
    data: office.data,
    tenantId: office.tenantId,
    userId: office.profile.id,
    onChanged: office.refreshCommercialOffice,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Angebote & Rechnungen"
        subtitle="Belege betriebsweit finden und bearbeiten. Im Auftragsbüro bleiben sie zusätzlich direkt ihrer Baustelle zugeordnet."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DocumentMetric icon={FileText} label="Offene Angebote" value={String(openOffers.length)} />
        <DocumentMetric
          icon={FileCheck2}
          label="Offene Rechnungen"
          value={String(openInvoices.length)}
        />
        <DocumentMetric icon={Euro} label="Offene Forderungen" value={formatEur(outstanding)} />
        <DocumentMetric
          icon={CircleAlert}
          label="Überfällig"
          value={String(overdueInvoices.length)}
          warning={overdueInvoices.length > 0}
        />
      </div>

      <OffersPanel {...shared} canWrite={canWriteOffers} />
      <InvoicesPanel {...shared} canWrite={canWriteInvoices} />
    </div>
  );
}

function DocumentMetric({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <Card className={warning ? "border-amber-300 bg-amber-50/60" : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${warning ? "bg-amber-100 text-amber-700" : "bg-brand/10 text-brand"}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
