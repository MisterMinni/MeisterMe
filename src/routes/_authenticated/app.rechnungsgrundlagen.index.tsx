import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowRight } from "lucide-react";
import { formatEur, formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/rechnungsgrundlagen/")({
  head: () => ({ meta: [{ title: "Rechnungsgrundlagen – HandwerkPilot" }] }),
  component: () => {
    const { data } = useQuery({
      queryKey: ["invoice-drafts"],
      queryFn: async () => (await supabase.from("invoice_drafts").select("*, projects(name), customers(firma)").order("created_at", { ascending: false })).data ?? [],
    });
    return (
      <div>
        <PageHeader title="Rechnungsgrundlagen" subtitle="Aus Zeiten, Material und Angeboten. E-Rechnung/ZUGFeRD & DATEV bald verfügbar." />
        {!data || data.length === 0 ? (
          <EmptyState icon={Receipt} title="Keine Rechnungsgrundlagen" desc="Öffne ein Projekt und erstelle im Tab „Rechnung" eine Grundlage." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left"><tr><th className="p-3">Projekt</th><th className="p-3">Kunde</th><th className="p-3">Status</th><th className="p-3">Datum</th><th className="p-3 text-right">Brutto</th><th className="p-3" /></tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      <Link to={"/app/rechnungsgrundlagen/$id" as never} params={{ id: d.id } as never} className="hover:text-brand">{(d.projects as any)?.name ?? "—"}</Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{(d.customers as any)?.firma ?? "—"}</td>
                    <td className="p-3"><Badge variant="secondary">{d.status}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(d.created_at)}</td>
                    <td className="p-3 text-right font-semibold">{formatEur(d.brutto)}</td>
                    <td className="p-3 text-right"><Link to={"/app/rechnungsgrundlagen/$id" as never} params={{ id: d.id } as never} className="text-brand"><ArrowRight className="h-4 w-4" /></Link></td>
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
