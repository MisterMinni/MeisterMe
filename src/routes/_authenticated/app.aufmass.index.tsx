import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Ruler, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/aufmass/")({
  head: () => ({ meta: [{ title: "Aufmaß – HandwerkPilot" }] }),
  component: () => {
    const { data } = useQuery({
      queryKey: ["all-measurements"],
      queryFn: async () => (await supabase.from("measurements").select("*, projects(id, name)").order("created_at", { ascending: false })).data ?? [],
    });
    return (
      <div>
        <PageHeader title="Aufmaß" subtitle="Alle Räume und Flächen aus allen Projekten. Zum Bearbeiten das jeweilige Projekt öffnen." />
        {!data || data.length === 0 ? (
          <EmptyState icon={Ruler} title="Noch keine Aufmaße" desc="Öffne ein Projekt und lege dort im Tab Aufmaß die Räume an." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left"><tr><th className="p-3">Projekt</th><th className="p-3">Bereich</th><th className="p-3">Wand m²</th><th className="p-3">Decke m²</th><th className="p-3">Umfang</th><th className="p-3" /></tr></thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3 font-medium">{(m.projects as any)?.name}</td>
                    <td className="p-3">{m.bereich}</td>
                    <td className="p-3">{Number(m.wandflaeche ?? 0).toFixed(2)}</td>
                    <td className="p-3">{Number(m.deckenflaeche ?? 0).toFixed(2)}</td>
                    <td className="p-3">{Number(m.umfang ?? 0).toFixed(2)} m</td>
                    <td className="p-3 text-right"><Link to={"/app/projekte/$id" as never} params={{ id: (m.projects as any)?.id } as never}><ArrowRight className="h-4 w-4 text-brand" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  },
});
