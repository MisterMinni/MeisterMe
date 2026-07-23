import { createFileRoute } from "@tanstack/react-router";

import { CommercialCustomersPage } from "@/components/commercial/CommercialCustomersPage";

export const Route = createFileRoute("/_authenticated/app/buero/kunden")({
  head: () => ({ meta: [{ title: "Kunden – MeisterMe" }] }),
  component: CommercialCustomersPage,
});
