import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasPendingTeamInvitation } from "@/lib/invitations";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (await hasPendingTeamInvitation(data.user.id)) {
      throw redirect({ to: "/accept-invite" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, disabled_at")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile?.tenant_id || profile.disabled_at) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("status, disabled_at")
      .eq("tenant_id", profile.tenant_id)
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (membership?.status !== "active" || membership.disabled_at) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
