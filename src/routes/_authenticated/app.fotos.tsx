import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/fotos")({
  head: () => ({ meta: [{ title: "Fotos – MeisterMe" }] }),
  component: () => {
    const { data } = useQuery({
      queryKey: ["all-photos"],
      queryFn: async () => (await supabase.from("photos").select("*, projects(name)").order("created_at", { ascending: false })).data ?? [],
    });
    return (
      <div>
        <PageHeader title="Baustellendokumentation" subtitle="Alle Fotos aller Projekte. Zum Hochladen ein Projekt öffnen." />
        {!data || data.length === 0 ? (
          <EmptyState icon={Camera} title="Noch keine Fotos" desc="Öffne ein Projekt und lade dort Vorher/Nachher-Fotos hoch." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((ph) => (
              <div key={ph.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                <img src={ph.url} alt="" className="aspect-square w-full object-cover" />
                <div className="absolute top-2 left-2"><Badge variant={ph.tag === "nachher" ? "default" : "secondary"} className={ph.tag === "nachher" ? "bg-brand text-brand-foreground" : ""}>{ph.tag}</Badge></div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
                  <div className="font-medium">{(ph.projects as any)?.name}</div>
                  <div className="opacity-70">{formatDate(ph.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
});
