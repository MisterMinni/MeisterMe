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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProfile, SITE_STATUS, formatDate, useHasPermission } from "@/lib/handwerk";
import { toast } from "sonner";
import { Plus, Briefcase, Archive, MessageSquare, Users, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/baustellen")({
  head: () => ({ meta: [{ title: "Baustellen – MeisterMe" }] }),
  component: Baustellen,
});

const COLORS = ["#F26A21", "#0B1B34", "#0EA5E9", "#10B981", "#EAB308", "#8B5CF6", "#EF4444"];

function Baustellen() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canCreate = useHasPermission("sites:create");
  const canArchive = useHasPermission("sites:update");
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    name: "",
    beschreibung: "",
    status: "geplant",
    color: COLORS[0],
    start_date: "",
    end_date: "",
    adresse: "",
  });

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
    if (!form.name || !profile?.tenant_id) return toast.error("Name eingeben");
    const { error } = await supabase.from("sites").insert({
      tenant_id: profile.tenant_id,
      name: form.name,
      beschreibung: form.beschreibung || null,
      adresse: form.adresse || null,
      status: form.status as never,
      color: form.color,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      gewerk: "ausbau" as never,
    });
    if (error) return toast.error(error.message);
    toast.success("Baustelle angelegt");
    setOpenNew(false);
    setForm({ name: "", beschreibung: "", status: "geplant", color: COLORS[0], start_date: "", end_date: "", adresse: "" });
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
      <PageHeader
        title="Baustellen"
        subtitle="Aktive Projekte mit Team, Chat und Zeiterfassung."
        action={
          canCreate ? (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                  <Plus className="mr-1 h-4 w-4" /> Neue Baustelle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neue Baustelle</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Adresse</Label><Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
                  <div><Label>Kurzbeschreibung</Label><Textarea rows={2} value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div><Label>Ende</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SITE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Farbe</Label>
                    <div className="mt-1 flex gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm({ ...form, color: c })}
                          className={`h-8 w-8 rounded-full ring-2 transition ${form.color === c ? "ring-foreground" : "ring-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>Abbrechen</Button>
                  <Button onClick={create} className="bg-brand text-brand-foreground hover:bg-brand/90">Anlegen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

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
