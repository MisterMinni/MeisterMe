import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/dokumente")({
  head: () => ({ meta: [{ title: "Dokumente – MeisterMe" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Dokumente" subtitle="Pläne, Dateien und wichtige Infos." />
      <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
        <FileText className="mx-auto mb-3 h-10 w-10" />
        Dokumentenablage wird in Kürze verfügbar sein.
      </div>
    </div>
  ),
});
