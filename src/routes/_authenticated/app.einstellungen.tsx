import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, GEWERKE } from "@/lib/handwerk";
import { toast } from "sonner";
import { Building2, User, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/einstellungen")({
  head: () => ({ meta: [{ title: "Einstellungen – HandwerkPilot" }] }),
  component: Einstellungen,
});

function Einstellungen() {
  const { data: profile, refetch } = useProfile();
  const [t, setT] = useState({ name: "", adresse: "", plz: "", ort: "", telefon: "", email: "", ustid: "", gewerk_default: "ausbau" });
  const [p, setP] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    if (profile) {
      const tn = (profile.tenants as any) ?? {};
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
    const { error } = await supabase.from("tenants").update({ ...t, gewerk_default: t.gewerk_default as any }).eq("id", profile.tenant_id);
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

  return (
    <div>
      <PageHeader title="Einstellungen" subtitle="Betrieb, Profil und Rollen." />
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
            <h3 className="mb-4 flex items-center gap-2 font-display font-semibold"><User className="h-4 w-4 text-brand" /> Dein Profil</h3>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
              <div><Label>Telefon</Label><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
              <Button onClick={saveProfile} variant="outline">Profil speichern</Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 font-display font-semibold"><ShieldCheck className="h-4 w-4 text-brand" /> Rollen & Rechte</h3>
            <ul className="space-y-2 text-sm">
              <li><strong>Admin</strong> – alles sehen und verwalten</li>
              <li><strong>Büro</strong> – Kunden, Angebote, Rechnungen, Termine</li>
              <li><strong>Bauleiter</strong> – Projekte, Team, Berichte, Planung</li>
              <li><strong>Monteur</strong> – eigene Termine, Einsätze, Zeiten, Fotos</li>
              <li><strong>Azubi</strong> – eingeschränkter Zugriff, Lern-/Hilfemodus</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Nutzerverwaltung mit Rolleneinladung: bald verfügbar.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
