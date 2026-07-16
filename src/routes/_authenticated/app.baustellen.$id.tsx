import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SITE_STATUS, useHasPermission } from "@/lib/handwerk";
import { toast } from "sonner";
import { ProjectChat } from "@/components/ProjectChat";
import { useSetPageHeader } from "@/components/page-header-context";
import { ArrowLeft, MapPin, CalendarDays, Activity, FileText, Check, Loader2, Camera, Search, Images, X } from "lucide-react";
import { useProfile } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/baustellen/$id")({
  head: () => ({ meta: [{ title: "Baustelle – MeisterMe" }] }),
  component: BaustelleDetail,
});

function BaustelleDetail() {
  const { id } = Route.useParams();
  const canEdit = useHasPermission("sites:update");
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: site } = useQuery({
    queryKey: ["site", id],
    queryFn: async () => {
      const { data } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const openInfo = useCallback(() => setInfoOpen(true), []);

  useSetPageHeader({
    title: site?.adresse || site?.name || "Baustelle",
    backTo: "/app/baustellen",
    onTitleClick: openInfo,
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
    <div className="-mx-4 -mt-4 lg:-mx-6 lg:-mt-6">
      <ProjectChat projectId={id} />

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-secondary p-0 sm:max-w-lg">
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
            <SheetTitle>Baustelleninformationen</SheetTitle>
          </SheetHeader>
          <div className="px-4 py-4 pb-8">
            <SiteInfo site={site} canEdit={canEdit} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------------- Info ---------------- */

function parseAdresse(a: string | null) {
  if (!a) return { strasse: "", hausnr: "", plz: "" };
  const [left, right] = a.split(",").map((s) => s.trim());
  const parts = (left ?? "").split(" ");
  const hausnr = parts.length > 1 ? parts.pop()! : "";
  const strasse = parts.join(" ");
  return { strasse, hausnr, plz: right ?? "" };
}

function SiteInfo({ site, canEdit }: { site: any; canEdit: boolean }) {
  const qc = useQueryClient();
  const parsed = parseAdresse(site.adresse);
  const [form, setForm] = useState({
    strasse: parsed.strasse,
    hausnr: parsed.hausnr,
    plz: parsed.plz,
    beschreibung: site.beschreibung ?? "",
    status: site.archived_at ? "archiviert" : (site.status ?? "geplant"),
    start_date: site.start_date ?? "",
    end_date: site.end_date ?? "",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const skipRef = useRef(true);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(async () => {
      const isArchived = form.status === "archiviert";
      const adresse = [form.strasse, form.hausnr].filter(Boolean).join(" ").trim();
      const adresseFull = [adresse, form.plz].filter(Boolean).join(", ").trim();
      const { error } = await supabase
        .from("sites")
        .update({
          adresse: adresseFull || null,
          beschreibung: form.beschreibung || null,
          status: (isArchived ? (site.status ?? "abgeschlossen") : form.status) as never,
          archived_at: isArchived ? (site.archived_at ?? new Date().toISOString()) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        })
        .eq("id", site.id);
      if (error) {
        setSaveState("idle");
        toast.error(error.message);
        return;
      }
      setSaveState("saved");
      qc.invalidateQueries({ queryKey: ["site", site.id] });
      qc.invalidateQueries({ queryKey: ["sites"] });
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 1500);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.strasse, form.hausnr, form.plz, form.beschreibung, form.status, form.start_date, form.end_date]);

  return (
    <div className="space-y-4">
      <div className="flex h-5 items-center justify-end gap-1.5 text-xs text-muted-foreground">
        {saveState === "saving" && (<><Loader2 className="h-3 w-3 animate-spin" /> Wird gespeichert …</>)}
        {saveState === "saved" && (<><Check className="h-3 w-3 text-emerald-500" /> Gespeichert</>)}
      </div>

      <SiteAvatar site={site} />
      <SiteMessageSearch projectId={site.id} />
      <SiteMediaButton projectId={site.id} />

      <Section icon={<MapPin className="h-4 w-4" />} title="Adresse">
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <Input disabled={!canEdit} value={form.strasse} onChange={(e) => setForm({ ...form, strasse: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">HausNr.</Label>
            <Input disabled={!canEdit} value={form.hausnr} onChange={(e) => setForm({ ...form, hausnr: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">PLZ</Label>
          <Input disabled={!canEdit} inputMode="numeric" value={form.plz} onChange={(e) => setForm({ ...form, plz: e.target.value })} />
        </div>
      </Section>

      <Section icon={<CalendarDays className="h-4 w-4" />} title="Zeitraum">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Start</Label>
            <Input disabled={!canEdit} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ende</Label>
            <Input disabled={!canEdit} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section icon={<Activity className="h-4 w-4" />} title="Status">
        <Select disabled={!canEdit} value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SITE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Section>

      <Section icon={<FileText className="h-4 w-4" />} title="Beschreibung">
        <Textarea disabled={!canEdit} rows={4} value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} placeholder="Notizen zur Baustelle …" />
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10">{icon}</span>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ---------------- Avatar ---------------- */

function SiteAvatar({ site }: { site: any }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!site.image_url) { setSignedUrl(null); return; }
      const { data } = await supabase.storage.from("chat-images").createSignedUrl(site.image_url, 60 * 60);
      if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [site.image_url]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile?.tenant_id) return;
    if (!file.type.startsWith("image/")) { toast.error("Nur Bilder erlaubt"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/site-avatar/${site.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("sites").update({ image_url: path }).eq("id", site.id);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["site", site.id] });
    qc.invalidateQueries({ queryKey: ["sites"] });
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand text-2xl font-bold text-brand-foreground shadow-md">
          {signedUrl ? (
            <img src={signedUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <MapPin className="h-8 w-8" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-brand text-brand-foreground shadow-sm hover:bg-brand/90 disabled:opacity-50"
          aria-label="Bild ändern"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}

/* ---------------- Message Search ---------------- */

function SiteMessageSearch({ projectId }: { projectId: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; body: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("project_messages")
        .select("id, body, created_at")
        .eq("project_id", projectId)
        .not("body", "is", null)
        .ilike("body", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      setResults((data ?? []) as any);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, projectId]);

  return (
    <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nachrichten durchsuchen …"
          className="pl-9 pr-9"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            aria-label="Zurücksetzen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {q.trim().length >= 2 && (
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {loading && <div className="py-2 text-center text-xs text-muted-foreground">Suche …</div>}
          {!loading && results.length === 0 && (
            <div className="py-2 text-center text-xs text-muted-foreground">Keine Treffer</div>
          )}
          {results.map((r) => (
            <div key={r.id} className="rounded-lg bg-secondary/50 p-2 text-xs">
              <div className="line-clamp-2 text-foreground">{r.body}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(r.created_at))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Media ---------------- */

function SiteMediaButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ path: string; url: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("project_messages")
      .select("image_url")
      .eq("project_id", projectId)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(60);
    const paths = (data ?? []).map((d: any) => d.image_url).filter(Boolean);
    if (paths.length === 0) { setItems([]); setLoading(false); return; }
    const { data: signed } = await supabase.storage.from("chat-images").createSignedUrls(paths, 60 * 60);
    setItems((signed ?? []).filter((s) => s.signedUrl).map((s) => ({ path: s.path!, url: s.signedUrl! })));
    setLoading(false);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) load();
  }

  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-secondary/40"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Images className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-brand">Medien, Links, Doks</span>
        <span className="text-xs text-muted-foreground">{items ? items.length : ""}</span>
      </button>
      {open && (
        <div className="border-t border-border p-3">
          {loading && <div className="py-4 text-center text-xs text-muted-foreground">Lädt …</div>}
          {!loading && items && items.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">Noch keine Medien</div>
          )}
          {!loading && items && items.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((it) => (
                <a
                  key={it.path}
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-lg bg-secondary"
                >
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
