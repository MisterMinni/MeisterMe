import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// TEMP: Login-Seite ist deaktiviert. Auto-Login als Dev-Nutzer.
export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { error } = await supabase.auth.signInWithPassword({
        email: "bastiskiller2@gmail.com",
        password: "bababasti1!",
      });
      if (error) {
        console.error("[dev auto-login]", error.message);
        return;
      }
    }
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
