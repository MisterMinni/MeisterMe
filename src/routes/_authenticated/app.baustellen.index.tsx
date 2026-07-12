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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProfile, SITE_STATUS, useHasPermission } from "@/lib/handwerk";
import { toast } from "sonner";
import { Plus, Briefcase, Search, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/baustellen/")({
  head: () => ({ meta: [{ title: "Baustellen – MeisterMe" }] }),
  component: Baustellen,
});

const COLORS = ["#F26A21", "#0B1B34", "#0EA5E9", "#10B981", "#EAB308", "#8B5CF6", "#EF4444"];

function Baustellen() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canCreate = useHasPermission("sites:create");
  
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




  const [q, setQ] = useState("");
  const filtered = (sites ?? []).filter(
    (s) =>
      !q.trim() ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      (s.adresse ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Baustellen" subtitle="Aktive Projekte, Chat und Team." />

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suchen…"
          className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Sections */}
      {filtered.length > 0 ? (
        <ul className="space-y-2.5">
          {filtered.map((s) => {
            const color = s.color ?? "#F26A21";
            return (
              <li key={s.id}>
                <Link
                  to="/app/baustellen/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    <Briefcase className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[15px] font-semibold">
                      {s.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.adresse ?? SITE_STATUS.find((x) => x.value === s.status)?.label ?? "—"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          <Briefcase className="mx-auto mb-2 h-8 w-8" />
          {q ? "Keine Treffer." : "Noch keine Baustellen."}
        </div>
      )}

      {/* FAB */}
      {canCreate && (
        <>
          <button
            onClick={() => setOpenNew(true)}
            className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lift transition active:scale-95 hover:brightness-110"
            aria-label="Neue Baustelle"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
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
                  <div className="mt-1 flex flex-wrap gap-2">
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
        </>
      )}
    </div>
  );
}
