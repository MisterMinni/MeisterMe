import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile, useSession, useIsAdmin, formatDate } from "@/lib/handwerk";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/profil/daten")({
  head: () => ({ meta: [{ title: "Persönliche Daten – MeisterMe" }] }),
  component: DatenPage,
});

function DatenPage() {
  const { data: profile } = useProfile();
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const canEdit = isAdmin;

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    employee_number: "",
    entry_date: "",
    exit_date: "",
    weekly_hours: "",
    work_time_model: "",
    vacation_days_per_year: "",
    cost_center: "",
    subgroup: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      employee_number: profile.employee_number ?? "",
      entry_date: profile.entry_date ?? "",
      exit_date: profile.exit_date ?? "",
      weekly_hours: profile.weekly_hours != null ? String(profile.weekly_hours) : "",
      work_time_model: profile.work_time_model ?? "",
      vacation_days_per_year:
        profile.vacation_days_per_year != null ? String(profile.vacation_days_per_year) : "",
      cost_center: profile.cost_center ?? "",
      subgroup: profile.subgroup ?? "",
    });
  }, [profile]);

  async function save() {
    if (!profile?.id) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        address: form.address || null,
        employee_number: form.employee_number || null,
        entry_date: form.entry_date || null,
        exit_date: form.exit_date || null,
        weekly_hours: form.weekly_hours ? Number(form.weekly_hours) : null,
        work_time_model: form.work_time_model || null,
        vacation_days_per_year: form.vacation_days_per_year
          ? Number(form.vacation_days_per_year)
          : null,
        cost_center: form.cost_center || null,
        subgroup: form.subgroup || null,
      })
      .eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Gespeichert");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {!canEdit && (
        <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          Nur Ansicht – Änderungen können nur vom Betriebsadmin vorgenommen werden.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kontakt
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input
              disabled={!canEdit}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="E-Mail">
            <Input disabled value={session?.user?.email ?? ""} />
          </Field>
          <Field label="Telefon">
            <Input
              disabled={!canEdit}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Adresse">
            <Input
              disabled={!canEdit}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Beschäftigung
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Personalnummer">
            <Input
              disabled={!canEdit}
              value={form.employee_number}
              onChange={(e) => setForm({ ...form, employee_number: e.target.value })}
            />
          </Field>
          <Field label="Kostenstelle">
            <Input
              disabled={!canEdit}
              value={form.cost_center}
              onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
            />
          </Field>
          <Field label="Eintritt">
            {canEdit ? (
              <Input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              />
            ) : (
              <ReadOnlyValue>{form.entry_date ? formatDate(form.entry_date) : "—"}</ReadOnlyValue>
            )}
          </Field>
          <Field label="Austritt">
            {canEdit ? (
              <Input
                type="date"
                value={form.exit_date}
                onChange={(e) => setForm({ ...form, exit_date: e.target.value })}
              />
            ) : (
              <ReadOnlyValue>{form.exit_date ? formatDate(form.exit_date) : "—"}</ReadOnlyValue>
            )}
          </Field>
          <Field label="Wochenstunden">
            <Input
              type="number"
              step="0.5"
              disabled={!canEdit}
              value={form.weekly_hours}
              onChange={(e) => setForm({ ...form, weekly_hours: e.target.value })}
            />
          </Field>
          <Field label="Urlaubstage / Jahr">
            <Input
              type="number"
              disabled={!canEdit}
              value={form.vacation_days_per_year}
              onChange={(e) =>
                setForm({ ...form, vacation_days_per_year: e.target.value })
              }
            />
          </Field>
          <Field label="Arbeitszeitmodell">
            <Input
              disabled={!canEdit}
              value={form.work_time_model}
              onChange={(e) => setForm({ ...form, work_time_model: e.target.value })}
            />
          </Field>
          <Field label="Untergruppe">
            <Input
              disabled={!canEdit}
              value={form.subgroup}
              onChange={(e) => setForm({ ...form, subgroup: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} className="bg-brand text-brand-foreground hover:bg-brand/90">
            Speichern
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReadOnlyValue({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-10 items-center rounded-md border border-input bg-background/60 px-3 text-sm text-foreground">
      {children}
    </div>
  );
}
