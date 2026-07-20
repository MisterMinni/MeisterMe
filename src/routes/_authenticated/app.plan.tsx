import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useHasPermission } from "@/lib/handwerk";
import { listEmployeeDirectory } from "@/lib/team.functions";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar, Trash2, Plus, Clock, StickyNote, LayoutGrid, List } from "lucide-react";

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
// grouped by subgroup

type CellAssignment = {
  id: string;
  user_id: string | null;
  employee_id: string | null;
  day: string;
  note: string | null;
  site_id: string | null;
  start_time: string | null;
  end_time: string | null;
  sites: { name: string | null; color: string | null; adresse: string | null } | null;
};

type Member = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  subgroup: string | null;
};

function Plan() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canWrite = useHasPermission("plan:write");
  const loadEmployees = useServerFn(listEmployeeDirectory);
  const [anchor, setAnchor] = useState(startOfWeek(new Date()));
  const [view, setView] = useState<"week" | "day">("week");
  const [showWeekend, setShowWeekend] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number>(() => (new Date().getDay() + 6) % 7);
  const [editing, setEditing] = useState<{
    employeeId: string;
    authUserId: string | null;
    day: string;
    userName: string;
  } | null>(null);
  const [detail, setDetail] = useState<CellAssignment | null>(null);
  const [form, setForm] = useState({ site_id: "", start_time: "07:00", end_time: "16:30", note: "" });

  const weekStart = anchor;
  const dayCount = showWeekend ? 7 : 5;
  const weekEnd = addDays(anchor, 6);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => addDays(weekStart, i)), [weekStart, dayCount]);
  const selectedDay = days[Math.min(selectedIdx, dayCount - 1)] ?? days[0];
  const selectedIso = isoDate(selectedDay);

  const { data: members } = useQuery({
    queryKey: ["plan-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => (await loadEmployees()) as Member[],
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
        .select("id, user_id, employee_id, day, note, site_id, start_time, end_time, sites(name, color, adresse)")
        .gte("day", isoDate(weekStart))
        .lte("day", isoDate(weekEnd));
      return (data ?? []) as unknown as CellAssignment[];
    },
  });

  const byUserDay = useMemo(() => {
    const m = new Map<string, CellAssignment[]>();
    for (const a of assignments ?? []) {
      const k = `${a.employee_id ?? a.user_id}|${a.day}`;
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

  const grouped = useMemo(() => {
    const g = new Map<string, Member[]>();
    for (const m of members ?? []) {
      const key = m.subgroup ?? "Team";
      const arr = g.get(key) ?? [];
      arr.push(m);
      g.set(key, arr);
    }
    return Array.from(g.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [members]);

  function openCell(employeeId: string, authUserId: string | null, day: string, userName: string) {
    if (!canWrite) return;
    setEditing({ employeeId, authUserId, day, userName });
    setForm({ site_id: "", start_time: "07:00", end_time: "16:30", note: "" });
  }

  async function save() {
    if (!editing || !profile?.tenant_id || !profile?.id) return;
    if (!form.site_id) return toast.error("Baustelle auswählen");
    const { error } = await supabase.from("weekly_assignments").insert({
      tenant_id: profile.tenant_id,
      employee_id: editing.employeeId,
      user_id: editing.authUserId,
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
    setDetail(null);
    qc.invalidateQueries({ queryKey: ["plan-assignments"] });
  }

  const weekLabel = `${weekStart.getDate()}.${weekStart.getMonth() + 1}. – ${addDays(weekStart, dayCount - 1).getDate()}.${addDays(weekStart, dayCount - 1).getMonth() + 1}.`;
  const kw = getWeekNumber(weekStart);
  const todayIso = isoDate(new Date());

  function initials(name?: string | null) {
    if (!name) return "?";
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
  }

  // Site color helpers → tinted background + strong left bar
  function tint(hex: string | null | undefined) {
    const c = hex ?? "#005aab";
    return { backgroundColor: `${c}1A`, borderColor: `${c}55`, color: c };
  }

  return (
    <div className="space-y-3">
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
          <span className="text-sm font-semibold text-foreground">{weekLabel}{weekStart.getFullYear()}</span>
        </button>
        <button
          onClick={() => setAnchor(addDays(anchor, 7))}
          className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Nächste Woche"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* View toggle + weekend */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-full bg-muted p-0.5">
          <button
            onClick={() => setView("week")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Woche
          </button>
          <button
            onClick={() => setView("day")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === "day" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <List className="h-3.5 w-3.5" /> Tag
          </button>
        </div>
        {view === "week" && (
          <button
            onClick={() => setShowWeekend((v) => !v)}
            className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold transition ${showWeekend ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Sa/So
          </button>
        )}
      </div>

      {view === "week" ? (
        <WeekMatrix
          days={days}
          grouped={grouped}
          byUserDay={byUserDay}
          todayIso={todayIso}
          canWrite={canWrite}
          onCell={openCell}
          onOpenDetail={setDetail}
          initials={initials}
          tint={tint}
        />
      ) : (
        <>
          {/* Day pills */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {days.map((d, i) => {
              const active = i === selectedIdx;
              const iso = isoDate(d);
              const cnt = countByDay.get(iso) ?? 0;
              const isToday = iso === todayIso;
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

          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedDay.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <span className="text-xs text-muted-foreground">{countByDay.get(selectedIso) ?? 0} Einsätze</span>
          </div>

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
                        onClick={() => openCell(m.id, m.auth_user_id, selectedIso, m.full_name)}
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
                        <div key={a.id} className="relative overflow-hidden rounded-xl border border-border/60 bg-background p-3 pl-4">
                          <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: a.sites?.color ?? "#005aab" }} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-foreground">{a.sites?.name ?? "—"}</div>
                              {a.sites?.adresse && <div className="truncate text-xs text-muted-foreground">{a.sites.adresse}</div>}
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
        </>
      )}

      {/* Detail sheet for a single assignment */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: detail.sites?.color ?? "#005aab" }} />
                  {detail.sites?.name ?? "Einsatz"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 text-sm">
                {detail.sites?.adresse && <div className="text-muted-foreground">{detail.sites.adresse}</div>}
                <div className="text-muted-foreground">
                  {new Date(detail.day).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                {(detail.start_time || detail.end_time) && (
                  <div className="inline-flex items-center gap-1 text-foreground">
                    <Clock className="h-4 w-4" /> {detail.start_time?.slice(0, 5) ?? "–"} – {detail.end_time?.slice(0, 5) ?? "–"}
                  </div>
                )}
                {detail.note && (
                  <div className="rounded-xl bg-muted p-3 text-foreground">{detail.note}</div>
                )}
              </div>
              {canWrite && (
                <div className="mt-6 flex justify-end">
                  <Button variant="destructive" onClick={() => remove(detail.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Entfernen
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

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

function WeekMatrix({
  days,
  grouped,
  byUserDay,
  todayIso,
  canWrite,
  onCell,
  onOpenDetail,
  initials,
  tint,
}: {
  days: Date[];
  grouped: [string, Member[]][];
  byUserDay: Map<string, CellAssignment[]>;
  todayIso: string;
  canWrite: boolean;
  onCell: (employeeId: string, authUserId: string | null, day: string, userName: string) => void;
  onOpenDetail: (a: CellAssignment) => void;
  initials: (n?: string | null) => string;
  tint: (hex: string | null | undefined) => { backgroundColor: string; borderColor: string; color: string };
}) {
  const NAME_COL = 108;
  const CELL_W = 96;

  if (grouped.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
        <Calendar className="mx-auto mb-2 h-8 w-8" />
        Noch keine Mitarbeiter im Betrieb.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <div className="overflow-x-auto">
        <div style={{ minWidth: NAME_COL + CELL_W * days.length }}>
          {/* Header row */}
          <div
            className="sticky top-0 z-10 grid border-b border-border/70 bg-card"
            style={{ gridTemplateColumns: `${NAME_COL}px repeat(${days.length}, ${CELL_W}px)` }}
          >
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mitarbeiter
            </div>
            {days.map((d, i) => {
              const iso = isoDate(d);
              const isToday = iso === todayIso;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center py-2 ${isToday ? "bg-brand/10" : ""}`}
                >
                  <span className={`text-[10px] font-semibold uppercase ${isToday ? "text-brand" : "text-muted-foreground"}`}>
                    {DAYS[i]}
                  </span>
                  <span className={`text-sm font-bold leading-tight ${isToday ? "text-brand" : "text-foreground"}`}>
                    {d.getDate()}.{d.getMonth() + 1}.
                  </span>
                </div>
              );
            })}
          </div>

          {/* Groups */}
          {grouped.map(([gewerk, list]) => (
            <div key={gewerk}>
              <div
                className="sticky left-0 border-b border-border/50 bg-muted/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ width: NAME_COL + CELL_W * days.length }}
              >
                {gewerk}
              </div>

              {list.map((m) => (
                <div
                  key={m.id}
                  className="grid border-b border-border/40 last:border-b-0"
                  style={{ gridTemplateColumns: `${NAME_COL}px repeat(${days.length}, ${CELL_W}px)` }}
                >
                  <div className="sticky left-0 z-[1] flex items-center gap-2 border-r border-border/50 bg-card px-2 py-2">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0 text-xs font-semibold leading-tight text-foreground">
                      <div className="truncate">{m.full_name ?? "—"}</div>
                    </div>
                  </div>

                  {days.map((d, i) => {
                    const iso = isoDate(d);
                    const cell = byUserDay.get(`${m.id}|${iso}`) ?? [];
                    const isToday = iso === todayIso;
                    return (
                      <div
                        key={i}
                        className={`min-h-[56px] border-l border-border/40 p-1 ${isToday ? "bg-brand/5" : ""}`}
                      >
                        {cell.length === 0 ? (
                          <button
                            disabled={!canWrite}
                            onClick={() => onCell(m.id, m.auth_user_id, iso, m.full_name)}
                            className={`grid h-full w-full place-items-center rounded-lg border border-dashed ${canWrite ? "border-border/60 text-muted-foreground/60 hover:border-brand/50 hover:text-brand" : "border-transparent"}`}
                            aria-label="Zuweisen"
                          >
                            {canWrite && <Plus className="h-4 w-4" />}
                          </button>
                        ) : (
                          <div className="flex h-full flex-col gap-1">
                            {cell.map((a) => {
                              const t = tint(a.sites?.color);
                              return (
                                <button
                                  key={a.id}
                                  onClick={() => onOpenDetail(a)}
                                  className="relative overflow-hidden rounded-lg border pl-1.5 pr-1.5 py-1 text-left"
                                  style={t}
                                >
                                  <span
                                    className="absolute inset-y-0 left-0 w-1"
                                    style={{ backgroundColor: a.sites?.color ?? "#005aab" }}
                                  />
                                  <div className="ml-1 truncate text-[11px] font-semibold leading-tight">
                                    {a.sites?.name ?? "—"}
                                  </div>
                                  {(a.start_time || a.end_time) && (
                                    <div className="ml-1 text-[10px] opacity-80">
                                      {a.start_time?.slice(0, 5) ?? "–"}–{a.end_time?.slice(0, 5) ?? "–"}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                            {canWrite && (
                              <button
                                onClick={() => onCell(m.id, m.auth_user_id, iso, m.full_name)}
                                className="grid h-4 w-full place-items-center rounded text-muted-foreground/60 hover:text-brand"
                                aria-label="Weiteren Einsatz hinzufügen"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
