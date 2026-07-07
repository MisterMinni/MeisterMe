import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PROJECT_STATUS, GEWERKE, formatEur, formatDate } from "@/lib/handwerk";
import { estimateMaterialFromMeasurement } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Ruler, Camera, ClipboardList, FileText, Receipt, ListTodo, Trash2, Sparkles, Upload, MessageCircle } from "lucide-react";
import { ProjectChat } from "@/components/ProjectChat";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/projekte/$id")({
  head: () => ({ meta: [{ title: "Projekt – MeisterMe" }] }),
  component: ProjektDetail,
});

function ProjektDetail() {
  const { id } = useParams({ from: "/_authenticated/app/projekte/$id" });
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: p } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => (await supabase.from("projects").select("*, customers(id, firma, ansprechpartner, email)").eq("id", id).maybeSingle()).data,
  });

  async function updateStatus(v: string) {
    const { error } = await supabase.from("projects").update({ status: v as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status geändert");
    qc.invalidateQueries({ queryKey: ["project", id] });
  }

  async function del() {
    if (!confirm("Projekt und alle zugehörigen Daten löschen?")) return;
    await supabase.from("projects").delete().eq("id", id);
    toast.success("Gelöscht");
    nav({ to: "/app/projekte" });
  }

  if (!p) return <div className="text-muted-foreground">Lade…</div>;

  return (
    <div>
      <Link to="/app/projekte" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader
        title={p.name}
        subtitle={`${(p.customers as any)?.firma ?? "—"} · ${GEWERKE.find((g) => g.value === p.gewerk)?.label}`}
        action={
          <>
            <Select value={p.status as string} onValueChange={updateStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{PROJECT_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          </>
        }
      />

      <Tabs defaultValue="uebersicht">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="aufmass"><Ruler className="mr-1 h-3 w-3" /> Aufmaß</TabsTrigger>
          <TabsTrigger value="angebote"><FileText className="mr-1 h-3 w-3" /> Angebote</TabsTrigger>
          <TabsTrigger value="berichte"><ClipboardList className="mr-1 h-3 w-3" /> Berichte</TabsTrigger>
          <TabsTrigger value="fotos"><Camera className="mr-1 h-3 w-3" /> Fotos</TabsTrigger>
          <TabsTrigger value="aufgaben"><ListTodo className="mr-1 h-3 w-3" /> Aufgaben</TabsTrigger>
          <TabsTrigger value="rechnung"><Receipt className="mr-1 h-3 w-3" /> Rechnung</TabsTrigger>
          <TabsTrigger value="chat"><MessageCircle className="mr-1 h-3 w-3" /> Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Baustelle">
              <Row label="Adresse" value={p.adresse} />
              <Row label="Start" value={formatDate(p.start_datum)} />
              <Row label="Ende" value={formatDate(p.end_datum)} />
              <Row label="Budget" value={p.budget ? formatEur(Number(p.budget)) : "—"} />
            </Card>
            <Card title="Beschreibung">
              <p className="text-sm whitespace-pre-wrap">{p.beschreibung || "—"}</p>
            </Card>
            <Card title="Kunde">
              {p.customers ? (
                <Link to={"/app/kunden/$id" as never} params={{ id: (p.customers as any).id } as never} className="hover:text-brand">
                  <div className="font-medium">{(p.customers as any).firma ?? (p.customers as any).ansprechpartner}</div>
                  <div className="text-xs text-muted-foreground">{(p.customers as any).email}</div>
                </Link>
              ) : <div className="text-sm text-muted-foreground">Kein Kunde zugeordnet</div>}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aufmass"><AufmassPanel projectId={id} gewerk={p.gewerk as string} /></TabsContent>
        <TabsContent value="angebote"><AngebotePanel projectId={id} customerId={p.customer_id} /></TabsContent>
        <TabsContent value="berichte"><BerichtePanel projectId={id} /></TabsContent>
        <TabsContent value="fotos"><FotoPanel projectId={id} /></TabsContent>
        <TabsContent value="aufgaben"><AufgabenPanel projectId={id} /></TabsContent>
        <TabsContent value="rechnung"><RechnungPanel projectId={id} customerId={p.customer_id} /></TabsContent>
        <TabsContent value="chat"><ProjectChat projectId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-3 font-display font-semibold">{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between border-b border-border py-1.5 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span>{value ?? "—"}</span></div>;
}

/* ============ AUFMASS ============ */
function AufmassPanel({ projectId, gewerk }: { projectId: string; gewerk: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: rows } = useQuery({
    queryKey: ["measurements", projectId],
    queryFn: async () => (await supabase.from("measurements").select("*").eq("project_id", projectId).order("created_at")).data ?? [],
  });
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <div className="text-sm text-muted-foreground">Räume und Flächen für dieses Projekt.</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Aufmaß</Button></DialogTrigger>
          <AufmassForm projectId={projectId} gewerk={gewerk} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["measurements", projectId] }); }} />
        </Dialog>
      </div>
      {rows && rows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left"><tr>
              <th className="p-3">Bereich</th><th className="p-3">L×B×H</th><th className="p-3">Wand m²</th><th className="p-3">Decke m²</th><th className="p-3">Umfang</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.bereich}</td>
                  <td className="p-3 text-muted-foreground">{r.laenge}×{r.breite}×{r.hoehe} m</td>
                  <td className="p-3">{Number(r.wandflaeche ?? 0).toFixed(2)}</td>
                  <td className="p-3">{Number(r.deckenflaeche ?? 0).toFixed(2)}</td>
                  <td className="p-3">{Number(r.umfang ?? 0).toFixed(2)} m</td>
                  <td className="p-3 text-right">
                    <button onClick={async () => { await supabase.from("measurements").delete().eq("id", r.id); qc.invalidateQueries({ queryKey: ["measurements", projectId] }); }}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Noch kein Aufmaß erfasst.</div>}
    </div>
  );
}

