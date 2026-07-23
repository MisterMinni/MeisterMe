import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";

import { LegalPageLayout } from "@/components/LegalPageLayout";
import { legalConfig } from "@/config/legal";

export const Route = createFileRoute("/kontakt")({
  head: () => ({ meta: [{ title: "Kontakt – MeisterMe" }] }),
  component: () => (
    <LegalPageLayout title="Kontakt" subtitle="Wir freuen uns auf deine Nachricht." eyebrow="MeisterMe">
      <div className="space-y-4">
        <a href={`mailto:${legalConfig.email}`} className="flex items-center gap-3 rounded-xl border border-border p-4 font-medium hover:bg-secondary/60"><Mail className="h-5 w-5 text-brand" /> {legalConfig.email}</a>
        {legalConfig.phone && <a href={`tel:${legalConfig.phone}`} className="flex items-center gap-3 rounded-xl border border-border p-4 font-medium hover:bg-secondary/60"><Phone className="h-5 w-5 text-brand" /> {legalConfig.phone}</a>}
        {!legalConfig.phone && <p className="text-sm text-muted-foreground">Aktuell erreichst du uns am schnellsten per E-Mail.</p>}
      </div>
    </LegalPageLayout>
  ),
});
