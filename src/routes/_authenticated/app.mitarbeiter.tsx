import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Mail,
  MailCheck,
  MailWarning,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { FabAdd } from "@/components/fab-add";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useHasPermission, useProfile } from "@/lib/handwerk";
import {
  createTeamMember,
  deactivateTeamMember,
  getTeamMemberDetail,
  inviteTeamMember,
  listTeamMembers,
  reactivateTeamMember,
  resendTeamMemberInvitation,
  revokeTeamMemberInvitation,
  updateTeamMember,
  type TeamMemberAccessStatus,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/app/mitarbeiter")({
  head: () => ({ meta: [{ title: "Mitarbeiter – MeisterMe" }] }),
  component: MitarbeiterPage,
});

type EmployeeForm = {
  fullName: string;
  email: string;
  phone: string;
  roleKey: string;
  address: string;
  employeeNumber: string;
  entryDate: string;
  exitDate: string;
  weeklyHours: string;
  workTimeModel: string;
  vacationDaysPerYear: string;
  costCenter: string;
  subgroup: string;
};

const emptyForm: EmployeeForm = {
  fullName: "",
  email: "",
  phone: "",
  roleKey: "mitarbeiter",
  address: "",
  employeeNumber: "",
  entryDate: "",
  exitDate: "",
  weeklyHours: "",
  workTimeModel: "",
  vacationDaysPerYear: "24",
  costCenter: "",
  subgroup: "",
};

