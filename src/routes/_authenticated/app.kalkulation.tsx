import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus } from "lucide-react";
import { formatEur } from "@/lib/handwerk";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/kalkulation")({
  head: () => ({ meta: [{ title: "Kalkulation – MeisterMe" }] }),
  component: Kalk,
});

function Kalk() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string>("");
  const [f, setF] = useState({ material: 0, stunden: 0, stundensatz: 55, gk: 15, gewinn: 10 });
  const material = Number(f.material);
  const lohn = Number(f.stunden) * Number(f.stundensatz);
  const summe = material + lohn;
  const gk = summe * (Number(f.gk) / 100);
  const gewinn = (summe + gk) * (Number(f.gewinn) / 100);
  const vk = summe + gk + gewinn;
  const db = vk - summe;

  const { data: projekte } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => (await supabase.from("projects").select("id, name")).data ?? [],
  });
  const { data: calcs } = useQuery({
    queryKey: ["calculations"],
    queryFn: async () => (await supabase.from("calculations").select("*, projects(name)").order("created_at", { ascending: false })).data ?? [],
  });

  async function save() {
    if (!projectId) return toast.error("Projekt wählen");
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    await supabase.from("calculations").insert({
      tenant_id: p!.tenant_id as string, project_id: projectId,
      material_kosten: material, lohn_kosten: lohn, stundensatz: f.stundensatz,
      gk_zuschlag: f.gk, gewinn_zuschlag: f.gewinn, vk_preis: vk, deckungsbeitrag: db,
    });
    toast.success("Kalkulation gespeichert");
    qc.invalidateQueries({ queryKey: ["calculations"] });
  }

  return (
    <div>
      <PageHeader title="Kalkulation" subtitle="Deckungsbeitrag und Verkaufspreis in Sekunden. Soll/Ist-Vergleich bald verfügbar." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display font-semibold">Neue Kalkulation</h3>
          <div className="space-y-3">
            <div>
              <Label>Projekt</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-11"><SelectValue placeholder="wählen" /></SelectTrigger>
                <SelectContent>{projekte?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Materialkosten (€)</Label><Input type="number" step="0.01" value={f.material} onChange={(e) => setF({ ...f, material: Number(e.target.value) })} className="h-11" /></div>
              <div><Label>Stunden</Label><Input type="number" step="0.5" value={f.stunden} onChange={(e) => setF({ ...f, stunden: Number(e.target.value) })} className="h-11" /></div>
              <div><Label>Stundensatz (€)</Label><Input type="number" step="0.5" value={f.stundensatz} onChange={(e) => setF({ ...f, stundensatz: Number(e.target.value) })} className="h-11" /></div>
              <div><Label>GK-Zuschlag %</Label><Input type="number" step="0.5" value={f.gk} onChange={(e) => setF({ ...f, gk: Number(e.target.value) })} className="h-11" /></div>
              <div><Label>Gewinn %</Label><Input type="number" step="0.5" value={f.gewinn} onChange={(e) => setF({ ...f, gewinn: Number(e.target.value) })} className="h-11" /></div>
            </div>
            <Button onClick={save} className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Speichern</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-navy p-6 text-white shadow-lift">
          <h3 className="mb-4 font-display font-semibold">Ergebnis</h3>
          <dl className="space-y-2 text-sm">
            {[
              ["Material", material],
              ["Lohn", lohn],
              ["Gemeinkosten", gk],
              ["Gewinn", gewinn],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between border-b border-white/10 py-1"><dt className="text-white/70">{l}</dt><dd>{formatEur(Number(v))}</dd></div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl bg-brand p-4 text-brand-foreground">
            <div className="text-xs uppercase tracking-wider opacity-80">Verkaufspreis</div>
            <div className="font-display text-3xl font-bold">{formatEur(vk)}</div>
            <div className="mt-1 text-sm opacity-80">Deckungsbeitrag: {formatEur(db)}</div>
          </div>
        </div>
      </div>

      <h3 className="mt-8 mb-2 font-display text-lg font-semibold">Kalkulationen</h3>
      {!calcs || calcs.length === 0 ? (
        <EmptyState icon={Calculator} title="Noch keine Kalkulationen" desc="Speichere deine erste Kalkulation oben." />
      ) : (
        <ul className="space-y-2">
          {calcs.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <div className="font-medium">{(c.projects as any)?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Material {formatEur(c.material_kosten)} · Lohn {formatEur(c.lohn_kosten)}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold">{formatEur(c.vk_preis)}</div>
                <div className="text-xs text-muted-foreground">DB {formatEur(c.deckungsbeitrag)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
