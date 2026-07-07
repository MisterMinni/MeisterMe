import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OFFER_STATUS, formatEur, GEWERKE } from "@/lib/handwerk";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Sparkles, Printer } from "lucide-react";
import { prepareOfferFromRequest, generateCustomerEmail } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/angebote/$id")({
  head: () => ({ meta: [{ title: "Angebot – HandwerkPilot" }] }),
  component: AngebotDetail,
});

type Position = { text: string; menge: number; einheit: string; ep: number; gp: number };

function AngebotDetail() {
  const { id } = useParams({ from: "/_authenticated/app/angebote/$id" });
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: o } = useQuery({
    queryKey: ["offer", id],
    queryFn: async () => (await supabase.from("offers").select("*, customers(id, firma, ansprechpartner, email), projects(id, name, gewerk)").eq("id", id).maybeSingle()).data,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => (await supabase.from("customers").select("id, firma, ansprechpartner")).data ?? [],
  });

  const [positionen, setPositionen] = useState<Position[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("entwurf");
  const [mwst, setMwst] = useState(19);
  const [rabatt, setRabatt] = useState(0);

  useEffect(() => {
    if (o) {
      setPositionen((o.positionen as unknown as Position[]) ?? []);
      setCustomerId(o.customer_id ?? null);
      setStatus(o.status as string);
      setMwst(Number(o.mwst_satz ?? 19));
      setRabatt(Number(o.rabatt ?? 0));
    }
  }, [o]);

  const netto = positionen.reduce((s, p) => s + (Number(p.menge) || 0) * (Number(p.ep) || 0), 0);
  const rabattBetrag = netto * (rabatt / 100);
  const nettoNachRabatt = netto - rabattBetrag;
  const brutto = nettoNachRabatt * (1 + mwst / 100);

  async function save() {
    const pos = positionen.map((p) => ({ ...p, gp: (Number(p.menge) || 0) * (Number(p.ep) || 0) }));
    const { error } = await supabase.from("offers").update({
      positionen: pos as any, customer_id: customerId, status: status as any,
      mwst_satz: mwst, rabatt, netto: nettoNachRabatt, brutto,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Angebot gespeichert");
    qc.invalidateQueries({ queryKey: ["offer", id] });
  }
  async function del() {
    if (!confirm("Angebot löschen?")) return;
    await supabase.from("offers").delete().eq("id", id);
    nav({ to: "/app/angebote" });
  }
  function updatePos(i: number, patch: Partial<Position>) {
    setPositionen((prev) => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  }
  function addPos() { setPositionen((prev) => [...prev, { text: "", menge: 1, einheit: "Stk", ep: 0, gp: 0 }]); }
  function delPos(i: number) { setPositionen((prev) => prev.filter((_, idx) => idx !== i)); }

  if (!o) return <div className="text-muted-foreground">Lade…</div>;

  return (
    <div>
      <Link to="/app/angebote" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader
        title={`Angebot ${o.nummer}`}
        subtitle={(o.projects as any)?.name}
        action={
          <>
            <AiHelper gewerk={GEWERKE.find((g) => g.value === (o.projects as any)?.gewerk)?.label ?? "Ausbau"} onPositions={(pos) => setPositionen((prev) => [...prev, ...pos.map((p) => ({ ...p, gp: p.menge * p.ep }))])} />
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> PDF</Button>
            <Button variant="outline" onClick={del}><Trash2 className="h-4 w-4" /></Button>
            <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">Speichern</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display font-semibold">Kopfdaten</h3>
          <div className="space-y-3">
            <div>
              <Label>Kunde</Label>
              <Select value={customerId ?? ""} onValueChange={(v) => setCustomerId(v)}>
                <SelectTrigger><SelectValue placeholder="wählen" /></SelectTrigger>
                <SelectContent>{customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.firma ?? c.ansprechpartner}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OFFER_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>MwSt %</Label><Input type="number" value={mwst} onChange={(e) => setMwst(Number(e.target.value))} /></div>
              <div><Label>Rabatt %</Label><Input type="number" value={rabatt} onChange={(e) => setRabatt(Number(e.target.value))} /></div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold">Positionen</h3>
            <Button size="sm" variant="outline" onClick={addPos}><Plus className="mr-1 h-4 w-4" /> Position</Button>
          </div>
          {positionen.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Noch keine Positionen. „+ Position" oder KI-Vorbereitung nutzen.</div>
          ) : (
            <div className="space-y-2">
              {positionen.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-border p-2">
                  <Input className="col-span-5" placeholder="Beschreibung" value={p.text} onChange={(e) => updatePos(i, { text: e.target.value })} />
                  <Input className="col-span-1" type="number" step="0.01" value={p.menge} onChange={(e) => updatePos(i, { menge: Number(e.target.value) })} />
                  <Input className="col-span-1" value={p.einheit} onChange={(e) => updatePos(i, { einheit: e.target.value })} />
                  <Input className="col-span-2" type="number" step="0.01" value={p.ep} onChange={(e) => updatePos(i, { ep: Number(e.target.value) })} />
                  <div className="col-span-2 flex items-center justify-end pr-2 font-semibold">{formatEur((Number(p.menge) || 0) * (Number(p.ep) || 0))}</div>
                  <button onClick={() => delPos(i)} className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-1 border-t border-border pt-3 text-right text-sm">
            <div>Netto: <span className="font-semibold">{formatEur(netto)}</span></div>
            {rabatt > 0 && <div>Rabatt {rabatt}%: <span>-{formatEur(rabattBetrag)}</span></div>}
            <div>MwSt {mwst}%: <span>{formatEur(brutto - nettoNachRabatt)}</span></div>
            <div className="font-display text-lg font-bold">Brutto: {formatEur(brutto)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiHelper({ gewerk, onPositions }: { gewerk: string; onPositions: (p: Position[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const prep = useServerFn(prepareOfferFromRequest);
  async function run() {
    setLoading(true);
    try {
      const res = await prep({ data: { anfrage: text, gewerk } });
      onPositions(res.positionen.map((p) => ({ text: p.text, menge: p.menge ?? 1, einheit: p.einheit ?? "Stk", ep: p.ep ?? 0, gp: (p.menge ?? 1) * (p.ep ?? 0) })));
      toast.success(`${res.positionen.length} Positionen vorbereitet`);
      setOpen(false);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="border-brand text-brand hover:bg-brand hover:text-brand-foreground"><Sparkles className="mr-1 h-4 w-4" /> KI: Aus Anfrage</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Angebot aus Kundenanfrage vorbereiten</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Füge hier die Kundenanfrage ein – die KI erstellt daraus einen Angebotsentwurf.</p>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Wir möchten unser 25 m² Wohnzimmer neu tapezieren, alte Rauhfaser entfernen und weiß streichen…" />
        <Button onClick={run} disabled={loading || !text} className="bg-brand text-brand-foreground hover:bg-brand/90">
          {loading ? "KI arbeitet…" : "Positionen erzeugen"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
