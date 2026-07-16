import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
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
import { ArrowLeft } from "lucide-react";

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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Baustelleninformationen</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SiteInfo site={site} canEdit={canEdit} onSaved={() => setInfoOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------------- Info ---------------- */

function SiteInfo({ site, canEdit, onSaved }: { site: any; canEdit: boolean; onSaved?: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: site.name ?? "",
    adresse: site.adresse ?? "",
    beschreibung: site.beschreibung ?? "",
    status: site.archived_at ? "archiviert" : (site.status ?? "geplant"),
    start_date: site.start_date ?? "",
    end_date: site.end_date ?? "",
  });

  async function save() {
    const isArchived = form.status === "archiviert";
    const { error } = await supabase
      .from("sites")
      .update({
        name: form.name,
        adresse: form.adresse || null,
        beschreibung: form.beschreibung || null,
        status: (isArchived ? (site.status ?? "abgeschlossen") : form.status) as never,
        archived_at: isArchived ? (site.archived_at ?? new Date().toISOString()) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      .eq("id", site.id);
    if (error) return toast.error(error.message);
    toast.success("Gespeichert");
    qc.invalidateQueries({ queryKey: ["site", site.id] });
    qc.invalidateQueries({ queryKey: ["sites"] });
    onSaved?.();
  }

  return (
    <div className="grid gap-4">
      <div><Label>Name</Label><Input disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Adresse</Label><Input disabled={!canEdit} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Start</Label><Input disabled={!canEdit} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
        <div><Label>Ende</Label><Input disabled={!canEdit} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
      </div>
      <div>
        <Label>Status</Label>
        <Select disabled={!canEdit} value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SITE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Beschreibung</Label><Textarea disabled={!canEdit} rows={4} value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} /></div>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">Speichern</Button>
        </div>
      )}
    </div>
  );
}
