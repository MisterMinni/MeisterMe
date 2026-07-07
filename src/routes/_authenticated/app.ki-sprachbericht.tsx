import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Sparkles, ArrowRight } from "lucide-react";
import { parseVoiceReport } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/ki-sprachbericht")({
  head: () => ({ meta: [{ title: "KI-Sprachbericht – MeisterMe" }] }),
  component: KiSprachbericht,
});

function KiSprachbericht() {
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const parse = useServerFn(parseVoiceReport);

  const { data: projekte } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => (await supabase.from("projects").select("id, name")).data ?? [],
  });

  async function run() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const projectName = projekte?.find((p) => p.id === projectId)?.name;
      const res = await parse({ data: { text, projectName } });
      setResult(res);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  async function saveAsReport() {
    if (!result || !projectId) return toast.error("Bitte Projekt wählen");
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const { data, error } = await supabase.from("field_reports").insert({
      tenant_id: p!.tenant_id as string,
      user_id: u.user!.id,
      project_id: projectId,
      sprachnotiz: text,
      taetigkeit: result.taetigkeit,
      offene_punkte: (result.offene_punkte ?? []).join(", "),
      material: result.material as any,
      
      ki_bericht: result.interner_bericht,
      kunden_zusammenfassung: result.kunden_zusammenfassung,
      status: "fertig" as any,
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Als Einsatzbericht gespeichert");
    window.location.href = `/app/berichte/${data.id}`;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="KI-Sprachbericht" subtitle="Einsprechen oder eintippen – die KI macht Bericht, Material und Zeiten daraus." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-dashed border-brand/30 bg-brand/5 p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-card"><Mic className="h-7 w-7" /></span>
            <div>
              <h3 className="font-display text-lg font-bold">Was hast du gemacht?</h3>
              <p className="text-xs text-muted-foreground">Text oder Diktat aus deiner Handy-Tastatur.</p>
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Projekt (optional)</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="wählen" /></SelectTrigger>
              <SelectContent>{projekte?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Heute bei Familie Müller im Wohnzimmer alte Tapete entfernt, Wandflächen gespachtelt, 36 Quadratmeter, zwei Säcke Spachtelmasse verbraucht, morgen schleifen und grundieren."
            className="text-base"
          />
          <Button onClick={run} disabled={loading || !text} className="mt-4 h-12 w-full bg-brand text-brand-foreground text-base font-semibold hover:bg-brand/90">
            <Sparkles className="mr-1 h-4 w-4" /> {loading ? "KI arbeitet…" : "Auswerten"}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-bold">KI-Ergebnis</h3>
          {!result ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 text-brand/40" />
              <p className="text-sm">Ergebnis erscheint hier nach Auswertung.</p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <Kv label="Tätigkeit" value={result.taetigkeit} />
              <Kv label="Aufmaß" value={result.aufmass?.map((a: any) => `${a.bereich}: ${a.wert}`).join(", ")} />
              <Kv label="Material" value={result.material?.map((m: any) => `${m.bezeichnung}${m.menge ? ` (${m.menge} ${m.einheit ?? ""})` : ""}`).join(", ")} />
              <Kv label="Arbeitszeit" value={`${result.arbeitszeit_min} min`} />
              <Kv label="Offene Punkte" value={result.offene_punkte?.join(", ")} />
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Interner Bericht</div>
                <p className="mt-1 rounded-lg bg-secondary/50 p-2 text-sm whitespace-pre-wrap">{result.interner_bericht}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Kunden-Zusammenfassung</div>
                <p className="mt-1 rounded-lg bg-brand/10 p-2 text-sm whitespace-pre-wrap">{result.kunden_zusammenfassung}</p>
              </div>
              <Button onClick={saveAsReport} className="mt-2 w-full bg-brand text-brand-foreground hover:bg-brand/90">
                Als Einsatzbericht speichern <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div><div className="text-xs font-semibold text-muted-foreground">{label}</div><div>{value}</div></div>;
}
