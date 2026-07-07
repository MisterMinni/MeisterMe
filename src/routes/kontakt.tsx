import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/kontakt")({
  head: () => ({ meta: [{ title: "Kontakt – MeisterMe" }] }),
  component: () => (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <PageHeader title="Kontakt" subtitle="Wir freuen uns auf deine Nachricht." />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-brand" /> hallo@meisterme.de</div>
        <div className="mt-2 flex items-center gap-3"><Phone className="h-5 w-5 text-brand" /> +49 (0)30 12345678</div>
      </div>
    </div>
  ),
});
