import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FabAdd } from "@/components/fab-add";
import { useServerFn } from "@tanstack/react-start";
import {
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  reactivateTeamMember,
  resetTeamMemberPassword,
  getTeamMemberDetail,
  listTeamMemberEmails,
} from "@/lib/team.functions";
import { useIsAdmin, useProfile } from "@/lib/handwerk";
import { toast } from "sonner";
import { KeyRound, Users, ShieldCheck, UserX, UserCheck, Pencil, Search, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/mitarbeiter")({
  head: () => ({ meta: [{ title: "Mitarbeiter – MeisterMe" }] }),
  component: MitarbeiterPage,
});

function MitarbeiterPage() {
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const create = useServerFn(createTeamMember);
  const update = useServerFn(updateTeamMember);
  const deact = useServerFn(deactivateTeamMember);
  const react = useServerFn(reactivateTeamMember);
  const resetPw = useServerFn(resetTeamMemberPassword);
  const loadDetail = useServerFn(getTeamMemberDetail);
  const loadEmails = useServerFn(listTeamMemberEmails);

  const { data: roles } = useQuery({
    queryKey: ["tenant-roles", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("roles")
        .select("id, key, name")
        .eq("tenant_id", profile!.tenant_id!);
      return data ?? [];
    },
  });

  const { data: emails } = useQuery({
    queryKey: ["team-emails", profile?.tenant_id],
    enabled: !!profile?.tenant_id && isAdmin,
    queryFn: async () => (await loadEmails()) as Record<string, string>,
  });

  const { data: members } = useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone, employee_number, created_at, disabled_at")
        .eq("tenant_id", profile!.tenant_id!);
      const { data: assignments } = await supabase
        .from("user_role_assignments")
        .select("user_id, roles(id, key, name)")
        .eq("tenant_id", profile!.tenant_id!);
      return (profs ?? []).map((p) => ({
        ...p,
        roles: (assignments ?? [])
          .filter((r) => r.user_id === p.id)
          .map((r) => (r as unknown as { roles: { id: string; key: string; name: string } | null }).roles)
          .filter((r): r is { id: string; key: string; name: string } => !!r),
      }));
    },
  });

  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roleKey: "mitarbeiter",
  });
  const [saving, setSaving] = useState(false);

  type EditForm = {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    roleKey: string;
    address: string;
    employee_number: string;
    entry_date: string;
    exit_date: string;
    weekly_hours: string;
    vacation_days_per_year: string;
    work_time_model: string;
    cost_center: string;
    subgroup: string;
  };
  const [editUser, setEditUser] = useState<EditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  async function openEdit(userId: string) {
    setEditLoading(true);
    setEditUser({
      id: userId, fullName: "", email: "", phone: "", roleKey: "",
      address: "", employee_number: "", entry_date: "", exit_date: "",
      weekly_hours: "", vacation_days_per_year: "", work_time_model: "",
      cost_center: "", subgroup: "",
    });
    try {
      const res = await loadDetail({ data: { userId } });
      const p = res.profile as Record<string, unknown>;
      const roleKey = (members ?? []).find((m) => m.id === userId)?.roles[0]?.key ?? "";
      setEditUser({
        id: userId,
        fullName: (p.full_name as string) ?? "",
        email: res.email ?? "",
        phone: (p.phone as string) ?? "",
        roleKey,
        address: (p.address as string) ?? "",
        employee_number: (p.employee_number as string) ?? "",
        entry_date: (p.entry_date as string) ?? "",
        exit_date: (p.exit_date as string) ?? "",
        weekly_hours: p.weekly_hours != null ? String(p.weekly_hours) : "",
        vacation_days_per_year:
          p.vacation_days_per_year != null ? String(p.vacation_days_per_year) : "",
        work_time_model: (p.work_time_model as string) ?? "",
        cost_center: (p.cost_center as string) ?? "",
        subgroup: (p.subgroup as string) ?? "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
      setEditUser(null);
    } finally {
      setEditLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-brand" />
          Nur Betriebsinhaber und Administratoren dürfen Mitarbeiter verwalten.
        </div>
      </div>
    );
  }

  async function submit() {
    if (!form.email || !form.password || !form.fullName) {
      toast.error("Bitte Name, E-Mail und Passwort ausfüllen.");
      return;
    }
    setSaving(true);
    try {
      await create({ data: form });
      toast.success(`${form.fullName} angelegt`);
      setOpen(false);
      setForm({ email: "", password: "", fullName: "", phone: "", roleKey: "mitarbeiter" });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editUser) return;
    if (!editUser.fullName.trim()) {
      toast.error("Name darf nicht leer sein.");
      return;
    }
    setSavingEdit(true);
    try {
      const s = (v: string) => (v.trim() ? v.trim() : null);
      const n = (v: string) => (v.trim() ? Number(v) : null);
      await update({
        data: {
          userId: editUser.id,
          fullName: editUser.fullName.trim(),
          email: editUser.email.trim() || undefined,
          phone: s(editUser.phone),
          roleKey: editUser.roleKey || undefined,
          address: s(editUser.address),
          employee_number: s(editUser.employee_number),
          entry_date: s(editUser.entry_date),
          exit_date: s(editUser.exit_date),
          weekly_hours: n(editUser.weekly_hours),
          vacation_days_per_year:
            editUser.vacation_days_per_year.trim()
              ? parseInt(editUser.vacation_days_per_year, 10)
              : null,
          work_time_model: s(editUser.work_time_model),
          cost_center: s(editUser.cost_center),
          subgroup: s(editUser.subgroup),
        },
      });
      toast.success("Mitarbeiter aktualisiert");
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(userId: string, disabled: boolean, name: string) {
    try {
      if (disabled) {
        await react({ data: { userId } });
        toast.success(`${name} reaktiviert`);
      } else {
        if (!confirm(`${name} deaktivieren? Zugang wird gesperrt, Daten bleiben erhalten.`)) return;
        await deact({ data: { userId } });
        toast.success(`${name} deaktiviert`);
      }
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function doReset(userId: string) {
    const pw = prompt("Neues Passwort (min. 8 Zeichen):");
    if (!pw || pw.length < 8) return;
    try {
      await resetPw({ data: { userId, password: pw } });
      toast.success("Passwort gesetzt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <FabAdd label="Mitarbeiter anlegen" onClick={() => setOpen(true)} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Mitarbeiter anlegen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <Label>E-Mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Start-Passwort *</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min. 8 Zeichen" />
              <p className="mt-1 text-xs text-muted-foreground">Passwort persönlich weitergeben. Mitarbeiter kann es später ändern.</p>
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Rolle *</Label>
              <Select value={form.roleKey} onValueChange={(v) => setForm({ ...form, roleKey: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={submit} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {saving ? "Lege an…" : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <div className="space-y-3 pb-24">
        {(members ?? []).map((m) => {
          const currentRoleKey = m.roles[0]?.key ?? "";
          const isMe = m.id === profile?.id;
          const disabled = !!m.disabled_at;
          const initials = (m.full_name ?? "?")
            .split(" ")
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{m.full_name ?? "—"}</span>
                    {isMe && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Du
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.phone ?? "Keine Telefonnummer"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {disabled ? (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                      Inaktiv
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                      Aktiv
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Bearbeiten"
                    onClick={() => openEdit(m.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge variant="outline" className="max-w-[55%] truncate">
                  {m.roles[0]?.name ?? "Keine Rolle"}
                </Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => doReset(m.id)}>
                    <KeyRound className="mr-1 h-3.5 w-3.5" /> Passwort
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(m.id, disabled, m.full_name ?? "Nutzer")}
                    disabled={isMe}
                    aria-label={disabled ? "Aktivieren" : "Deaktivieren"}
                  >
                    {disabled ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {(!members || members.length === 0) && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-card">
            <Users className="mx-auto mb-2 h-6 w-6" />
            Noch keine Mitarbeiter angelegt.
          </div>
        )}
      </div>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-5">
              {editLoading && (
                <p className="text-xs text-muted-foreground">Lade Daten…</p>
              )}

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontakt</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Name *</Label>
                    <Input value={editUser.fullName} onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>E-Mail</Label>
                    <Input type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input value={editUser.phone} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input value={editUser.address} onChange={(e) => setEditUser({ ...editUser, address: e.target.value })} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beschäftigung</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Rolle</Label>
                    <Select
                      value={editUser.roleKey}
                      onValueChange={(v) => setEditUser({ ...editUser, roleKey: v })}
                      disabled={editUser.id === profile?.id}
                    >
                      <SelectTrigger><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
                      <SelectContent>
                        {(roles ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Personalnummer</Label>
                    <Input value={editUser.employee_number} onChange={(e) => setEditUser({ ...editUser, employee_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Eintritt</Label>
                    <Input type="date" value={editUser.entry_date} onChange={(e) => setEditUser({ ...editUser, entry_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Austritt</Label>
                    <Input type="date" value={editUser.exit_date} onChange={(e) => setEditUser({ ...editUser, exit_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Wochenstunden</Label>
                    <Input type="number" step="0.5" value={editUser.weekly_hours} onChange={(e) => setEditUser({ ...editUser, weekly_hours: e.target.value })} />
                  </div>
                  <div>
                    <Label>Urlaubstage / Jahr</Label>
                    <Input type="number" value={editUser.vacation_days_per_year} onChange={(e) => setEditUser({ ...editUser, vacation_days_per_year: e.target.value })} />
                  </div>
                  <div>
                    <Label>Arbeitszeitmodell</Label>
                    <Input value={editUser.work_time_model} onChange={(e) => setEditUser({ ...editUser, work_time_model: e.target.value })} />
                  </div>
                  <div>
                    <Label>Kostenstelle</Label>
                    <Input value={editUser.cost_center} onChange={(e) => setEditUser({ ...editUser, cost_center: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Untergruppe</Label>
                    <Input value={editUser.subgroup} onChange={(e) => setEditUser({ ...editUser, subgroup: e.target.value })} />
                  </div>
                </div>
                {editUser.id === profile?.id && (
                  <p className="text-xs text-muted-foreground">Eigene Rolle kann nicht geändert werden.</p>
                )}
              </section>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Abbrechen</Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit || editLoading}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {savingEdit ? "Speichere…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
