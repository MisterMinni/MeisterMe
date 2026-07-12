import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useProfile } from "@/lib/handwerk";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/plan")({
  head: () => ({ meta: [{ title: "Wochenplanung – MeisterMe" }] }),
  component: Plan,
});

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
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

function Plan() {
  const { data: profile } = useProfile();
  const [anchor, setAnchor] = useState(startOfWeek(new Date()));
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
        .is("disabled_at", null);
      return data ?? [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["plan-assignments", isoDate(weekStart), isoDate(weekEnd)],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_assignments")
        .select("id, user_id, day, note, sites(name, color)")
        .gte("day", isoDate(weekStart))
        .lte("day", isoDate(weekEnd));
      return data ?? [];
    },
  });

  const byUserDay = useMemo(() => {
    const m = new Map<string, typeof assignments>();
    for (const a of assignments ?? []) {
      const k = `${a.user_id}|${a.day}`;
      const list = m.get(k) ?? [];
      list.push(a);
      m.set(k, list);
    }
    return m;
  }, [assignments]);

  return (
    <div>
      <PageHeader
        title="Wochenplanung"
        subtitle="Wer arbeitet wann wo? Übersicht für die ganze Mannschaft."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-display text-sm font-semibold">
              KW {getWeekNumber(weekStart)} · {isoDate(weekStart)} – {isoDate(weekEnd)}
            </div>
            <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => setAnchor(startOfWeek(new Date()))} className="bg-brand text-brand-foreground hover:bg-brand/90">Heute</Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mitarbeiter</th>
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
                <td className="px-4 py-3 font-medium">{m.full_name ?? "—"}</td>
                {days.map((d, i) => {
                  const list = byUserDay.get(`${m.id}|${isoDate(d)}`) ?? [];
                  return (
                    <td key={i} className="px-2 py-2 align-top">
                      <div className="flex min-h-[52px] flex-col gap-1">
                        {list.length === 0 && <span className="text-[10px] text-muted-foreground/50">—</span>}
                        {list.map((a) => {
                          const site = (a as unknown as { sites: { name?: string; color?: string } | null }).sites;
                          return (
                            <div
                              key={a.id}
                              className="rounded px-2 py-1 text-[11px] text-white shadow-sm"
                              style={{ backgroundColor: site?.color ?? "#0B1B34" }}
                            >
                              <div className="truncate font-semibold">{site?.name ?? "—"}</div>
                              {a.note && <div className="truncate opacity-80">{a.note}</div>}
                            </div>
                          );
                        })}
                      </div>
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
      <p className="mt-4 text-xs text-muted-foreground">
        Einträge per Klick anlegen und verschieben folgt in Kürze. Aktuell nur Übersicht.
      </p>
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
