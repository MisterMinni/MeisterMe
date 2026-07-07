import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/angebote/neu")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const nr = `AN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data, error } = await supabase.from("offers").insert({
      tenant_id: p!.tenant_id as string, nummer: nr, status: "entwurf",
    }).select("id").single();
    if (error) { toast.error(error.message); throw redirect({ to: "/app/angebote" }); }
    throw redirect({ to: "/app/angebote/$id", params: { id: data.id } });
  },
});
