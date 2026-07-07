import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/kunden/neu")({
  beforeLoad: () => { throw redirect({ to: "/app/kunden" }); },
});
