import { createFileRoute } from "@tanstack/react-router";

import { CommercialDocumentsPage } from "@/components/commercial/CommercialDocumentsPage";

export const Route = createFileRoute("/_authenticated/app/buero/belege")({
  head: () => ({ meta: [{ title: "Angebote & Rechnungen – MeisterMe" }] }),
  component: CommercialDocumentsPage,
});
