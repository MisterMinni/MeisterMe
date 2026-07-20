import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { hasPendingTeamInvitation } from "@/lib/invitations";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    if (await hasPendingTeamInvitation(data.session.user.id)) {
      throw redirect({ to: "/accept-invite" });
    }
    throw redirect({ to: "/app" });
  },
  component: () => null,
});
