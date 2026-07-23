import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useIsAdmin, GEWERKE } from "@/lib/handwerk";
import { toast } from "sonner";
import { Building2, Copy, Mail, ShieldCheck, Lock, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/einstellungen")({
  head: () => ({ meta: [{ title: "Einstellungen – MeisterMe" }] }),
  component: Einstellungen,
});

function Einstellungen() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-lg font-semibold">Nur für Betriebsinhaber und Administratoren</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Einstellungen zu Betrieb, Team und Rollen verwaltet dein Betriebsinhaber. Wende dich bei Fragen an ihn.
        </p>
        <Link to="/app" className="mt-4 inline-block text-sm font-semibold text-brand">Zurück zum Dashboard</Link>
      </div>
    );
  }
  return <EinstellungenAdmin />;
}

function EinstellungenAdmin() {
  const { data: profile, refetch } = useProfile();
  const [t, setT] = useState({ name: "", adresse: "", plz: "", ort: "", telefon: "", email: "", ustid: "", gewerk_default: "ausbau" });
  const [p, setP] = useState({ full_name: "", phone: "" });
  const [mailboxAddress, setMailboxAddress] = useState("");
  const [savingMailbox, setSavingMailbox] = useState(false);

  const webhookUrl = "https://meister-me.vercel.app/api/webhooks/resend";

  const { data: roles } = useQuery({
    queryKey: ["tenant-roles-list", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("roles")
        .select("id, key, name, is_system, role_permissions(permission_key)")
        .eq("tenant_id", profile!.tenant_id!);
      return data ?? [];
    },
  });

  const { data: mailboxes, refetch: refetchMailboxes } = useQuery({
    queryKey: ["tenant-mailboxes", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_mailboxes")
        .select("*")
        .eq("tenant_id", profile!.tenant_id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      const tn = (profile.tenants as unknown as Record<string, string | null>) ?? {};
      setT({
        name: tn.name ?? "",
        adresse: tn.adresse ?? "",
        plz: tn.plz ?? "",
        ort: tn.ort ?? "",
        telefon: tn.telefon ?? "",
        email: tn.email ?? "",
        ustid: tn.ustid ?? "",
        gewerk_default: tn.gewerk_default ?? "ausbau",
      });
      setP({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
    }
  }, [profile]);

  async function saveTenant() {
    if (!profile?.tenant_id) return;
    const { error } = await supabase
      .from("tenants")
      .update({ ...t, gewerk_default: t.gewerk_default as never })
      .eq("id", profile.tenant_id);
    if (error) return toast.error(error.message);
    toast.success("Betrieb gespeichert");
    refetch();
  }
  async function saveProfile() {
    if (!profile?.id) return;
    const { error } = await supabase.from("profiles").update(p).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert");
    refetch();
  }

  async function addMailbox() {
    if (!profile?.tenant_id) return;
    const normalizedAddress = mailboxAddress.trim().toLowerCase();
    if (!normalizedAddress) return;
    setSavingMailbox(true);
    const { error } = await supabase.from("tenant_mailboxes").insert({
      tenant_id: profile.tenant_id,
      email_address: normalizedAddress,
    });
    setSavingMailbox(false);
    if (error) return toast.error(error.message);
    setMailboxAddress("");
    toast.success("Eingangspostfach gespeichert");
    await refetchMailboxes();
  }

  async function removeMailbox(id: string) {
    const { error } = await supabase.from("tenant_mailboxes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Eingangspostfach entfernt");
    await refetchMailboxes();
  }

  async function copyWebhookUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook-URL kopiert");
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 font-display font-semibold"><Building2 className="h-4 w-4 text-brand" /> Betrieb</h3>
          <div className="space-y-3">
            <div><Label>Firmenname</Label><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></div>
            <div><Label>Adresse</Label><Input value={t.adresse} onChange={(e) => setT({ ...t, adresse: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>PLZ</Label><Input value={t.plz} onChange={(e) => setT({ ...t, plz: e.target.value })} /></div>
              <div className="col-span-2"><Label>Ort</Label><Input value={t.ort} onChange={(e) => setT({ ...t, ort: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Telefon</Label><Input value={t.telefon} onChange={(e) => setT({ ...t, telefon: e.target.value })} /></div>
              <div><Label>E-Mail</Label><Input value={t.email} onChange={(e) => setT({ ...t, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>USt-IdNr</Label><Input value={t.ustid} onChange={(e) => setT({ ...t, ustid: e.target.value })} /></div>
              <div>
                <Label>Standard-Gewerk</Label>
                <Select value={t.gewerk_default} onValueChange={(v) => setT({ ...t, gewerk_default: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GEWERKE.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveTenant} className="bg-brand text-brand-foreground hover:bg-brand/90">Betrieb speichern</Button>
          </div>
        </section>

        <div className="space-y-6">

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 font-display font-semibold"><Mail className="h-4 w-4 text-brand" /> E-Mail-Eingang</h3>
            <p className="mb-4 text-sm text-muted-foreground">Resend stellt eingehende E-Mails automatisch beim passenden Kunden bereit. Unbekannte Absender erscheinen im Büro unter Kommunikation zur manuellen Zuordnung.</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="resend-webhook-url">Webhook-URL für Resend</Label>
                <div className="flex gap-2">
                  <Input id="resend-webhook-url" value={webhookUrl} readOnly />
                  <Button type="button" variant="outline" size="icon" onClick={copyWebhookUrl} aria-label="Webhook-URL kopieren"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label htmlFor="mailbox-address">Empfangsadresse aus Resend</Label>
                <div className="flex gap-2">
                  <Input id="mailbox-address" type="email" placeholder="z. B. eingang@in.meisterme.de" value={mailboxAddress} onChange={(event) => setMailboxAddress(event.target.value)} />
                  <Button type="button" onClick={addMailbox} disabled={savingMailbox || !mailboxAddress.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90">Hinzufügen</Button>
                </div>
              </div>
              {(mailboxes ?? []).length > 0 && (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {(mailboxes ?? []).map((mailbox) => (
                    <li key={mailbox.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0"><p className="truncate font-medium">{mailbox.email_address}</p><p className="text-xs text-muted-foreground">Resend · {mailbox.active ? "Aktiv" : "Inaktiv"}</p></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMailbox(mailbox.id)} aria-label={`${mailbox.email_address} entfernen`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><ShieldCheck className="h-4 w-4 text-brand" /> Rollen</h3>
            <ul className="space-y-2 text-sm">
              {(roles ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(r.role_permissions ?? []).length} Berechtigungen
                    </div>
                  </div>
                  {r.is_system && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">System</span>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Mitarbeiter zu Rollen zuweisen unter <Link to="/app/mitarbeiter" className="text-brand underline">Mitarbeiter</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
