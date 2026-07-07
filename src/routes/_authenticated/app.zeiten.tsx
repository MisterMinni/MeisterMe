import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/zeiten")({
  head: () => ({ meta: [{ title: "Zeiterfassung – MeisterMe" }] }),
  component: Zeiten,
});

function Zeiten() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [taetigkeit, setTaetigkeit] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!startTs) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [startTs]);

  const { data: projekte } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => (await supabase.from("projects").select("id, name")).data ?? [],
  });
  const { data: entries } = useQuery({
    queryKey: ["time-entries"],
    queryFn: async () => (await supabase.from("time_entries").select("*, projects(name)").order("start_ts", { ascending: false }).limit(50)).data ?? [],
  });

  async function start() {
    if (!projectId) return toast.error("Projekt wählen");
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const now = new Date();
    const { data, error } = await supabase.from("time_entries").insert({
      tenant_id: p!.tenant_id as string, user_id: u.user!.id,
      project_id: projectId, taetigkeit, start_ts: now.toISOString(),
    }).select("id").single();
    if (error) return toast.error(error.message);
    setRunningId(data.id);
    setStartTs(now.getTime());
  }
  async function stop() {
    if (!runningId || !startTs) return;
    const end = new Date();
    const minuten = Math.round((end.getTime() - startTs) / 60000);
    await supabase.from("time_entries").update({ end_ts: end.toISOString(), minuten }).eq("id", runningId);
    setRunningId(null); setStartTs(null);
    qc.invalidateQueries({ queryKey: ["time-entries"] });
    toast.success(`Erfasst: ${minuten} min`);
  }

  const elapsed = startTs ? Math.floor((Date.now() - startTs) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const heutigeMinuten = (entries ?? []).filter((e) => e.start_ts && new Date(e.start_ts).toDateString() === new Date().toDateString()).reduce((s, e) => s + (e.minuten ?? 0), 0);

  return (
    <div>
      <PageHeader title="Zeiterfassung" subtitle="Start/Stopp direkt auf der Baustelle." />

      <div className="mb-6 rounded-3xl border border-border bg-navy p-6 text-white shadow-lift">
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs uppercase tracking-wider text-white/60">{runningId ? "Läuft für" : "Bereit"}</div>
          <div className="font-display text-6xl font-bold tabular-nums">{startTs ? `${hh}:${mm}:${ss}` : "00:00:00"}</div>
          <div className="grid w-full max-w-lg gap-2">
            <Select value={projectId} onValueChange={setProjectId} disabled={!!runningId}>
              <SelectTrigger className="h-12 bg-white text-foreground"><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
              <SelectContent>{projekte?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Tätigkeit (optional)" value={taetigkeit} onChange={(e) => setTaetigkeit(e.target.value)} disabled={!!runningId} className="h-12 bg-white text-foreground" />
            {!runningId ? (
              <Button onClick={start} className="h-14 bg-brand text-brand-foreground text-lg font-semibold hover:bg-brand/90"><Play className="mr-2 h-5 w-5" /> Start</Button>
            ) : (
              <Button onClick={stop} variant="destructive" className="h-14 text-lg font-semibold"><Square className="mr-2 h-5 w-5" /> Stopp</Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
        <Clock className="h-5 w-5 text-brand" />
        <div className="text-sm">Heute erfasst:</div>
        <div className="ml-auto font-display text-lg font-bold">{(heutigeMinuten / 60).toFixed(2)} h</div>
      </div>

      <h3 className="mb-2 font-display text-lg font-semibold">Letzte Einträge</h3>
      <ul className="space-y-2">
        {(entries ?? []).map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <div className="font-medium">{(e.projects as any)?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{formatDate(e.start_ts)} · {e.taetigkeit ?? "—"}</div>
            </div>
            <div className="font-display font-bold">{e.minuten ? `${(e.minuten / 60).toFixed(2)} h` : "läuft…"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