function AufmassForm({ projectId, gewerk, onDone }: { projectId: string; gewerk: string; onDone: () => void }) {
  const [f, setF] = useState({ bereich: "", laenge: "3", breite: "4", hoehe: "2.5", abzug: "0", notizen: "" });
  const estimate = useServerFn(estimateMaterialFromMeasurement);
  const [suggest, setSuggest] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const l = Number(f.laenge) || 0;
  const b = Number(f.breite) || 0;
  const h = Number(f.hoehe) || 0;
  const abzug = Number(f.abzug) || 0;
  const umfang = 2 * (l + b);
  const wand = Math.max(0, umfang * h - abzug);
  const decke = l * b;
  const boden = l * b;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const { error } = await supabase.from("measurements").insert({
      tenant_id: p!.tenant_id as string,
      project_id: projectId,
      bereich: f.bereich || "Raum",
      laenge: l,
      breite: b,
      hoehe: h,
      wandflaeche: wand,
      deckenflaeche: decke,
      bodenflaeche: boden,
      umfang,
      abzuege: [{ typ: "Fenster/Türen", m2: abzug }] as any,
      notizen: f.notizen || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Aufmaß gespeichert");
    onDone();
  }

  async function aiEstimate() {
    setLoadingAi(true);
    try {
      const res = await estimate({ data: { gewerk, bereich: f.bereich || "Raum", wandflaeche: wand, deckenflaeche: decke, bodenflaeche: boden, umfang } });
      setSuggest(res);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoadingAi(false); }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Neues Aufmaß</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-3">
        <div><Label>Bereich / Raum</Label><Input value={f.bereich} onChange={(e) => setF({ ...f, bereich: e.target.value })} placeholder="z.B. Wohnzimmer, Fassade Nord" /></div>
        <div className="grid grid-cols-4 gap-2">
          <div><Label>Länge (m)</Label><Input type="number" step="0.01" value={f.laenge} onChange={(e) => setF({ ...f, laenge: e.target.value })} /></div>
          <div><Label>Breite (m)</Label><Input type="number" step="0.01" value={f.breite} onChange={(e) => setF({ ...f, breite: e.target.value })} /></div>
          <div><Label>Höhe (m)</Label><Input type="number" step="0.01" value={f.hoehe} onChange={(e) => setF({ ...f, hoehe: e.target.value })} /></div>
          <div><Label>Abzug (m²)</Label><Input type="number" step="0.01" value={f.abzug} onChange={(e) => setF({ ...f, abzug: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-secondary p-3 text-xs">
          <Stat label="Wand" value={`${wand.toFixed(2)} m²`} />
          <Stat label="Decke" value={`${decke.toFixed(2)} m²`} />
          <Stat label="Boden" value={`${boden.toFixed(2)} m²`} />
          <Stat label="Umfang" value={`${umfang.toFixed(2)} m`} />
        </div>
        <div><Label>Notizen</Label><Textarea value={f.notizen} onChange={(e) => setF({ ...f, notizen: e.target.value })} rows={2} /></div>

        <div className="rounded-xl border border-brand/30 bg-brand/5 p-3">
          <Button type="button" variant="outline" size="sm" onClick={aiEstimate} disabled={loadingAi} className="w-full">
            <Sparkles className="mr-1 h-4 w-4 text-brand" /> {loadingAi ? "KI rechnet…" : "Materialbedarf mit KI schätzen"}
          </Button>
          {suggest?.positionen && suggest.positionen.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {suggest.positionen.map((s: any, i: number) => (
                <li key={i} className="flex justify-between"><span>{s.bezeichnung}</span><span className="font-semibold">{s.menge} {s.einheit}</span></li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">Speichern</Button>
      </form>
    </DialogContent>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-muted-foreground">{label}</div><div className="font-display font-bold">{value}</div></div>;
}

/* ============ ANGEBOTE Panel ============ */
function AngebotePanel({ projectId, customerId }: { projectId: string; customerId: string | null }) {
  const qc = useQueryClient();
  const { data: offers } = useQuery({
    queryKey: ["project-offers", projectId],
    queryFn: async () => (await supabase.from("offers").select("*").eq("project_id", projectId)).data ?? [],
  });
  async function create() {
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    const nr = `AN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data, error } = await supabase.from("offers").insert({
      tenant_id: p!.tenant_id as string,
      project_id: projectId,
      customer_id: customerId,
      nummer: nr,
      status: "entwurf",
    }).select("id").single();
    if (error) return toast.error(error.message);
    window.location.href = `/app/angebote/${data.id}`;
    qc.invalidateQueries({ queryKey: ["project-offers", projectId] });
  }
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <div className="text-sm text-muted-foreground">Angebote zu diesem Projekt.</div>
        <Button size="sm" onClick={create} className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Angebot</Button>
      </div>
      {offers && offers.length > 0 ? (
        <ul className="space-y-2">
          {offers.map((o) => (
            <li key={o.id}>
              <Link to={"/app/angebote/$id" as never} params={{ id: o.id } as never} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-brand">
                <div><div className="font-medium">{o.nummer}</div><div className="text-xs text-muted-foreground">{o.status}</div></div>
                <div className="font-semibold">{formatEur(o.brutto)}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyPanel text="Noch kein Angebot." />}
    </div>
  );
}

/* ============ BERICHTE Panel ============ */
function BerichtePanel({ projectId }: { projectId: string }) {
  const { data: reports } = useQuery({
    queryKey: ["project-reports", projectId],
    queryFn: async () => (await supabase.from("field_reports").select("*").eq("project_id", projectId).order("datum", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <div className="text-sm text-muted-foreground">Einsatzberichte des Teams.</div>
        <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link to="/app/berichte/neu" search={{ project: projectId } as never}><Plus className="mr-1 h-4 w-4" /> Bericht</Link>
        </Button>
      </div>
      {reports && reports.length > 0 ? (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link to={"/app/berichte/$id" as never} params={{ id: r.id } as never} className="block rounded-xl border border-border bg-card p-3 hover:border-brand">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{formatDate(r.datum)}</div>
                  <Badge variant="secondary">{r.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.taetigkeit || r.sprachnotiz}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyPanel text="Noch kein Bericht." />}
    </div>
  );
}

/* ============ FOTOS Panel ============ */
function FotoPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { data: photos } = useQuery({
    queryKey: ["project-photos", projectId],
    queryFn: async () => (await supabase.from("photos").select("*").eq("project_id", projectId).order("created_at", { ascending: false })).data ?? [],
  });

  async function upload(file: File, tag: string) {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
      const path = `${prof!.tenant_id}/${projectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("handwerk-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: url } = await supabase.storage.from("handwerk-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await supabase.from("photos").insert({
        tenant_id: prof!.tenant_id as string, project_id: projectId, url: url?.signedUrl ?? path, tag,
      });
      if (error) throw error;
      toast.success("Foto hochgeladen");
      qc.invalidateQueries({ queryKey: ["project-photos", projectId] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-brand hover:bg-navy/90">
          <Upload className="h-4 w-4" /> {uploading ? "Lade hoch…" : "Vorher-Foto"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "vorher")} />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
          <Upload className="h-4 w-4" /> {uploading ? "Lade hoch…" : "Nachher-Foto"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "nachher")} />
        </label>
      </div>
      {photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((ph) => (
            <div key={ph.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
              <img src={ph.url} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute top-2 left-2"><Badge variant={ph.tag === "nachher" ? "default" : "secondary"} className={ph.tag === "nachher" ? "bg-brand text-brand-foreground" : ""}>{ph.tag}</Badge></div>
            </div>
          ))}
        </div>
      ) : <EmptyPanel text="Noch keine Fotos." />}
    </div>
  );
}

/* ============ AUFGABEN Panel ============ */
function AufgabenPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("project_id", projectId).order("faellig_am")).data ?? [],
  });
  async function add() {
    if (!title) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();
    await supabase.from("tasks").insert({ tenant_id: p!.tenant_id as string, project_id: projectId, title, faellig_am: due || null });
    setTitle(""); setDue("");
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
  }
  async function toggle(id: string, done: boolean) {
    await supabase.from("tasks").update({ status: (done ? "erledigt" : "offen") as any }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
  }
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Input placeholder="Neue Aufgabe…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
        <Button onClick={add} className="bg-brand text-brand-foreground hover:bg-brand/90">Hinzufügen</Button>
      </div>
      {tasks && tasks.length > 0 ? (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <input type="checkbox" checked={t.status === "erledigt"} onChange={(e) => toggle(t.id, e.target.checked)} className="h-5 w-5 accent-brand" />
              <div className="flex-1">
                <div className={t.status === "erledigt" ? "line-through text-muted-foreground" : "font-medium"}>{t.title}</div>
                {t.faellig_am && <div className="text-xs text-muted-foreground">fällig {formatDate(t.faellig_am)}</div>}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyPanel text="Keine Aufgaben." />}
    </div>
  );
}

/* ============ RECHNUNG Panel ============ */
function RechnungPanel({ projectId, customerId }: { projectId: string; customerId: string | null }) {
  const qc = useQueryClient();
  const { data: drafts } = useQuery({
    queryKey: ["project-invoices", projectId],
    queryFn: async () => (await supabase.from("invoice_drafts").select("*").eq("project_id", projectId)).data ?? [],
  });
  async function create() {
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user!.id).single();

    // Sammle Zeiten und Material
    const { data: times } = await supabase.from("time_entries").select("minuten, taetigkeit").eq("project_id", projectId);
    const { data: reports } = await supabase.from("field_reports").select("material").eq("project_id", projectId);
    const totalMin = (times ?? []).reduce((s, t) => s + (t.minuten ?? 0), 0);
    const stunden = totalMin / 60;
    const positionen: any[] = [];
    if (stunden > 0) positionen.push({ text: "Arbeitszeit", menge: Number(stunden.toFixed(2)), einheit: "Std", ep: 55, gp: Number((stunden * 55).toFixed(2)) });
    for (const r of reports ?? []) {
      const mat = (r.material as any[]) ?? [];
      for (const m of mat) positionen.push({ text: m.bezeichnung ?? m.text ?? "Material", menge: m.menge ?? 1, einheit: m.einheit ?? "Stk", ep: 0, gp: 0 });
    }
    const netto = positionen.reduce((s, p) => s + (Number(p.gp) || 0), 0);
    const { data, error } = await supabase.from("invoice_drafts").insert({
      tenant_id: p!.tenant_id as string, project_id: projectId, customer_id: customerId,
      positionen: positionen as any, netto, brutto: netto * 1.19,
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Rechnungsgrundlage erstellt");
    qc.invalidateQueries({ queryKey: ["project-invoices", projectId] });
    window.location.href = `/app/rechnungsgrundlagen/${data.id}`;
  }
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <div className="text-sm text-muted-foreground">Sammle Zeiten und Material zu einer Rechnungsgrundlage.</div>
        <Button onClick={create} size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="mr-1 h-4 w-4" /> Erstellen</Button>
      </div>
      {drafts && drafts.length > 0 ? (
        <ul className="space-y-2">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link to={"/app/rechnungsgrundlagen/$id" as never} params={{ id: d.id } as never} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-brand">
                <div><div className="font-medium">Rechnung {formatDate(d.created_at)}</div><div className="text-xs text-muted-foreground">{d.status}</div></div>
                <div className="font-semibold">{formatEur(d.brutto)}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyPanel text="Noch keine Rechnungsgrundlage." />}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
