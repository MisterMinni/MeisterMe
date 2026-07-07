import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
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
  deleteTeamMember,
  resetTeamMemberPassword,
} from "@/lib/team.functions";
import { useMyRole, ROLE_LABELS, type AppRole, useProfile } from "@/lib/handwerk";
import { toast } from "sonner";
import { UserPlus, Trash2, KeyRound, Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ title: "Team – MeisterMe" }] }),
  component: TeamPage,
});

const ROLES: AppRole[] = ["admin", "buero", "bauleiter", "monteur", "azubi"];

function TeamPage() {
  const role = useMyRole();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const create = useServerFn(createTeamMember);
  const update = useServerFn(updateTeamMember);
  const remove = useServerFn(deleteTeamMember);
  const resetPw = useServerFn(resetTeamMemberPassword);

  const { data: members } = useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .eq("tenant_id", profile!.tenant_id!);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("tenant_id", profile!.tenant_id!);
      return (profs ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: "monteur" as AppRole,
  });
  const [saving, setSaving] = useState(false);

  if (role && role !== "admin") {
    return (
      <div>
        <PageHeader title="Team" subtitle="Mitarbeiter verwalten" />
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-brand" />
          Nur Admins dürfen das Team verwalten.
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
      setForm({ email: "", password: "", fullName: "", phone: "", role: "monteur" });
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(userId: string, r: AppRole) {
    try {
      await update({ data: { userId, role: r } });
      toast.success("Rolle geändert");
      qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  }

  async function doDelete(userId: string, name: string) {
    if (!confirm(`${name} wirklich löschen? Zugriff geht sofort verloren.`)) return;
    try {
      await remove({ data: { userId } });
      toast.success("Gelöscht");
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
      <PageHeader
        title="Team"
        subtitle="Mitarbeiter anlegen, Rollen vergeben, Zugänge verwalten."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-foreground hover:bg-brand/90">
                <UserPlus className="mr-1 h-4 w-4" /> Mitarbeiter anlegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Mitarbeiter anlegen</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
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
                  <p className="mt-1 text-xs text-muted-foreground">Passwort per Zettel/SMS weitergeben. Mitarbeiter kann es später ändern.</p>
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Rolle *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
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

      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-border bg-card p-3 text-xs">
            <div className="font-semibold">{ROLE_LABELS[r]}</div>
            <div className="text-muted-foreground">
              {r === "admin" && "Alles verwalten, Team, Rechnungen."}
              {r === "buero" && "Kunden, Angebote, Rechnungen, Termine."}
              {r === "bauleiter" && "Projekte, Team, Berichte, Planung."}
              {r === "monteur" && "Projekte, Zeiten, Material, Fotos, Chat."}
              {r === "azubi" && "Zeiten, Fotos, Chat."}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => {
              const currentRole = (m.roles[0] as AppRole) ?? "monteur";
              const isMe = m.id === profile?.id;
              return (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.full_name ?? "—"}</div>
                    {isMe && <Badge variant="outline" className="mt-1 text-[10px]">Du</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={currentRole} onValueChange={(v) => changeRole(m.id, v as AppRole)} disabled={isMe}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => doReset(m.id)} className="mr-2">
                      <KeyRound className="mr-1 h-3 w-3" /> Passwort
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => doDelete(m.id, m.full_name ?? "Nutzer")} disabled={isMe}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {(!members || members.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
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
