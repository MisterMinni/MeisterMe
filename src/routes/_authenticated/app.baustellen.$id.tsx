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
import { ArrowLeft, MapPin, CalendarDays, Activity, FileText, Check, Loader2 } from "lucide-react";

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
