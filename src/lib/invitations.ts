import { supabase } from "@/integrations/supabase/client";

export async function hasPendingTeamInvitation(userId: string) {
  const { data, error } = await supabase
    .from("employee_invitations")
    .select("id")
    .eq("auth_user_id", userId)
    .in("status", ["pending", "sent"])
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}
