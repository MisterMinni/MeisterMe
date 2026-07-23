import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CommercialOverview } from "@/components/commercial/CommercialOverview";
import { useCommercialOffice } from "@/lib/use-commercial-office";

export function CommercialOffice() {
  const office = useCommercialOffice();

  if (office.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Auftragsbüro konnte nicht geladen werden</AlertTitle>
        <AlertDescription>
          {office.error instanceof Error
            ? office.error.message
            : "Bitte versuche es erneut oder prüfe deine Berechtigungen."}
        </AlertDescription>
      </Alert>
    );
  }

  if (office.isLoading || !office.data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Auftragsbüro wird geladen">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return <CommercialOverview data={office.data} />;
}
