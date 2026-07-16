import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SITE_STATUS, useHasPermission, useProfile } from "@/lib/handwerk";
import { toast } from "sonner";
import { useSetPageHeader } from "@/components/page-header-context";
import { MapPin, CalendarDays, Activity, FileText, Check, Loader2, Camera, Images } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/baustellen/$id/info")({
  head: () => ({ meta: [{ title: "Baustelleninformationen – MeisterMe" }] }),
  component: InfoPage,
});

function InfoPage() {
  const { id } = Route.useParams();
  const canEdit = useHasPermission("sites:update");

  const { data: site } = useQuery({
    queryKey: ["site", id],
    queryFn: async () => {
      const { data } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  useSetPageHeader({
    title: "Baustelleninformationen",
    backTo: `/app/baustellen/${id}`,
  });

  if (!site) {
    return <p className="text-muted-foreground">Wird geladen …</p>;
  }

  return <SiteInfo site={site} canEdit={canEdit} siteId={id} />;
}

function parseAdresse(a: string | null) {
  if (!a) return { strasse: "", hausnr: "", plz: "" };
  const [left, right] = a.split(",").map((s) => s.trim());
  const parts = (left ?? "").split(" ");
  const hausnr = parts.length > 1 ? parts.pop()! : "";
  const strasse = parts.join(" ");
  return { strasse, hausnr, plz: right ?? "" };
}

function SiteInfo({ site, canEdit, siteId }: { site: any; canEdit: boolean; siteId: string }) {
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
    <div className="space-y-4 pb-8">
      <div className="flex h-5 items-center justify-end gap-1.5 text-xs text-muted-foreground">
        {saveState === "saving" && (<><Loader2 className="h-3 w-3 animate-spin" /> Wird gespeichert …</>)}
        {saveState === "saved" && (<><Check className="h-3 w-3 text-emerald-500" /> Gespeichert</>)}
      </div>

      <SiteAvatar site={site} />
      <MediaLink siteId={siteId} />

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

function MediaLink({ siteId }: { siteId: string }) {
  return (
    <Link
      to="/app/baustellen/$id/medien"
      params={{ id: siteId }}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-4 text-left shadow-sm hover:bg-secondary/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Images className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-semibold text-brand">Medien, Links, Doks</span>
      <span className="text-muted-foreground">›</span>
    </Link>
  );
}
