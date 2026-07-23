import { createFileRoute } from "@tanstack/react-router";

import { CommercialOffice } from "@/components/commercial/CommercialOffice";

export const Route = createFileRoute("/_authenticated/app/buero")({
  head: () => ({ meta: [{ title: "Büro & Finanzen – MeisterMe" }] }),
  component: CommercialOffice,
});

