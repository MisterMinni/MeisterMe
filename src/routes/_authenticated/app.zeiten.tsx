import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/zeiten")({
  head: () => ({ meta: [{ title: "Zeiterfassung – MeisterMe" }] }),
  component: Zeiten,
});

function Zeiten() {
  const qc = useQueryClient();
  const [siteId, setSiteId] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [pauseTotal, setPauseTotal] = useState(0);
  const [pauses, setPauses] = useState<{ from: string; to: string }[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!startTs) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [startTs]);

  const { data: sites } = useQuery({
    queryKey: ["sites-select"],
    queryFn: async () =>
      (await supabase.from("sites").select("id, name").is("archived_at", null)).data ?? [],
  });
  const { data: entries } = useQuery({
    queryKey: ["time-entries"],
    queryFn: async () =>
      (await supabase
        .from("time_entries")
        .select("*, sites(name)")
        .order("start_ts", { ascending: false })
        .limit(20)).data ?? [],
  });

  async function start() {
    if (!siteId) return toast.error("Baustelle wählen");
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const now = new Date();
    const { data, error } = await supabase.from("time_entries").insert({
      tenant_id: p!.tenant_id as string,
      user_id: u.user!.id,
      project_id: siteId,
      start_ts: now.toISOString(),
    }).select("id").single();
    if (error) return toast.error(error.message);
    setRunningId(data.id);
    setStartTs(now.getTime());
    setPauseTotal(0);
    setPauses([]);
  }
  function togglePause() {
    if (pauseStart) {
      const now = Date.now();
      const dur = now - pauseStart;
      setPauseTotal((t) => t + dur);
      setPauses((p) => [
        ...p,
        {
          from: fmtHM(pauseStart),
          to: fmtHM(now),
        },
      ]);
      setPauseStart(null);
    } else {
      setPauseStart(Date.now());
    }
  }
  async function stop() {
    if (!runningId || !startTs) return;
    const end = new Date();
    let totalPause = pauseTotal;
    if (pauseStart) totalPause += end.getTime() - pauseStart;
    const minuten = Math.max(0, Math.round((end.getTime() - startTs - totalPause) / 60000));
    await supabase.from("time_entries").update({ end_ts: end.toISOString(), minuten }).eq("id", runningId);
    setRunningId(null);
    setStartTs(null);
    setPauseStart(null);
    setPauseTotal(0);
    setPauses([]);
    qc.invalidateQueries({ queryKey: ["time-entries"] });
    toast.success(`Erfasst: ${Math.floor(minuten / 60)}h ${minuten % 60}m`);
  }

  const now = Date.now();
  let elapsedMs = startTs ? now - startTs - pauseTotal : 0;
  if (pauseStart) elapsedMs -= now - pauseStart;
  const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const todayStr = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Timer card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="text-center text-sm font-medium text-muted-foreground">
          {todayStr}
        </div>

        {!runningId && (
          <div className="mt-4">
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Baustelle wählen" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-secondary/60 py-8 text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {runningId ? (pauseStart ? "Pause" : "Arbeitszeit läuft") : "Bereit"}
          </div>
          <div className="mt-2 font-display text-5xl font-bold tabular-nums tracking-tight text-foreground">
            {startTs ? `${hh}:${mm}:${ss}` : "00:00:00"}
          </div>
          {startTs && (
            <div className="mt-1 text-xs text-muted-foreground">
              Seit {fmtHM(startTs)} Uhr
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {!runningId ? (
            <Button
              onClick={start}
              className="h-12 w-full bg-brand text-lg font-semibold text-brand-foreground hover:bg-brand/90"
            >
              Arbeitszeit starten
            </Button>
          ) : (
            <>
              <Button
                onClick={togglePause}
                variant="outline"
                className="h-12 w-full text-base font-semibold"
              >
                {pauseStart ? "Pause beenden" : "Pause starten"}
              </Button>
              <Button
                onClick={stop}
                className="h-12 w-full bg-destructive text-base font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Arbeitszeit beenden
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tagesübersicht */}
      {startTs && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-base font-semibold">Tagesübersicht</h3>
          <ul className="space-y-2 text-sm">
            <Row label="Arbeitsbeginn" value={fmtHM(startTs)} />
            {pauses.map((p, i) => (
              <Row key={i} label={`Pause ${i + 1}`} value={`${p.from} – ${p.to}`} />
            ))}
            {pauseStart && (
              <Row label={`Pause ${pauses.length + 1}`} value={`${fmtHM(pauseStart)} – …`} />
            )}
            <Row label="Arbeitsende" value="–" />
            <li className="mt-2 flex items-center justify-between border-t border-border pt-3 font-semibold">
              <span>Gesamtzeit</span>
              <span className="font-display tabular-nums">{`${hh}:${mm} h`}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Letzte Einträge */}
      {(entries ?? []).length > 0 && (
        <div>
          <h3 className="mb-2 px-1 font-display text-base font-semibold">Letzte Einträge</h3>
          <ul className="space-y-2">
            {(entries ?? []).slice(0, 5).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-card"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {(e.sites as unknown as { name?: string } | null)?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(e.start_ts)}
                  </div>
                </div>
                <div className="font-display text-sm font-semibold tabular-nums">
                  {e.minuten ? `${(e.minuten / 60).toFixed(2)} h` : "läuft…"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}

function fmtHM(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
