import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/aufgaben")({
  head: () => ({ meta: [{ title: "Aufgaben – MeisterMe" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Aufgaben" subtitle="To-dos, Termine und Erinnerungen." />
      <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center text-muted-foreground">
        <ListChecks className="mx-auto mb-3 h-10 w-10" />
        Aufgabenverwaltung wird in Kürze verfügbar sein.
      </div>
    </div>
  ),
});
