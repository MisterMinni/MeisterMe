import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ArrowRight } from "lucide-react";
import { OFFER_STATUS, formatEur, formatDate } from "@/lib/handwerk";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/angebote/")({
  head: () => ({ meta: [{ title: "Angebote – MeisterMe" }] }),
  component: AngeboteList,
});

async function createOffer() {
  const { data: u } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
  const nr = `AN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const { data, error } = await supabase.from("offers").insert({
    tenant_id: p!.tenant_id as string, nummer: nr, status: "entwurf",
  }).select("id").single();
  if (error) return toast.error(error.message);
  window.location.href = `/app/angebote/${data.id}`;
}

function AngeboteList() {
  const { data: offers } = useQuery({
    queryKey: ["offers"],
    queryFn: async () => (await supabase.from("offers").select("*, customers(firma), projects(name)").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader
        title="Angebote"
        subtitle="Alle Angebote und Kalkulationen."
        action={<Button onClick={createOffer} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Neues Angebot</Button>}
      />
      {!offers || offers.length === 0 ? (
        <EmptyState icon={FileText} title="Keine Angebote" desc="Erstelle dein erstes Angebot – oder lass die KI aus einer Kundenanfrage einen Entwurf machen." action={<Button onClick={createOffer} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Angebot erstellen</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left"><tr>
              <th className="p-3">Nummer</th><th className="p-3">Kunde</th><th className="p-3">Projekt</th><th className="p-3">Status</th><th className="p-3">Datum</th><th className="p-3 text-right">Brutto</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-medium"><Link to={"/app/angebote/$id" as never} params={{ id: o.id } as never} className="hover:text-brand">{o.nummer}</Link></td>
                  <td className="p-3 text-muted-foreground">{(o.customers as any)?.firma ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{(o.projects as any)?.name ?? "—"}</td>
                  <td className="p-3"><Badge variant="secondary">{OFFER_STATUS.find((s) => s.value === o.status)?.label}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(o.created_at)}</td>
                  <td className="p-3 text-right font-semibold">{formatEur(o.brutto)}</td>
                  <td className="p-3 text-right"><Link to={"/app/angebote/$id" as never} params={{ id: o.id } as never} className="text-brand"><ArrowRight className="h-4 w-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
