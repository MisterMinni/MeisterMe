import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/materialien")({
  head: () => ({ meta: [{ title: "Materialien – MeisterMe" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Materialien" subtitle="Bestände, Anfragen & Lieferungen." />
      <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
        <Package className="mx-auto mb-3 h-10 w-10" />
        Materialverwaltung wird in Kürze verfügbar sein.
      </div>
    </div>
  ),
});
