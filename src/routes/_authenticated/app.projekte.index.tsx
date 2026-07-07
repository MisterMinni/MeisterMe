import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, ArrowRight } from "lucide-react";
import { PROJECT_STATUS, GEWERKE, formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/projekte/")({
  head: () => ({ meta: [{ title: "Projekte – HandwerkPilot" }] }),
  component: ProjekteList,
});

const statusLabel = (v: string) => PROJECT_STATUS.find((s) => s.value === v)?.label ?? v;
const gewerkLabel = (v: string) => GEWERKE.find((g) => g.value === v)?.label ?? v;

function ProjekteList() {
  const { data: projekte } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => (await supabase
      .from("projects")
      .select("*, customers(firma, ansprechpartner)")
      .order("updated_at", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <PageHeader
        title="Projekte & Baustellen"
        subtitle="Alle Projekte im Überblick."
        action={<Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link to="/app/projekte/neu"><Plus className="mr-1 h-4 w-4" /> Neues Projekt</Link></Button>}
      />
      {!projekte || projekte.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Noch keine Projekte"
          desc="Lege dein erstes Projekt an – von Anfrage bis Rechnungsstellung."
          action={<Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link to="/app/projekte/neu"><Plus className="mr-1 h-4 w-4" /> Projekt anlegen</Link></Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3 font-semibold">Projekt</th>
                <th className="p-3 font-semibold">Kunde</th>
                <th className="p-3 font-semibold">Gewerk</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Aktualisiert</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {projekte.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-medium">
                    <Link to={"/app/projekte/$id" as never} params={{ id: p.id } as never} className="hover:text-brand">{p.name}</Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{(p.customers as any)?.firma ?? (p.customers as any)?.ansprechpartner ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{gewerkLabel(p.gewerk as string)}</td>
                  <td className="p-3"><Badge variant="secondary">{statusLabel(p.status as string)}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(p.updated_at)}</td>
                  <td className="p-3 text-right">
                    <Link to={"/app/projekte/$id" as never} params={{ id: p.id } as never} className="text-brand"><ArrowRight className="h-4 w-4" /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
