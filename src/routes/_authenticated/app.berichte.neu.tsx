import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseVoiceReport } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";

const search = z.object({ project: z.string().optional() });

export const Route = createFileRoute("/_authenticated/app/berichte/neu")({
  head: () => ({ meta: [{ title: "Neuer Bericht – MeisterMe" }] }),
  validateSearch: (s) => search.parse(s),
  component: NeuerBericht,
});

function NeuerBericht() {
  const { project } = useSearch({ from: "/_authenticated/app/berichte/neu" });
  const nav = useNavigate();
  const [f, setF] = useState({
    project_id: project ?? "",
    datum: new Date().toISOString().slice(0, 10),
    start_zeit: "08:00",
    end_zeit: "16:30",
    pause_min: 30,
    fahrt_min: 20,
    taetigkeit: "",
    probleme: "",
    offene_punkte: "",
    sprachnotiz: "",
  });
  const [material, setMaterial] = useState<Array<{ bezeichnung: string; menge: number | null; einheit: string }>>([]);
  const parse = useServerFn(parseVoiceReport);
  const [parsing, setParsing] = useState(false);

  const { data: projekte } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => (await supabase.from("projects").select("id, name").order("name")).data ?? [],
  });

  async function aiParse() {
    if (!f.sprachnotiz.trim()) return toast.error("Bitte zuerst Text/Sprachnotiz eingeben");
    setParsing(true);
    try {
      const projectName = projekte?.find((p) => p.id === f.project_id)?.name;
      const res = await parse({ data: { text: f.sprachnotiz, projectName } });
      setF((prev) => ({
        ...prev,
        taetigkeit: res.taetigkeit || prev.taetigkeit,
        offene_punkte: (res.offene_punkte ?? []).join(", ") || prev.offene_punkte,
      }));
      setMaterial((res.material ?? []).map((m) => ({ bezeichnung: m.bezeichnung, menge: m.menge ?? null, einheit: m.einheit ?? "Stk" })));
      toast.success("KI hat den Bericht ausgewertet");
    } catch (e) { toast.error((e as Error).message); }
    finally { setParsing(false); }
  }

  async function save() {
    if (!f.project_id) return toast.error("Bitte Projekt wählen");
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const { data, error } = await supabase.from("field_reports").insert({
      tenant_id: p!.tenant_id as string,
      user_id: u.user!.id,
      project_id: f.project_id,
      datum: f.datum,
      start_zeit: f.start_zeit,
      end_zeit: f.end_zeit,
      pause_min: Number(f.pause_min),
      fahrt_min: Number(f.fahrt_min),
      taetigkeit: f.taetigkeit,
      probleme: f.probleme,
      offene_punkte: f.offene_punkte,
      sprachnotiz: f.sprachnotiz,
      material: material as any,
      status: "entwurf",
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Bericht gespeichert");
    nav({ to: "/app/berichte/$id", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app/berichte" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
      <PageHeader title="Neuer Einsatzbericht" subtitle="Text oder Sprachnotiz – KI hilft beim Auswerten." />
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div>
          <Label>Projekt *</Label>
          <Select value={f.project_id} onValueChange={(v) => setF({ ...f, project_id: v })}>
            <SelectTrigger className="h-11"><SelectValue placeholder="wählen" /></SelectTrigger>
            <SelectContent>{projekte?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div><Label>Datum</Label><Input type="date" value={f.datum} onChange={(e) => setF({ ...f, datum: e.target.value })} className="h-11" /></div>
          <div><Label>Start</Label><Input type="time" value={f.start_zeit} onChange={(e) => setF({ ...f, start_zeit: e.target.value })} className="h-11" /></div>
          <div><Label>Ende</Label><Input type="time" value={f.end_zeit} onChange={(e) => setF({ ...f, end_zeit: e.target.value })} className="h-11" /></div>
          <div><Label>Pause (min)</Label><Input type="number" value={f.pause_min} onChange={(e) => setF({ ...f, pause_min: Number(e.target.value) })} className="h-11" /></div>
          <div><Label>Fahrt (min)</Label><Input type="number" value={f.fahrt_min} onChange={(e) => setF({ ...f, fahrt_min: Number(e.target.value) })} className="h-11" /></div>
        </div>

        <div className="rounded-xl border-2 border-dashed border-brand/30 bg-brand/5 p-4">
          <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" /> Sprachnotiz / Freitext</Label>
          <Textarea rows={4} value={f.sprachnotiz} onChange={(e) => setF({ ...f, sprachnotiz: e.target.value })} className="mt-2" placeholder="Was wurde gemacht, was fällt auf, was ist morgen zu tun?" />
          <Button type="button" onClick={aiParse} disabled={parsing} className="mt-3 w-full bg-brand text-brand-foreground hover:bg-brand/90">
            <Sparkles className="mr-1 h-4 w-4" /> {parsing ? "KI wertet aus…" : "Mit KI auswerten"}
          </Button>
        </div>

        <div><Label>Tätigkeit</Label><Textarea rows={2} value={f.taetigkeit} onChange={(e) => setF({ ...f, taetigkeit: e.target.value })} /></div>
        <div><Label>Probleme</Label><Input value={f.probleme} onChange={(e) => setF({ ...f, probleme: e.target.value })} /></div>
        <div><Label>Offene Punkte</Label><Input value={f.offene_punkte} onChange={(e) => setF({ ...f, offene_punkte: e.target.value })} /></div>

        {material.length > 0 && (
          <div>
            <Label>Verbrauchtes Material (aus KI)</Label>
            <ul className="mt-2 space-y-1 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
              {material.map((m, i) => (
                <li key={i} className="flex justify-between"><span>{m.bezeichnung}</span><span className="font-semibold">{m.menge ?? "—"} {m.einheit}</span></li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={save} className="h-12 w-full bg-brand text-brand-foreground text-base font-semibold hover:bg-brand/90">Bericht speichern</Button>
      </div>
    </div>
  );
}
