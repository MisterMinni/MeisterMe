import { createFileRoute } from "@tanstack/react-router";

import { CustomerWorkspace } from "@/components/commercial/CustomerWorkspace";
import { useSetPageHeader } from "@/components/page-header-context";

export const Route = createFileRoute("/_authenticated/app/kunden/$customerId")({
  head: () => ({ meta: [{ title: "Kunden-Work-Segment – MeisterMe" }] }),
  component: CustomerWorkspaceRoute,
});

function CustomerWorkspaceRoute() {
  const { customerId } = Route.useParams();
  useSetPageHeader({ title: "Kunden-Work-Segment", backTo: "/app/buero/kunden" });
  return <CustomerWorkspace customerId={customerId} />;
}
