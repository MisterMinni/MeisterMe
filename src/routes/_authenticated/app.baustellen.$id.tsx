import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, SITE_STATUS, formatDate, useHasPermission } from "@/lib/handwerk";
import { toast } from "sonner";
import { ProjectChat } from "@/components/ProjectChat";
import { ArrowLeft, MessageSquare, Users, Clock, Info, UserPlus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/baustellen/$id")({
  head: () => ({ meta: [{ title: "Baustelle – MeisterMe" }] }),
  component: BaustelleDetail,
});

type Tab = "chat" | "team" | "zeiten" | "info";

function BaustelleDetail() {
  const { id } = Route.useParams();
  const [tab, setTab] = useState<Tab>("chat");
  const canEdit = useHasPermission("sites:update");

  const { data: site } = useQuery({
    queryKey: ["site", id],
    queryFn: async () => {
      const { data } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  if (!site) {
    return (
      <div>
        <Button asChild variant="outline" size="sm"><Link to="/app/baustellen"><ArrowLeft className="mr-1 h-4 w-4" /> Zurück</Link></Button>
        <p className="mt-6 text-muted-foreground">Baustelle wird geladen …</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={site.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: site.color ?? "#0B1B34" }} />
              {SITE_STATUS.find((s) => s.value === site.status)?.label ?? site.status}
            </span>
            {site.adresse && <span>· {site.adresse}</span>}
            <span>· {site.start_date ? formatDate(site.start_date) : "?"} → {site.end_date ? formatDate(site.end_date) : "?"}</span>
          </span>
        }
        action={
          <Button asChild variant="outline" size="sm"><Link to="/app/baustellen"><ArrowLeft className="mr-1 h-4 w-4" /> Alle Baustellen</Link></Button>
        }
      />

      <div className="mb-4 flex overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-card">
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare}>Chat</TabBtn>
        <TabBtn active={tab === "team"} onClick={() => setTab("team")} icon={Users}>Team</TabBtn>
        <TabBtn active={tab === "zeiten"} onClick={() => setTab("zeiten")} icon={Clock}>Zeiten</TabBtn>
        <TabBtn active={tab === "info"} onClick={() => setTab("info")} icon={Info}>Info</TabBtn>
      </div>

      {tab === "chat" && <ProjectChat projectId={id} />}
      {tab === "team" && <SiteTeam siteId={id} canEdit={canEdit} />}
      {tab === "zeiten" && <SiteTimes siteId={id} />}
      {tab === "info" && <SiteInfo site={site} canEdit={canEdit} />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

/* ---------------- Team tab ---------------- */

function SiteTeam({ siteId, canEdit }: { siteId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [addUser, setAddUser] = useState("");

  const { data: members } = useQuery({
    queryKey: ["site-members", siteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_members")
        .select("user_id, role_on_site, added_at, profiles(full_name)")
        .eq("site_id", siteId);
      return (data ?? []) as unknown as { user_id: string; role_on_site: string | null; added_at: string; profiles: { full_name: string | null } | null }[];
    },
  });

  const { data: candidates } = useQuery({
    queryKey: ["site-team-candidates", profile?.tenant_id, siteId, (members ?? []).map((m) => m.user_id).join(",")],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("tenant_id", profile!.tenant_id!)
        .is("disabled_at", null)
        .order("full_name");
      const taken = new Set((members ?? []).map((m) => m.user_id));
      return (data ?? []).filter((p) => !taken.has(p.id));
    },
  });

  async function add() {
    if (!addUser) return;
    const { error } = await supabase.from("site_members").insert({ site_id: siteId, user_id: addUser });
    if (error) return toast.error(error.message);
    setAddUser("");
    qc.invalidateQueries({ queryKey: ["site-members", siteId] });
    toast.success("Mitarbeiter zugeordnet");
  }

  async function remove(userId: string) {
    const { error } = await supabase.from("site_members").delete().eq("site_id", siteId).eq("user_id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["site-members", siteId] });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
          <Select value={addUser} onValueChange={setAddUser}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Mitarbeiter wählen …" /></SelectTrigger>
            <SelectContent>
              {(candidates ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? "—"}</SelectItem>)}
              {(!candidates || candidates.length === 0) && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Alle Mitarbeiter sind bereits zugeordnet.</div>
              )}
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={!addUser} className="bg-brand text-brand-foreground hover:bg-brand/90">
            <UserPlus className="mr-1 h-4 w-4" /> Hinzufügen
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-2 shadow-card">
        {(members ?? []).length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Noch kein Team zugewiesen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{m.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">seit {formatDate(m.added_at)}</div>
                </div>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => remove(m.user_id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Zeiten tab ---------------- */

function SiteTimes({ siteId }: { siteId: string }) {
  const { data: entries } = useQuery({
    queryKey: ["site-times", siteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("time_entries")
        .select("id, start_ts, end_ts, minuten, taetigkeit, notiz, user_id, status, profiles(full_name)")
        .eq("project_id", siteId)
        .order("start_ts", { ascending: false })
        .limit(100);
      return (data ?? []) as unknown as { id: string; start_ts: string | null; end_ts: string | null; minuten: number | null; taetigkeit: string | null; notiz: string | null; status: string; profiles: { full_name: string | null } | null }[];
    },
  });

  const total = (entries ?? []).reduce((sum, e) => sum + (e.minuten ?? 0), 0);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Erfasste Einträge" value={String((entries ?? []).length)} />
        <Stat label="Summe Stunden" value={`${hrs}h ${mins}m`} />
        <Stat label="Offene Einträge" value={String((entries ?? []).filter((e) => e.status === "active").length)} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {(entries ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Noch keine Zeiten auf dieser Baustelle.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Datum</th>
                <th className="px-4 py-2">Mitarbeiter</th>
                <th className="px-4 py-2">Tätigkeit</th>
                <th className="px-4 py-2 text-right">Dauer</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((e) => {
                const m = e.minuten ?? 0;
                return (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2">{e.start_ts ? formatDate(e.start_ts) : "—"}</td>
                    <td className="px-4 py-2">{e.profiles?.full_name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{e.taetigkeit ?? e.notiz ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono">{Math.floor(m / 60)}h {m % 60}m</td>
                    <td className="px-4 py-2 text-xs">{e.status === "active" ? <span className="rounded bg-brand/10 px-2 py-0.5 text-brand">läuft</span> : e.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

/* ---------------- Info tab ---------------- */

function SiteInfo({ site, canEdit }: { site: any; canEdit: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: site.name ?? "",
    adresse: site.adresse ?? "",
    beschreibung: site.beschreibung ?? "",
    status: site.status ?? "geplant",
    start_date: site.start_date ?? "",
    end_date: site.end_date ?? "",
  });

  async function save() {
    const { error } = await supabase
      .from("sites")
      .update({
        name: form.name,
        adresse: form.adresse || null,
        beschreibung: form.beschreibung || null,
        status: form.status as never,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      .eq("id", site.id);
    if (error) return toast.error(error.message);
    toast.success("Gespeichert");
    qc.invalidateQueries({ queryKey: ["site", site.id] });
    qc.invalidateQueries({ queryKey: ["sites"] });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Name</Label><Input disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Adresse</Label><Input disabled={!canEdit} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
        <div><Label>Start</Label><Input disabled={!canEdit} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
        <div><Label>Ende</Label><Input disabled={!canEdit} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
        <div className="md:col-span-2">
          <Label>Status</Label>
          <Select disabled={!canEdit} value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SITE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Beschreibung</Label><Textarea disabled={!canEdit} rows={4} value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} /></div>
      </div>
      {canEdit && (
        <div className="mt-4 flex justify-end">
          <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">Speichern</Button>
        </div>
      )}
    </div>
  );
}
