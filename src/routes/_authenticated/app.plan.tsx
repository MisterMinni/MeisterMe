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
import { ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react";

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

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type CellAssignment = {
  id: string;
  user_id: string;
  day: string;
  note: string | null;
  site_id: string | null;
  start_time: string | null;
  end_time: string | null;
  sites: { name: string | null; color: string | null } | null;
};

function Plan() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canWrite = useHasPermission("plan:write");
  const [anchor, setAnchor] = useState(startOfWeek(new Date()));
  const [editing, setEditing] = useState<{ userId: string; day: string; userName: string } | null>(null);
  const [form, setForm] = useState({ site_id: "", start_time: "07:00", end_time: "16:30", note: "" });

  const weekStart = anchor;
  const weekEnd = addDays(anchor, 6);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

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
        .select("id, name, color")
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
        .select("id, user_id, day, note, site_id, start_time, end_time, sites(name, color)")
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

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-10 bg-secondary/40 px-4 py-3">Mitarbeiter</th>
              {days.map((d, i) => (
                <th key={i} className="px-3 py-3 text-center">
                  <div>{DAYS[i]}</div>
                  <div className="text-[10px] text-muted-foreground/70">{d.getDate()}.{d.getMonth() + 1}.</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.id} className="border-b border-border/60 last:border-0">
                <td className="sticky left-0 z-10 bg-card px-4 py-3 font-medium">{m.full_name ?? "—"}</td>
                {days.map((d, i) => {
                  const iso = isoDate(d);
                  const list = byUserDay.get(`${m.id}|${iso}`) ?? [];
                  return (
                    <td key={i} className="px-2 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => openCell(m.id, iso, m.full_name ?? "")}
                        disabled={!canWrite}
                        className={`flex min-h-[64px] w-full flex-col gap-1 rounded-md border border-transparent p-1 text-left transition ${canWrite ? "hover:border-brand/40 hover:bg-secondary/40" : ""}`}
                      >
                        {list.length === 0 && (
                          <span className="text-[10px] text-muted-foreground/50">{canWrite ? "+ zuweisen" : "—"}</span>
                        )}
                        {list.map((a) => (
                          <div
                            key={a.id}
                            className="group relative rounded px-2 py-1 text-[11px] text-white shadow-sm"
                            style={{ backgroundColor: a.sites?.color ?? "#0B1B34" }}
                          >
                            <div className="truncate pr-4 font-semibold">{a.sites?.name ?? "—"}</div>
                            {(a.start_time || a.end_time) && (
                              <div className="opacity-90">{a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)}</div>
                            )}
                            {a.note && <div className="truncate opacity-80">{a.note}</div>}
                            {canWrite && (
                              <span
                                role="button"
                                onClick={(ev) => { ev.stopPropagation(); remove(a.id); }}
                                className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        ))}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {(!members || members.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-6 w-6" />
                  Noch keine Mitarbeiter im Betrieb.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zuweisen · {editing?.userName} · {editing?.day}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Baustelle *</Label>
              <Select value={form.site_id} onValueChange={(v) => setForm({ ...form, site_id: v })}>
                <SelectTrigger><SelectValue placeholder="Baustelle wählen" /></SelectTrigger>
                <SelectContent>
                  {(sites ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: s.color ?? "#0B1B34" }} />
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

function getWeekNumber(d: Date) {
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const week1 = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
