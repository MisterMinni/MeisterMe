import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/kunden/")({
  head: () => ({ meta: [{ title: "Kunden – HandwerkPilot" }] }),
  component: KundenList,
});

function KundenList() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: kunden } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader
        title="Kunden"
        subtitle="Alle Kundendaten an einem Ort."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Neuer Kunde</Button>
            </DialogTrigger>
            <KundeForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["customers"] }); }} />
          </Dialog>
        }
      />
      {!kunden || kunden.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Noch keine Kunden"
          desc="Lege deinen ersten Kunden an, um Projekte, Angebote und Rechnungen zu verwalten."
          action={
            <Button onClick={() => setOpen(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="mr-1 h-4 w-4" /> Ersten Kunden anlegen
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kunden.map((k) => (
            <Link
              key={k.id}
              to={"/app/kunden/$id" as never}
              params={{ id: k.id } as never}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-brand font-display text-lg font-bold">
                  {(k.firma ?? k.ansprechpartner ?? "?").charAt(0).toUpperCase()}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand" />
              </div>
              <div className="font-semibold">{k.firma ?? k.ansprechpartner}</div>
              {k.ansprechpartner && k.firma && (
                <div className="text-xs text-muted-foreground">{k.ansprechpartner}</div>
              )}
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {k.telefon && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {k.telefon}</div>}
                {k.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {k.email}</div>}
                {(k.plz || k.ort) && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {k.plz} {k.ort}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function KundeForm({ onDone, initial }: { onDone: (id?: string) => void; initial?: any }) {
  const [f, setF] = useState({
    firma: initial?.firma ?? "",
    ansprechpartner: initial?.ansprechpartner ?? "",
    adresse: initial?.adresse ?? "",
    plz: initial?.plz ?? "",
    ort: initial?.ort ?? "",
    telefon: initial?.telefon ?? "",
    email: initial?.email ?? "",
    notizen: initial?.notizen ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
      const payload = { ...f, tenant_id: p!.tenant_id as string };
      if (initial?.id) {
        const { error } = await supabase.from("customers").update(payload).eq("id", initial.id);
        if (error) throw error;
        return initial.id;
      } else {
        const { data, error } = await supabase.from("customers").insert(payload).select("id").single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: (id) => { toast.success("Kunde gespeichert"); onDone(id); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{initial ? "Kunde bearbeiten" : "Neuer Kunde"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <div><Label>Firma</Label><Input value={f.firma} onChange={(e) => setF({ ...f, firma: e.target.value })} /></div>
        <div><Label>Ansprechpartner</Label><Input value={f.ansprechpartner} onChange={(e) => setF({ ...f, ansprechpartner: e.target.value })} /></div>
        <div><Label>Adresse</Label><Input value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>PLZ</Label><Input value={f.plz} onChange={(e) => setF({ ...f, plz: e.target.value })} /></div>
          <div className="col-span-2"><Label>Ort</Label><Input value={f.ort} onChange={(e) => setF({ ...f, ort: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Telefon</Label><Input value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} /></div>
          <div><Label>E-Mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div><Label>Notizen</Label><Textarea value={f.notizen} onChange={(e) => setF({ ...f, notizen: e.target.value })} rows={3} /></div>
        <Button type="submit" disabled={save.isPending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          {save.isPending ? "Speichere…" : "Speichern"}
        </Button>
      </form>
    </DialogContent>
  );
}
