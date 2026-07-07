import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { KundeForm } from "./app.kunden.index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Mail, MapPin, Pencil, Trash2, Briefcase, FileText, Receipt, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatEur } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/kunden/$id")({
  head: () => ({ meta: [{ title: "Kunde – MeisterMe" }] }),
  component: KundeDetail,
});

function KundeDetail() {
  const { id } = useParams({ from: "/_authenticated/app/kunden/$id" });
  const nav = useNavigate();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const { data: k } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });
  const { data: projects } = useQuery({
    queryKey: ["customer-projects", id],
    queryFn: async () => (await supabase.from("projects").select("id, name, status, gewerk").eq("customer_id", id)).data ?? [],
  });
  const { data: offers } = useQuery({
    queryKey: ["customer-offers", id],
    queryFn: async () => (await supabase.from("offers").select("id, nummer, status, brutto").eq("customer_id", id)).data ?? [],
  });

  async function del() {
    if (!confirm("Kunde wirklich löschen?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht");
    nav({ to: "/app/kunden" });
  }

  if (!k) return <div className="text-muted-foreground">Lade…</div>;

  return (
    <div>
      <Link to="/app/kunden" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader
        title={k.firma ?? k.ansprechpartner ?? "Kunde"}
        subtitle={k.firma && k.ansprechpartner ? k.ansprechpartner : undefined}
        action={
          <>
            <Dialog open={edit} onOpenChange={setEdit}>
              <DialogTrigger asChild><Button variant="outline"><Pencil className="mr-1 h-4 w-4" /> Bearbeiten</Button></DialogTrigger>
              <KundeForm initial={k} onDone={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["customer", id] }); }} />
            </Dialog>
            <Button variant="outline" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display font-semibold">Kontakt</h3>
          <div className="space-y-2 text-sm">
            {k.telefon && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand" /> {k.telefon}</div>}
            {k.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /> {k.email}</div>}
            {(k.adresse || k.ort) && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-brand mt-0.5" /><div>{k.adresse}<br />{k.plz} {k.ort}</div></div>}
          </div>
          {k.notizen && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Notizen</div>
              <p className="text-sm whitespace-pre-wrap">{k.notizen}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-brand" /> Projekte</h3>
            <Button asChild size="sm" variant="outline"><Link to="/app/projekte/neu" search={{ customer: id } as never}>+ Projekt</Link></Button>
          </div>
          {projects && projects.length > 0 ? (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}><Link to={"/app/projekte/$id" as never} params={{ id: p.id } as never} className="block rounded-lg border border-border p-2 text-sm hover:border-brand">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.status} · {p.gewerk}</div>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Keine Projekte.</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /> Angebote</h3>
          {offers && offers.length > 0 ? (
            <ul className="space-y-2">
              {offers.map((o) => (
                <li key={o.id}><Link to={"/app/angebote/$id" as never} params={{ id: o.id } as never} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm hover:border-brand">
                  <div><div className="font-medium">{o.nummer}</div><div className="text-xs text-muted-foreground">{o.status}</div></div>
                  <div className="font-semibold">{formatEur(o.brutto)}</div>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Keine Angebote.</p>}
        </div>
      </div>
    </div>
  );
}
