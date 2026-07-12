import { createFileRoute, redirect } from "@tanstack/react-router";

// TEMP: Landing-Page & Login sind deaktiviert. Alle Aufrufe von "/" gehen
// direkt in die App; Auto-Login übernimmt src/routes/__root.tsx.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
