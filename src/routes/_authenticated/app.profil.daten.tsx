import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useProfile, useSession, useIsAdmin, useMyRole, formatDate } from "@/lib/handwerk";
import { getMyEmployeeRecord, updateTeamMember } from "@/lib/team.functions";
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
  const role = useMyRole();
  const qc = useQueryClient();
  const canEdit = isAdmin;
  const loadEmployee = useServerFn(getMyEmployeeRecord);
  const updateEmployee = useServerFn(updateTeamMember);
  const { data: employee } = useQuery({
    queryKey: ["my-employee-record", profile?.id],
    enabled: !!profile?.id,
    queryFn: () => loadEmployee(),
  });

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
    if (!profile || !employee) return;
    setForm({
      full_name: employee.full_name ?? profile.full_name ?? "",
      phone: employee.phone ?? profile.phone ?? "",
      address: employee.address ?? "",
      employee_number: employee.employee_number ?? "",
      entry_date: employee.entry_date ?? "",
      exit_date: employee.exit_date ?? "",
      weekly_hours: employee.weekly_hours != null ? String(employee.weekly_hours) : "",
      work_time_model: employee.work_time_model ?? "",
      vacation_days_per_year:
        employee.vacation_days_per_year != null ? String(employee.vacation_days_per_year) : "",
      cost_center: employee.cost_center ?? "",
      subgroup: employee.subgroup ?? "",
    });
  }, [employee, profile]);

  async function save() {
    if (!employee?.id || !role) return;
    try {
      await updateEmployee({
        data: {
          employeeId: employee.id,
          fullName: form.full_name,
          email: employee.email,
          phone: form.phone || null,
          roleKey: role,
          address: form.address || null,
          employeeNumber: form.employee_number || null,
          entryDate: form.entry_date || null,
          exitDate: form.exit_date || null,
          weeklyHours: form.weekly_hours ? Number(form.weekly_hours) : null,
          workTimeModel: form.work_time_model || null,
          vacationDaysPerYear: form.vacation_days_per_year
            ? Number(form.vacation_days_per_year)
            : null,
          costCenter: form.cost_center || null,
          subgroup: form.subgroup || null,
        },
      });
      toast.success("Gespeichert");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["my-employee-record"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    }
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
