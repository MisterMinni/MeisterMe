import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/berichte/")({
  head: () => ({ meta: [{ title: "Einsatzberichte – HandwerkPilot" }] }),
  component: () => {
    const { data: reports } = useQuery({
      queryKey: ["reports-list"],
      queryFn: async () => (await supabase.from("field_reports").select("*, projects(name)").order("datum", { ascending: false })).data ?? [],
    });
    return (
      <div>
        <PageHeader title="Einsatzberichte" subtitle="Alle Baustellenberichte." action={<Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link to="/app/berichte/neu"><Plus className="mr-1 h-4 w-4" /> Neuer Bericht</Link></Button>} />
        {!reports || reports.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Keine Berichte" desc="Auf der Baustelle Bericht schreiben – per Text oder KI-Sprachbericht." action={<Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link to="/app/berichte/neu"><Plus className="mr-1 h-4 w-4" /> Bericht anlegen</Link></Button>} />
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id}>
                <Link to={"/app/berichte/$id" as never} params={{ id: r.id } as never} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card hover:border-brand">
                  <div>
                    <div className="flex items-center gap-2"><span className="font-medium">{formatDate(r.datum)}</span><Badge variant="secondary">{r.status}</Badge></div>
                    <div className="text-sm text-muted-foreground">{(r.projects as any)?.name ?? "—"}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.taetigkeit || r.sprachnotiz}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
});