function MitarbeiterPage() {
  const { data: profile } = useProfile();
  const canRead = useHasPermission("employees:read");
  const canCreate = useHasPermission("employees:create");
  const canUpdate = useHasPermission("employees:update");
  const canDeactivate = useHasPermission("employees:deactivate");
  const canManageRoles = useHasPermission("roles:manage");
  const queryClient = useQueryClient();

  const list = useServerFn(listTeamMembers);
  const create = useServerFn(createTeamMember);
  const loadDetail = useServerFn(getTeamMemberDetail);
  const update = useServerFn(updateTeamMember);
  const invite = useServerFn(inviteTeamMember);
  const resend = useServerFn(resendTeamMemberInvitation);
  const revoke = useServerFn(revokeTeamMemberInvitation);
  const deactivate = useServerFn(deactivateTeamMember);
  const reactivate = useServerFn(reactivateTeamMember);

  const { data: roles } = useQuery({
    queryKey: ["tenant-roles", profile?.tenant_id],
    enabled: !!profile?.tenant_id && canRead,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, key, name")
        .eq("tenant_id", profile!.tenant_id!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const availableRoles = useMemo(
    () =>
      (roles ?? []).filter(
        (role) =>
          canManageRoles || !["unternehmensinhaber", "administrator"].includes(role.key),
      ),
    [canManageRoles, roles],
  );

  const {
    data: members,
    isLoading,
    error: listError,
  } = useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id && canRead,
    queryFn: () => list(),
  });

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [grantAccess, setGrantAccess] = useState(true);
  const [createForm, setCreateForm] = useState<EmployeeForm>(emptyForm);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyEmployeeId, setBusyEmployeeId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return members ?? [];
    return (members ?? []).filter((member) => {
      const haystack = [
        member.fullName,
        member.email,
        member.phone,
        member.employeeNumber,
        member.subgroup,
        member.role?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [members, search]);

  async function refreshMembers() {
    await queryClient.invalidateQueries({ queryKey: ["team-members"] });
    await queryClient.invalidateQueries({ queryKey: ["plan-members"] });
  }

  async function submitCreate() {
    if (!createForm.fullName.trim()) return toast.error("Bitte einen Namen eingeben.");
    if (grantAccess && !createForm.email.trim()) {
      return toast.error("Für den App-Zugang wird eine E-Mail-Adresse benötigt.");
    }

    setSaving(true);
    try {
      const result = await create({
        data: toServerForm(createForm, { grantAccess }),
      });
      if (result.invitationError) {
        toast.warning(`Mitarbeiter angelegt, Einladung fehlgeschlagen: ${result.invitationError}`);
      } else if (result.invitationSent) {
        toast.success("Mitarbeiter angelegt und Einladung versendet.");
      } else {
        toast.success("Mitarbeiter ohne App-Zugang angelegt.");
      }
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setGrantAccess(true);
      await refreshMembers();
    } catch (cause) {
      toast.error(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  async function openEdit(employeeId: string) {
    setEditEmployeeId(employeeId);
    setEditForm(null);
    try {
      const employee = await loadDetail({ data: { employeeId } });
      const roleKey = (members ?? []).find((member) => member.id === employeeId)?.role?.key ?? "mitarbeiter";
      setEditForm({
        fullName: employee.full_name,
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        roleKey,
        address: employee.address ?? "",
        employeeNumber: employee.employee_number ?? "",
        entryDate: employee.entry_date ?? "",
        exitDate: employee.exit_date ?? "",
        weeklyHours: employee.weekly_hours == null ? "" : String(employee.weekly_hours),
        workTimeModel: employee.work_time_model ?? "",
        vacationDaysPerYear:
          employee.vacation_days_per_year == null
            ? ""
            : String(employee.vacation_days_per_year),
        costCenter: employee.cost_center ?? "",
        subgroup: employee.subgroup ?? "",
      });
    } catch (cause) {
      toast.error(messageFrom(cause));
      setEditEmployeeId(null);
    }
  }

  async function submitEdit() {
    if (!editEmployeeId || !editForm) return;
    setSaving(true);
    try {
      await update({
        data: {
          employeeId: editEmployeeId,
          ...toServerForm(editForm),
        },
      });
      toast.success("Mitarbeiterdaten gespeichert.");
      setEditEmployeeId(null);
      setEditForm(null);
      await refreshMembers();
    } catch (cause) {
      toast.error(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  async function runEmployeeAction(
    employeeId: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    setBusyEmployeeId(employeeId);
    try {
      await action();
      toast.success(successMessage);
      await refreshMembers();
    } catch (cause) {
      toast.error(messageFrom(cause));
    } finally {
      setBusyEmployeeId(null);
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-brand" />
        Du hast keine Berechtigung, Mitarbeiterdaten anzuzeigen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canCreate && <FabAdd label="Mitarbeiter anlegen" onClick={() => setCreateOpen(true)} />}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Mitarbeiter</h1>
            <p className="text-sm text-muted-foreground">
              Personalstammsätze und persönliche App-Zugänge getrennt verwalten.
            </p>
          </div>
          <Badge variant="secondary">{members?.length ?? 0}</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, E-Mail, Personalnummer …"
          className="pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Suche leeren"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {listError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {messageFrom(listError)}
        </p>
      )}

      <div className="space-y-3 pb-24">
        {isLoading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Mitarbeiter werden geladen …
          </div>
        )}
        {filteredMembers.map((member) => {
          const isBusy = busyEmployeeId === member.id;
          const isSelf = member.authUserId === profile?.id;
          return (
            <div key={member.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {initials(member.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{member.fullName}</span>
                    {isSelf && <Badge variant="outline">Du</Badge>}
                    <AccessBadge status={member.accessStatus} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {member.email ?? member.phone ?? "Keine Kontaktdaten"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{member.role?.name ?? "Keine Rolle"}</Badge>
                    {member.employeeNumber && (
                      <Badge variant="secondary">Pers.-Nr. {member.employeeNumber}</Badge>
                    )}
                    {member.subgroup && <Badge variant="secondary">{member.subgroup}</Badge>}
                  </div>
                </div>
                {canUpdate && (
                  <Button size="icon" variant="ghost" aria-label="Bearbeiten" onClick={() => openEdit(member.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
                {canUpdate && member.status === "active" && member.accessStatus === "no_access" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy || !member.email}
                    onClick={() =>
                      runEmployeeAction(
                        member.id,
                        () => invite({ data: { employeeId: member.id } }),
                        "Einladung versendet.",
                      )
                    }
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" /> Zugang einrichten
                  </Button>
                )}
                {canUpdate && ["invited", "expired"].includes(member.accessStatus) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() =>
                        runEmployeeAction(
                          member.id,
                          () => resend({ data: { employeeId: member.id } }),
                          "Neue Einladung versendet.",
                        )
                      }
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Erneut senden
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => {
                        if (!window.confirm("Ausstehende Einladung wirklich widerrufen?")) return;
                        void runEmployeeAction(
                          member.id,
                          () => revoke({ data: { employeeId: member.id } }),
                          "Einladung widerrufen.",
                        );
                      }}
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Widerrufen
                    </Button>
                  </>
                )}
                {canDeactivate && member.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy || isSelf}
                    onClick={() => {
                      if (!window.confirm(`Zugang und Beschäftigungsstatus von ${member.fullName} deaktivieren?`)) return;
                      void runEmployeeAction(
                        member.id,
                        () => deactivate({ data: { employeeId: member.id } }),
                        "Mitarbeiter deaktiviert und Zugang gesperrt.",
                      );
                    }}
                  >
                    <UserX className="mr-1 h-3.5 w-3.5" /> Deaktivieren
                  </Button>
                ) : canDeactivate ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() =>
                      runEmployeeAction(
                        member.id,
                        () => reactivate({ data: { employeeId: member.id } }),
                        "Mitarbeiter reaktiviert.",
                      )
                    }
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5" /> Reaktivieren
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}

        {!isLoading && filteredMembers.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-7 w-7" />
            {search ? "Keine passenden Mitarbeiter gefunden." : "Noch keine Mitarbeiter angelegt."}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuen Mitarbeiter anlegen</DialogTitle>
          </DialogHeader>
          <EmployeeFormFields
            form={createForm}
            onChange={setCreateForm}
            roles={availableRoles}
            appAccess={{ enabled: grantAccess, onChange: setGrantAccess }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button disabled={saving} onClick={submitCreate} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {saving ? "Speichere …" : grantAccess ? "Anlegen und einladen" : "Mitarbeiter anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editEmployeeId}
        onOpenChange={(open) => {
          if (!open) {
            setEditEmployeeId(null);
            setEditForm(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
          </DialogHeader>
          {editForm ? (
            <EmployeeFormFields
              form={editForm}
              onChange={setEditForm}
              roles={availableRoles}
              loginEmailLocked={(members ?? []).find((member) => member.id === editEmployeeId)?.accessStatus === "active"}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Mitarbeiterdaten werden geladen …</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmployeeId(null)}>Abbrechen</Button>
            <Button disabled={saving || !editForm} onClick={submitEdit} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {saving ? "Speichere …" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeFormFields({
  form,
  onChange,
  roles,
  appAccess,
  loginEmailLocked = false,
}: {
  form: EmployeeForm;
  onChange: (form: EmployeeForm) => void;
  roles: { id: string; key: string; name: string }[];
  appAccess?: { enabled: boolean; onChange: (enabled: boolean) => void };
  loginEmailLocked?: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontakt</h3>
        <Field label="Name *" wide>
          <Input value={form.fullName} onChange={(event) => onChange({ ...form, fullName: event.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-Mail" wide>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
            />
            {loginEmailLocked && (
              <p className="mt-1 text-xs text-muted-foreground">
                Dies ändert die Kontaktadresse, nicht automatisch die bestätigte Anmeldeadresse.
              </p>
            )}
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} />
          </Field>
          <Field label="Adresse">
            <Input value={form.address} onChange={(event) => onChange({ ...form, address: event.target.value })} />
          </Field>
        </div>
      </section>

      {appAccess && (
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="grant-app-access" className="font-medium">App-Zugang einrichten</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Der Mitarbeiter erhält eine E-Mail und legt sein Passwort selbst fest.
              </p>
            </div>
            <Switch id="grant-app-access" checked={appAccess.enabled} onCheckedChange={appAccess.onChange} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beschäftigung</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rolle">
            <Select value={form.roleKey} onValueChange={(roleKey) => onChange({ ...form, roleKey })}>
              <SelectTrigger><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
              <SelectContent>
                {roles.map((role) => <SelectItem key={role.id} value={role.key}>{role.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Personalnummer">
            <Input value={form.employeeNumber} onChange={(event) => onChange({ ...form, employeeNumber: event.target.value })} />
          </Field>
          <Field label="Eintritt">
            <Input type="date" value={form.entryDate} onChange={(event) => onChange({ ...form, entryDate: event.target.value })} />
          </Field>
          <Field label="Austritt">
            <Input type="date" value={form.exitDate} onChange={(event) => onChange({ ...form, exitDate: event.target.value })} />
          </Field>
          <Field label="Wochenstunden">
            <Input type="number" min="0" step="0.5" value={form.weeklyHours} onChange={(event) => onChange({ ...form, weeklyHours: event.target.value })} />
          </Field>
          <Field label="Urlaubstage / Jahr">
            <Input type="number" min="0" value={form.vacationDaysPerYear} onChange={(event) => onChange({ ...form, vacationDaysPerYear: event.target.value })} />
          </Field>
          <Field label="Arbeitszeitmodell">
            <Input value={form.workTimeModel} onChange={(event) => onChange({ ...form, workTimeModel: event.target.value })} />
          </Field>
          <Field label="Kostenstelle">
            <Input value={form.costCenter} onChange={(event) => onChange({ ...form, costCenter: event.target.value })} />
          </Field>
          <Field label="Untergruppe" wide>
            <Input value={form.subgroup} onChange={(event) => onChange({ ...form, subgroup: event.target.value })} />
          </Field>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label className="mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function AccessBadge({ status }: { status: TeamMemberAccessStatus }) {
  const config = {
    no_access: { label: "Ohne Zugang", icon: UserX, className: "bg-slate-100 text-slate-700" },
    invited: { label: "Eingeladen", icon: Mail, className: "bg-blue-100 text-blue-700" },
    expired: { label: "Einladung abgelaufen", icon: MailWarning, className: "bg-amber-100 text-amber-800" },
    active: { label: "Zugang aktiv", icon: MailCheck, className: "bg-emerald-100 text-emerald-700" },
    disabled: { label: "Deaktiviert", icon: UserX, className: "bg-red-100 text-red-700" },
  }[status];
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={config.className}>
      <Icon className="mr-1 h-3 w-3" /> {config.label}
    </Badge>
  );
}

function toServerForm(form: EmployeeForm, extra?: { grantAccess: boolean }) {
  const nullable = (value: string) => (value.trim() ? value.trim() : null);
  const number = (value: string) => (value.trim() ? Number(value) : null);
  return {
    fullName: form.fullName.trim(),
    email: nullable(form.email),
    phone: nullable(form.phone),
    roleKey: form.roleKey,
    address: nullable(form.address),
    employeeNumber: nullable(form.employeeNumber),
    entryDate: nullable(form.entryDate),
    exitDate: nullable(form.exitDate),
    weeklyHours: number(form.weeklyHours),
    workTimeModel: nullable(form.workTimeModel),
    vacationDaysPerYear: number(form.vacationDaysPerYear),
    costCenter: nullable(form.costCenter),
    subgroup: nullable(form.subgroup),
    ...extra,
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : "Die Aktion ist fehlgeschlagen.";
}
