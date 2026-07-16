import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProjectChat } from "@/components/ProjectChat";
import { useSetPageHeader } from "@/components/page-header-context";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/baustellen/$id/")({
  head: () => ({ meta: [{ title: "Baustelle – MeisterMe" }] }),
  component: BaustelleDetail,
});

function BaustelleDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: site } = useQuery({
    queryKey: ["site", id],
    queryFn: async () => {
      const { data } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const openInfo = useCallback(() => {
    navigate({ to: "/app/baustellen/$id/info", params: { id } });
  }, [navigate, id]);

  useSetPageHeader({
    title: site?.adresse || site?.name || "Baustelle",
    backTo: "/app/baustellen",
    onTitleClick: openInfo,
  });

  if (!site) {
    return (
      <div>
        <Button asChild variant="outline" size="sm"><Link to="/app/baustellen"><ArrowLeft className="mr-1 h-4 w-4" /> Zurück</Link></Button>
        <p className="mt-6 text-muted-foreground">Baustelle wird geladen …</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-6">
      <ProjectChat projectId={id} />
    </div>
  );
}
