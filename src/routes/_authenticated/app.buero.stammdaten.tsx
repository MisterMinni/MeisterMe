import { createFileRoute } from "@tanstack/react-router";

import { CommercialCatalogPage } from "@/components/commercial/CommercialCatalogPage";

export const Route = createFileRoute("/_authenticated/app/buero/stammdaten")({
  head: () => ({ meta: [{ title: "Material & Leistungen – MeisterMe" }] }),
  component: CommercialCatalogPage,
});
