import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FabAdd } from "@/components/fab-add";
import { useProfile, formatDate } from "@/lib/handwerk";
import { toast } from "sonner";
import { UserX, Check, X } from "lucide-react";

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

const STATUS_LABEL: Record<string, string> = {
  entwurf: "Entwurf",
  eingereicht: "Eingereicht",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
};

function Abwesenheiten() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
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

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mitarbeiter</th>
              <th className="px-4 py-3">Art</th>
              <th className="px-4 py-3">Zeitraum</th>
              <th className="px-4 py-3">Tage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => {
              const person = (r as unknown as { profiles: { full_name?: string } | null }).profiles;
              const canReview = r.status === "eingereicht";
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{person?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{TYPES.find((t) => t.value === r.type)?.label ?? r.type}</td>
                  <td className="px-4 py-3">{formatDate(r.start_date)} – {formatDate(r.end_date)}</td>
                  <td className="px-4 py-3">{r.days_calculated ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        r.status === "genehmigt"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : r.status === "abgelehnt"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-brand/10 text-brand"
                      }
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canReview && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => review(r.id, "genehmigt")}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => review(r.id, "abgelehnt")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <UserX className="mx-auto mb-2 h-6 w-6" />
                  Noch keine Anträge.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <FabAdd label="Neuer Antrag" onClick={() => setOpen(true)} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Abwesenheits-Antrag</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Art</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Notiz</Label>
              <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">Einreichen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
