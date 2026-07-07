import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatEur } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/rechnungsgrundlagen/$id")({
  head: () => ({ meta: [{ title: "Rechnungsgrundlage – HandwerkPilot" }] }),
  component: Detail,
});

type Pos = { text: string; menge: number; einheit: string; ep: number; gp: number };

function Detail() {
  const { id } = useParams({ from: "/_authenticated/app/rechnungsgrundlagen/$id" });
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: d } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await supabase.from("invoice_drafts").select("*, projects(name), customers(firma)").eq("id", id).maybeSingle()).data,
  });
  const [pos, setPos] = useState<Pos[]>([]);
  const [mwst, setMwst] = useState(19);
  useEffect(() => { if (d) { setPos((d.positionen as any) ?? []); setMwst(Number(d.mwst_satz ?? 19)); } }, [d]);

  const netto = pos.reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.ep) || 0), 0);
  const brutto = netto * (1 + mwst / 100);

  async function save() {
    const positionen = pos.map((p) => ({ ...p, gp: (Number(p.menge) || 0) * (Number(p.ep) || 0) }));
    const { error } = await supabase.from("invoice_drafts").update({ positionen: positionen as any, netto, brutto, mwst_satz: mwst }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gespeichert");
    qc.invalidateQueries({ queryKey: ["invoice", id] });
  }
  async function del() {
    if (!confirm("Löschen?")) return;
    await supabase.from("invoice_drafts").delete().eq("id", id);
    nav({ to: "/app/rechnungsgrundlagen" });
  }

  if (!d) return <div className="text-muted-foreground">Lade…</div>;
  return (
    <div>
      <Link to="/app/rechnungsgrundlagen" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
      <PageHeader title="Rechnungsgrundlage" subtitle={`${(d.projects as any)?.name ?? "—"} · ${(d.customers as any)?.firma ?? "—"}`}
        action={<>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> PDF/Druck</Button>
          <Button variant="outline" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">Speichern</Button>
        </>}
      />
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-semibold">Positionen</h3>
          <Button size="sm" variant="outline" onClick={() => setPos((p) => [...p, { text: "", menge: 1, einheit: "Stk", ep: 0, gp: 0 }])}><Plus className="mr-1 h-4 w-4" /> Position</Button>
        </div>
        <div className="space-y-2">
          {pos.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-border p-2">
              <Input className="col-span-5" placeholder="Beschreibung" value={p.text} onChange={(e) => setPos((prev) => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))} />
              <Input className="col-span-1" type="number" step="0.01" value={p.menge} onChange={(e) => setPos((prev) => prev.map((x, idx) => idx === i ? { ...x, menge: Number(e.target.value) } : x))} />
              <Input className="col-span-1" value={p.einheit} onChange={(e) => setPos((prev) => prev.map((x, idx) => idx === i ? { ...x, einheit: e.target.value } : x))} />
              <Input className="col-span-2" type="number" step="0.01" value={p.ep} onChange={(e) => setPos((prev) => prev.map((x, idx) => idx === i ? { ...x, ep: Number(e.target.value) } : x))} />
              <div className="col-span-2 flex items-center justify-end pr-2 font-semibold">{formatEur((Number(p.menge) || 0) * (Number(p.ep) || 0))}</div>
              <button onClick={() => setPos((prev) => prev.filter((_, idx) => idx !== i))} className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-right text-sm">
          <div>Netto: <span className="font-semibold">{formatEur(netto)}</span></div>
          <div>MwSt <input type="number" value={mwst} onChange={(e) => setMwst(Number(e.target.value))} className="ml-1 inline w-14 border-b border-border bg-transparent text-right" />%: <span>{formatEur(brutto - netto)}</span></div>
          <div className="font-display text-lg font-bold">Brutto: {formatEur(brutto)}</div>
        </div>
      </div>
    </div>
  );
}
