import { createFileRoute } from "@tanstack/react-router";
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
import { useProfile, useHasPermission, formatDate } from "@/lib/handwerk";
import { toast } from "sonner";
import { Plus, UserX, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/abwesenheiten")({
  head: () => ({ meta: [{ title: "Abwesenheiten – MeisterMe" }] }),
  component: Abwesenheiten,
});

const TYPES = [
  { value: "urlaub", label: "Urlaub" },
  { value: "krank", label: "Krank" },
  { value: "sonderurlaub", label: "Sonderurlaub" },
  { value: "berufsschule", label: "Berufsschule" },
  { value: "sonstige", label: "Sonstige" },
];

type Status = "eingereicht" | "genehmigt" | "abgelehnt";
const TABS: { key: Status; label: string }[] = [
  { key: "eingereicht", label: "Offen" },
  { key: "genehmigt", label: "Genehmigt" },
  { key: "abgelehnt", label: "Abgelehnt" },
];

function Abwesenheiten() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const canApprove = useHasPermission("absences:approve");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Status>("eingereicht");
  const [form, setForm] = useState({ type: "urlaub", start_date: "", end_date: "", note: "" });

  const { data: rows } = useQuery({
    queryKey: ["absences"],
    queryFn: async () => {
      const { data } = await supabase
        .from("absences")
        .select("*, profiles!absences_user_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit() {
    if (!form.start_date || !form.end_date || !profile?.tenant_id) return toast.error("Datum wählen");
    const days = Math.max(
      1,
      Math.round((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1,
    );
    const { error } = await supabase.from("absences").insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date,
      days_calculated: days,
      note: form.note || null,
      status: "eingereicht",
    });
    if (error) return toast.error(error.message);
    toast.success("Antrag eingereicht");
    setOpen(false);
    setForm({ type: "urlaub", start_date: "", end_date: "", note: "" });
    qc.invalidateQueries({ queryKey: ["absences"] });
  }

  async function review(id: string, status: "genehmigt" | "abgelehnt") {
    const { error } = await supabase
      .from("absences")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: profile?.id ?? null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "genehmigt" ? "Genehmigt" : "Abgelehnt");
    qc.invalidateQueries({ queryKey: ["absences"] });
  }

  const filtered = (rows ?? []).filter((r) => r.status === tab);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Abwesenheiten"
        subtitle="Urlaub, Krank, Anträge & Übersicht."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Plus className="mr-1 h-4 w-4" /> Antrag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neuer Antrag</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Abwesenheitsart</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Von *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>Bis *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                </div>
                <div><Label>Notiz (optional)</Label><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Antrag senden</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
          <UserX className="mx-auto mb-2 h-6 w-6" />
          Keine Anträge in dieser Ansicht.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((r) => {
            const person = (r as unknown as { profiles: { full_name?: string } | null }).profiles;
            const typeLabel = TYPES.find((t) => t.value === r.type)?.label ?? r.type;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                    {(person?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate font-display text-[15px] font-semibold">
                        {person?.full_name ?? "—"}
                      </div>
                      <div className="shrink-0 text-xs font-medium text-brand">{typeLabel}</div>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {formatDate(r.start_date)} – {formatDate(r.end_date)}
                      <span className="ml-2 text-xs">· {r.days_calculated ?? "?"} Tage</span>
                    </div>
                    {r.note && (
                      <div className="mt-2 text-xs text-muted-foreground">„{r.note}"</div>
                    )}
                  </div>
                  {canApprove && r.status === "eingereicht" && (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        onClick={() => review(r.id, "genehmigt")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 transition hover:bg-emerald-500/20"
                        aria-label="Genehmigen"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => review(r.id, "abgelehnt")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                        aria-label="Ablehnen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
