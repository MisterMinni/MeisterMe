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
import { useProfile, SITE_STATUS, formatDate, useHasPermission } from "@/lib/handwerk";
import { toast } from "sonner";
import { Briefcase, Archive, MessageSquare, Users, Clock, ArrowRight } from "lucide-react";

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
    queryKey: ["sites"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sites")
        .select("*")
        .is("archived_at", null)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create() {
    if (!profile?.tenant_id) return;
    if (!form.strasse || !form.hausnr || !form.plz) return toast.error("Adresse, HausNr. und PLZ eingeben");
    const adresse = `${form.strasse} ${form.hausnr}, ${form.plz}`.trim();
    const { error } = await supabase.from("sites").insert({
      tenant_id: profile.tenant_id,
      name: adresse,
      beschreibung: form.beschreibung || null,
      adresse,
      status: form.status as never,
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


  async function archive(id: string) {
    if (!confirm("Baustelle archivieren?")) return;
    const { error } = await supabase.from("sites").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Archiviert");
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

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>Abbrechen</Button>
              <Button onClick={create} className="bg-brand text-brand-foreground hover:bg-brand/90">Anlegen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}




      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(sites ?? []).map((s) => (
          <div key={s.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="h-2 w-full" style={{ backgroundColor: s.color ?? "#F26A21" }} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.status?.replace("_", " ") ?? "—"}</div>
                </div>
                <Briefcase className="h-5 w-5 shrink-0 text-brand" />
              </div>
              {s.adresse && <p className="mt-1 text-xs text-muted-foreground">{s.adresse}</p>}
              {s.beschreibung && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.beschreibung}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.start_date ? formatDate(s.start_date) : "—"} → {s.end_date ? formatDate(s.end_date) : "—"}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90">
                  <Link to="/app/baustellen/$id" params={{ id: s.id }}>
                    Öffnen <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
                {canArchive && (
                  <Button size="sm" variant="outline" onClick={() => archive(s.id)} title="Archivieren">
                    <Archive className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Chat</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Team</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Zeiten</span>
              </div>
            </div>
          </div>
        ))}
        {(!sites || sites.length === 0) && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
            <Briefcase className="mx-auto mb-2 h-8 w-8" />
            Noch keine Baustellen.{" "}
            {canCreate && (
              <button onClick={() => setOpenNew(true)} className="text-brand hover:underline">Erste anlegen</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
