import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FabAdd } from "@/components/fab-add";
import { useProfile, SITE_STATUS, useHasPermission } from "@/lib/handwerk";
import { toast } from "sonner";
import { Briefcase, Archive, ArrowRight } from "lucide-react";


export const Route = createFileRoute("/_authenticated/app/baustellen/")({
  head: () => ({ meta: [{ title: "Baustellen – MeisterMe" }] }),
  component: Baustellen,
});

function Baustellen() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canCreate = useHasPermission("sites:create");
  const canArchive = useHasPermission("sites:update");
  const [openNew, setOpenNew] = useState(false);
  const emptyForm = {
    strasse: "",
    hausnr: "",
    plz: "",
    beschreibung: "",
    status: "geplant",
    start_date: "",
    end_date: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: sites } = useQuery({
    queryKey: ["sites", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sites")
        .select("*")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });


  async function create() {
    if (!profile?.tenant_id) return;
    if (!form.strasse || !form.hausnr || !form.plz) return toast.error("Adresse, HausNr. und PLZ eingeben");
    const adresse = `${form.strasse} ${form.hausnr}, ${form.plz}`.trim();
    const isArchived = form.status === "archiviert";
    const { error } = await supabase.from("sites").insert({
      tenant_id: profile.tenant_id,
      name: adresse,
      beschreibung: form.beschreibung || null,
      adresse,
      status: (isArchived ? "abgeschlossen" : form.status) as never,
      archived_at: isArchived ? new Date().toISOString() : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      gewerk: "ausbau" as never,
    });
    if (error) return toast.error(error.message);
    toast.success("Baustelle angelegt");
    setOpenNew(false);
    setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["sites"] });
  }



  return (
    <div>
      {canCreate && (
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <FabAdd label="Neue Baustelle" onClick={() => setOpenNew(true)} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Baustelle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <div>
                  <Label>Adresse</Label>
                  <Input value={form.strasse} onChange={(e) => setForm({ ...form, strasse: e.target.value })} placeholder="Straße" />
                </div>
                <div>
                  <Label>HausNr.</Label>
                  <Input value={form.hausnr} onChange={(e) => setForm({ ...form, hausnr: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>PLZ</Label>
                <Input value={form.plz} onChange={(e) => setForm({ ...form, plz: e.target.value })} inputMode="numeric" />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Ende</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SITE_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>Abbrechen</Button>
              <Button onClick={create} className="bg-brand text-brand-foreground hover:bg-brand/90">Anlegen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      <BaustellenList
        sites={sites ?? []}
        userId={profile?.id}
        canCreate={canCreate}
        canArchive={canArchive}
        onArchive={archive}
        onUnarchive={unarchive}
        onCreate={() => setOpenNew(true)}
      />
    </div>
  );
}


const ROW_COLORS = ["#10B981", "#005aab", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9", "#EC4899"];

function BaustellenList({
  sites,
  userId,
  canCreate,
  canArchive,
  onArchive,
  onUnarchive,
  onCreate,
}: {
  sites: any[];
  userId?: string;
  canCreate: boolean;
  canArchive: boolean;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onCreate: () => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"geplant" | "in_arbeit" | "fertig" | "archiviert">("in_arbeit");
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayAssignments } = useQuery({
    queryKey: ["my-today-assignments", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_assignments")
        .select("site_id")
        .eq("user_id", userId!)
        .eq("day", today);
      return (data ?? []).map((a: any) => a.site_id).filter(Boolean) as string[];
    },
  });

  const todaySet = new Map<string, true>();
  (todayAssignments ?? []).forEach((id) => todaySet.set(id, true));

  const TABS = [
    { key: "geplant" as const, label: "Geplant" },
    { key: "in_arbeit" as const, label: "In Bearbeitung" },
    { key: "fertig" as const, label: "Fertig" },
    { key: "archiviert" as const, label: "Archiviert" },
  ];

  function matchesTab(s: any) {
    if (s.archived_at) return tab === "archiviert";
    if (tab === "archiviert") return false;
    if (tab === "geplant") return ["anfrage", "angebot", "beauftragt", "geplant"].includes(s.status);
    if (tab === "in_arbeit") return s.status === "in_arbeit";
    if (tab === "fertig") return ["abgeschlossen", "abgerechnet"].includes(s.status);
    return true;
  }

  const counts = {
    geplant: 0,
    in_arbeit: 0,
    fertig: 0,
    archiviert: 0,
  } as Record<string, number>;
  for (const s of sites) {
    if (s.archived_at) counts.archiviert++;
    else if (["anfrage", "angebot", "beauftragt", "geplant"].includes(s.status)) counts.geplant++;
    else if (s.status === "in_arbeit") counts.in_arbeit++;
    else if (["abgeschlossen", "abgerechnet"].includes(s.status)) counts.fertig++;
  }

  const filtered = sites.filter(matchesTab).filter((s) => {
    if (!q.trim()) return true;
    const hay = `${s.name ?? ""} ${s.adresse ?? ""} ${s.beschreibung ?? ""}`.toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((t) => hay.includes(t));
  });

  const showHeute = tab !== "archiviert";
  const heute = showHeute ? filtered.filter((s) => todaySet.has(s.id)) : [];
  const weitere = showHeute ? filtered.filter((s) => !todaySet.has(s.id)) : filtered;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suchen …"
          className="h-11 rounded-xl bg-muted/60 pl-10 border-transparent"
        />
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "opacity-60"}`}>{counts[t.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {heute.length > 0 && (
        <Section title="Heute zugeteilt">
          {heute.map((s, i) => (
            <SiteRow key={s.id} site={s} color={s.color || ROW_COLORS[i % ROW_COLORS.length]} canArchive={canArchive} onArchive={onArchive} onUnarchive={onUnarchive} />
          ))}
        </Section>
      )}

      {weitere.length > 0 && (
        <Section title={heute.length > 0 ? "Weitere Baustellen" : TABS.find((t) => t.key === tab)!.label}>
          {weitere.map((s, i) => (
            <SiteRow key={s.id} site={s} color={s.color || ROW_COLORS[(i + heute.length) % ROW_COLORS.length]} canArchive={canArchive} onArchive={onArchive} onUnarchive={onUnarchive} />
          ))}
        </Section>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          <Briefcase className="mx-auto mb-2 h-8 w-8" />
          {q ? "Keine Treffer." : "Keine Baustellen in dieser Ansicht."}{" "}
          {!q && canCreate && tab !== "archiviert" && (
            <button onClick={onCreate} className="text-brand hover:underline">Neu anlegen</button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl bg-card shadow-card divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function SiteRow({ site, color, canArchive, onArchive, onUnarchive }: { site: any; color: string; canArchive: boolean; onArchive: (id: string) => void; onUnarchive: (id: string) => void }) {
  const { line1, line2 } = splitAddress(site.adresse, site.name);
  const isArchived = !!site.archived_at;
  return (
    <div className="group relative flex items-center gap-3 px-3 py-3">
      <Link
        to="/app/baustellen/$id"
        params={{ id: site.id }}
        className="flex flex-1 min-w-0 items-center gap-3"
      >
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: color, opacity: isArchived ? 0.6 : 1 }}
        >
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-foreground">{line1}</div>
          {line2 && <div className="truncate text-sm text-muted-foreground">{line2}</div>}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </Link>
      {canArchive && (
        <button
          onClick={() => (isArchived ? onUnarchive(site.id) : onArchive(site.id))}
          className="opacity-0 group-hover:opacity-100 transition rounded-md p-1 text-muted-foreground hover:text-foreground"
          title={isArchived ? "Wiederherstellen" : "Archivieren"}
        >
          <Archive className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function splitAddress(adresse?: string | null, fallback?: string | null): { line1: string; line2: string } {
  const src = (adresse || fallback || "").trim();
  if (!src) return { line1: "—", line2: "" };
  const parts = src.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { line1: parts[0], line2: parts.slice(1).join(", ") };
  return { line1: src, line2: "" };
}


