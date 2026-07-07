import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GEWERKE, PROJECT_STATUS } from "@/lib/handwerk";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const search = z.object({ customer: z.string().optional() });

export const Route = createFileRoute("/_authenticated/app/projekte/neu")({
  head: () => ({ meta: [{ title: "Neues Projekt – MeisterMe" }] }),
  validateSearch: (s) => search.parse(s),
  component: NeuesProjekt,
});

function NeuesProjekt() {
  const { customer } = useSearch({ from: "/_authenticated/app/projekte/neu" });
  const nav = useNavigate();
  const [f, setF] = useState({
    name: "",
    customer_id: customer ?? "",
    gewerk: "stuckateur",
    status: "anfrage",
    adresse: "",
    beschreibung: "",
    budget: "",
    start_datum: "",
    end_datum: "",
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => (await supabase.from("customers").select("id, firma, ansprechpartner").order("firma")).data ?? [],
  });
  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
      const { data, error } = await supabase.from("projects").insert({
        tenant_id: p!.tenant_id as string,
        name: f.name,
        customer_id: f.customer_id || null,
        gewerk: f.gewerk as any,
        status: f.status as any,
        adresse: f.adresse || null,
        beschreibung: f.beschreibung || null,
        budget: f.budget ? Number(f.budget) : null,
        start_datum: f.start_datum || null,
        end_datum: f.end_datum || null,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => { toast.success("Projekt angelegt"); nav({ to: "/app/projekte/$id", params: { id } }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/app/projekte" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader title="Neues Projekt" subtitle="Lege eine neue Baustelle an." />
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div><Label>Projektname *</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-11" /></div>
        <div>
          <Label>Kunde</Label>
          <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v })}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Kunde wählen" /></SelectTrigger>
            <SelectContent>
              {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.firma ?? c.ansprechpartner}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Gewerk</Label>
            <Select value={f.gewerk} onValueChange={(v) => setF({ ...f, gewerk: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{GEWERKE.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{PROJECT_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Baustellenadresse</Label><Input value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} className="h-11" /></div>
        <div><Label>Beschreibung</Label><Textarea value={f.beschreibung} onChange={(e) => setF({ ...f, beschreibung: e.target.value })} rows={4} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Budget (€)</Label><Input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} className="h-11" /></div>
          <div><Label>Start</Label><Input type="date" value={f.start_datum} onChange={(e) => setF({ ...f, start_datum: e.target.value })} className="h-11" /></div>
          <div><Label>Ende</Label><Input type="date" value={f.end_datum} onChange={(e) => setF({ ...f, end_datum: e.target.value })} className="h-11" /></div>
        </div>
        <Button type="submit" disabled={save.isPending || !f.name} className="h-12 w-full bg-brand text-brand-foreground text-base font-semibold hover:bg-brand/90">
          {save.isPending ? "Speichere…" : "Projekt anlegen"}
        </Button>
      </form>
    </div>
  );
}
