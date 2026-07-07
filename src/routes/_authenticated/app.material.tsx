import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatEur } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/material")({
  head: () => ({ meta: [{ title: "Material – HandwerkPilot" }] }),
  component: MaterialSeite,
});

function MaterialSeite() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ artikelnummer: "", bezeichnung: "", einheit: "Stk", ek_preis: 0, vk_preis: 0, lieferant: "" });

  const { data } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => (await supabase.from("materials").select("*").order("bezeichnung")).data ?? [],
  });

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const { error } = await supabase.from("materials").insert({ ...f, tenant_id: p!.tenant_id as string });
    if (error) return toast.error(error.message);
    toast.success("Material angelegt");
    setOpen(false); setF({ artikelnummer: "", bezeichnung: "", einheit: "Stk", ek_preis: 0, vk_preis: 0, lieferant: "" });
    qc.invalidateQueries({ queryKey: ["materials"] });
  }
  async function del(id: string) {
    await supabase.from("materials").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["materials"] });
  }

  return (
    <div>
      <PageHeader
        title="Materialstamm"
        subtitle="Artikel, Einheiten und Preise. Anbindung an Großhändler bald verfügbar."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Artikel</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neuer Artikel</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Artikel-Nr</Label><Input value={f.artikelnummer} onChange={(e) => setF({ ...f, artikelnummer: e.target.value })} /></div>
                  <div><Label>Einheit</Label><Input value={f.einheit} onChange={(e) => setF({ ...f, einheit: e.target.value })} /></div>
                </div>
                <div><Label>Bezeichnung *</Label><Input value={f.bezeichnung} onChange={(e) => setF({ ...f, bezeichnung: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>EK (€)</Label><Input type="number" step="0.01" value={f.ek_preis} onChange={(e) => setF({ ...f, ek_preis: Number(e.target.value) })} /></div>
                  <div><Label>VK (€)</Label><Input type="number" step="0.01" value={f.vk_preis} onChange={(e) => setF({ ...f, vk_preis: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Lieferant</Label><Input value={f.lieferant} onChange={(e) => setF({ ...f, lieferant: e.target.value })} /></div>
                <Button onClick={save} disabled={!f.bezeichnung} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">Speichern</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState icon={Package} title="Keine Artikel" desc="Lege deine wichtigsten Materialien an – Spachtelmasse, Grundierung, Farbe, Dämmstoff …" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left"><tr><th className="p-3">Artikel-Nr</th><th className="p-3">Bezeichnung</th><th className="p-3">Einheit</th><th className="p-3 text-right">EK</th><th className="p-3 text-right">VK</th><th className="p-3">Lieferant</th><th className="p-3" /></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground">{m.artikelnummer}</td>
                  <td className="p-3 font-medium">{m.bezeichnung}</td>
                  <td className="p-3">{m.einheit}</td>
                  <td className="p-3 text-right">{formatEur(m.ek_preis)}</td>
                  <td className="p-3 text-right font-semibold">{formatEur(m.vk_preis)}</td>
                  <td className="p-3 text-xs">{m.lieferant}</td>
                  <td className="p-3 text-right"><button onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
