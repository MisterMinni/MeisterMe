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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import {
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
  reactivateTeamMember,
  resetTeamMemberPassword,
} from "@/lib/team.functions";
import { useIsAdmin, useProfile } from "@/lib/handwerk";
import { toast } from "sonner";
import { UserPlus, KeyRound, Users, ShieldCheck, UserX, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ title: "Team – MeisterMe" }] }),
  component: TeamPage,
});

function TeamPage() {
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const create = useServerFn(createTeamMember);
  const update = useServerFn(updateTeamMember);
  const deact = useServerFn(deactivateTeamMember);
  const react = useServerFn(reactivateTeamMember);
  const resetPw = useServerFn(resetTeamMemberPassword);

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

  const { data: members } = useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at, disabled_at")
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

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roleKey: "mitarbeiter",
  });
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    return (
      <div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-brand" />
          Nur Betriebsinhaber und Administratoren dürfen das Team verwalten.
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

  async function changeRole(userId: string, roleKey: string) {
    try {
      await update({ data: { userId, roleKey } });
      toast.success("Rolle geändert");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
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
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => {
              const currentRoleKey = m.roles[0]?.key ?? "";
              const isMe = m.id === profile?.id;
              const disabled = !!m.disabled_at;
              return (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.full_name ?? "—"}</div>
                    {isMe && <Badge variant="outline" className="mt-1 text-[10px]">Du</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={currentRoleKey} onValueChange={(v) => changeRole(m.id, v)} disabled={isMe}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
                      <SelectContent>
                        {(roles ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {disabled ? (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">Deaktiviert</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">Aktiv</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => doReset(m.id)} className="mr-2">
                      <KeyRound className="mr-1 h-3 w-3" /> Passwort
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(m.id, disabled, m.full_name ?? "Nutzer")}
                      disabled={isMe}
                    >
                      {disabled ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {(!members || members.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-6 w-6" />
                  Noch keine Mitarbeiter angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
