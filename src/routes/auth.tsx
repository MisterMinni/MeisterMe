import { createFileRoute, redirect } from "@tanstack/react-router";

// TEMP: Login-Seite ist deaktiviert. Auto-Login läuft über src/routes/__root.tsx.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
