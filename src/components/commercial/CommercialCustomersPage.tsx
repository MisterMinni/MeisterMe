import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomersPanel } from "@/components/commercial/CustomersPanel";
import { PageHeader } from "@/components/PageHeader";
import { useSetPageHeader } from "@/components/page-header-context";
import { useHasPermission } from "@/lib/handwerk";
import { useCommercialOffice } from "@/lib/use-commercial-office";

export function CommercialCustomersPage() {
  useSetPageHeader({ title: "Kunden", backTo: "/app/buero" });
  const office = useCommercialOffice();
  const canWrite = useHasPermission("customers:write");

  if (office.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Kunden konnten nicht geladen werden</AlertTitle>
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
        aria-label="Kunden werden geladen"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kundenstamm"
        subtitle="Kontaktdaten, Kundenakte, Kommunikation und alle zugehörigen Baustellen an einem Ort."
      />
      <CustomersPanel
        data={office.data}
        tenantId={office.tenantId}
        userId={office.profile.id}
        canWrite={canWrite}
        onChanged={office.refreshCommercialOffice}
      />
    </div>
  );
}
