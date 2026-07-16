import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useHasPermission } from "@/lib/handwerk";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar, Trash2, Plus, Clock, StickyNote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({ meta: [{ title: "Wochenplanung – MeisterMe" }] }),
  component: Plan,
});

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function getWeekNumber(d: Date) {
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const week1 = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type CellAssignment = {
  id: string;
  user_id: string;
  day: string;
  note: string | null;
  site_id: string | null;
  start_time: string | null;
  end_time: string | null;
  sites: { name: string | null; color: string | null; adresse: string | null } | null;
};

function Plan() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canWrite = useHasPermission("plan:write");
  const [anchor, setAnchor] = useState(startOfWeek(new Date()));
  const [selectedIdx, setSelectedIdx] = useState<number>(() => (new Date().getDay() + 6) % 7);
  const [editing, setEditing] = useState<{ userId: string; day: string; userName: string } | null>(null);
  const [form, setForm] = useState({ site_id: "", start_time: "07:00", end_time: "16:30", note: "" });

  const weekStart = anchor;
  const weekEnd = addDays(anchor, 6);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const selectedDay = days[selectedIdx];
  const selectedIso = isoDate(selectedDay);

  const { data: members } = useQuery({
    queryKey: ["plan-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("tenant_id", profile!.tenant_id!)
        .is("disabled_at", null)
        .order("full_name");
      return data ?? [];
    },
  });

  const { data: sites } = useQuery({
    queryKey: ["plan-sites", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("sites")
        .select("id, name, color, adresse")
        .is("archived_at", null)
        .order("name");
      return data ?? [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["plan-assignments", isoDate(weekStart), isoDate(weekEnd)],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_assignments")
        .select("id, user_id, day, note, site_id, start_time, end_time, sites(name, color, adresse)")
        .gte("day", isoDate(weekStart))
        .lte("day", isoDate(weekEnd));
      return (data ?? []) as unknown as CellAssignment[];
    },
  });

  const byUserDay = useMemo(() => {
    const m = new Map<string, CellAssignment[]>();
    for (const a of assignments ?? []) {
      const k = `${a.user_id}|${a.day}`;
      const list = m.get(k) ?? [];
      list.push(a);
      m.set(k, list);
    }
    return m;
  }, [assignments]);

  const countByDay = useMemo(() => {
    const c = new Map<string, number>();
    for (const a of assignments ?? []) c.set(a.day, (c.get(a.day) ?? 0) + 1);
    return c;
  }, [assignments]);

  function openCell(userId: string, day: string, userName: string) {
    if (!canWrite) return;
    setEditing({ userId, day, userName });
    setForm({ site_id: "", start_time: "07:00", end_time: "16:30", note: "" });
  }

  async function save() {
    if (!editing || !profile?.tenant_id || !profile?.id) return;
    if (!form.site_id) return toast.error("Baustelle auswählen");
    const { error } = await supabase.from("weekly_assignments").insert({
      tenant_id: profile.tenant_id,
      user_id: editing.userId,
      day: editing.day,
      site_id: form.site_id,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      note: form.note || null,
      created_by: profile.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Zugewiesen");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["plan-assignments"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("weekly_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["plan-assignments"] });
  }

  const weekLabel = `${weekStart.getDate()}.${weekStart.getMonth() + 1}. – ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}.${weekEnd.getFullYear()}`;
  const kw = getWeekNumber(weekStart);

  function initials(name?: string | null) {
    if (!name) return "?";
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
  }

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-2xl bg-card p-2 shadow-card">
        <button
          onClick={() => setAnchor(addDays(anchor, -7))}
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Vorherige Woche"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => { const w = startOfWeek(new Date()); setAnchor(w); setSelectedIdx((new Date().getDay() + 6) % 7); }}
          className="flex flex-col items-center leading-tight"
        >
          <span className="text-xs font-medium text-muted-foreground">KW {kw}</span>
          <span className="text-sm font-semibold text-foreground">{weekLabel}</span>
        </button>
        <button
          onClick={() => setAnchor(addDays(anchor, 7))}
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Nächste Woche"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day pills */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d, i) => {
          const active = i === selectedIdx;
          const iso = isoDate(d);
          const cnt = countByDay.get(iso) ?? 0;
          const isToday = iso === isoDate(new Date());
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`relative flex min-w-[52px] shrink-0 flex-col items-center rounded-2xl px-3 py-2 transition ${
                active ? "bg-brand text-brand-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <span className="text-[11px] font-medium uppercase opacity-80">{DAYS[i]}</span>
              <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
              {cnt > 0 && (
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-brand"}`} />
              )}
              {isToday && !active && (
                <span className="absolute inset-0 rounded-2xl ring-2 ring-brand/40" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-lg font-semibold text-foreground">
          {selectedDay.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
        </h2>
        <span className="text-xs text-muted-foreground">
          {countByDay.get(selectedIso) ?? 0} Einsätze
        </span>
      </div>

      {/* Member list for selected day */}
      <div className="space-y-3">
        {(members ?? []).map((m) => {
          const list = byUserDay.get(`${m.id}|${selectedIso}`) ?? [];
          return (
            <div key={m.id} className="rounded-2xl bg-card p-3 shadow-card">
              <div className="mb-2 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {initials(m.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">{m.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {list.length === 0 ? "Keine Zuweisung" : `${list.length} Einsatz${list.length === 1 ? "" : "e"}`}
                  </div>
                </div>
                {canWrite && (
                  <button
                    onClick={() => openCell(m.id, selectedIso, m.full_name ?? "")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm active:scale-95"
                    aria-label="Zuweisen"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>

              {list.length > 0 && (
                <div className="space-y-2">
                  {list.map((a) => (
                    <div
                      key={a.id}
                      className="relative overflow-hidden rounded-xl border border-border/60 bg-background p-3 pl-4"
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: a.sites?.color ?? "#005aab" }}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-foreground">{a.sites?.name ?? "—"}</div>
                          {a.sites?.adresse && (
                            <div className="truncate text-xs text-muted-foreground">{a.sites.adresse}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {(a.start_time || a.end_time) && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {a.start_time?.slice(0, 5) ?? "–"} – {a.end_time?.slice(0, 5) ?? "–"}
                              </span>
                            )}
                            {a.note && (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <StickyNote className="h-3 w-3 shrink-0" />
                                <span className="truncate">{a.note}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => remove(a.id)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(!members || members.length === 0) && (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-2 h-8 w-8" />
            Noch keine Mitarbeiter im Betrieb.
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.userName}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              {editing && new Date(editing.day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Baustelle *</Label>
              <Select value={form.site_id} onValueChange={(v) => setForm({ ...form, site_id: v })}>
                <SelectTrigger><SelectValue placeholder="Baustelle wählen" /></SelectTrigger>
                <SelectContent>
                  {(sites ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: s.color ?? "#005aab" }} />
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Von</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>Bis</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div>
              <Label>Notiz</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="z.B. Materialabholung 6:30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">Zuweisen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
