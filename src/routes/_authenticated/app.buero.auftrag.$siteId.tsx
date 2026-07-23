import { createFileRoute } from "@tanstack/react-router";

import { SiteCommercialWorkspace } from "@/components/commercial/SiteCommercialWorkspace";

export const Route = createFileRoute("/_authenticated/app/buero/auftrag/$siteId")({
  head: () => ({ meta: [{ title: "Auftragsakte – MeisterMe" }] }),
  component: SiteCommercialRoute,
});

function SiteCommercialRoute() {
  const { siteId } = Route.useParams();
  return <SiteCommercialWorkspace siteId={siteId} />;
}
