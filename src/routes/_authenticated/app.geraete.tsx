import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Drill, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, useHasPermission, useProfile } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/geraete")({
  head: () => ({ meta: [{ title: "Geräteverwaltung – MeisterMe" }] }),
  component: EquipmentPage,
});

const initialForm = { name: "", type: "Werkzeug", identifier: "", assignedTo: "none" };

export function EquipmentPage() {
  const { data: profile } = useProfile();
  const canWrite = useHasPermission("employees:update");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const { data: equipment } = useQuery({
    queryKey: ["equipment", profile?.tenant_id],
    enabled: Boolean(profile?.tenant_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["equipment-employees", profile?.tenant_id],
    enabled: Boolean(profile?.tenant_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, auth_user_id, full_name, status").eq("status", "active").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const employeesByAuthId = new Map((employees ?? []).filter((employee) => employee.auth_user_id).map((employee) => [employee.auth_user_id!, employee]));

  async function createEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    const assignedTo = form.assignedTo === "none" ? null : form.assignedTo;
    const { error } = await supabase.from("equipment").insert({
      tenant_id: profile.tenant_id,
      name: form.name.trim(),
      type: form.type.trim(),
      identifier: form.identifier.trim() || null,
      assigned_to: assignedTo,
      handed_out_on: assignedTo ? new Date().toISOString().slice(0, 10) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Gerät angelegt");
    setForm(initialForm);
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["equipment", profile.tenant_id] });
  }

  async function assignEquipment(id: string, value: string) {
    const assignedTo = value === "none" ? null : value;
    const { error } = await supabase.from("equipment").update({
      assigned_to: assignedTo,
      handed_out_on: assignedTo ? new Date().toISOString().slice(0, 10) : null,
      returned_on: assignedTo ? null : new Date().toISOString().slice(0, 10),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(assignedTo ? "Gerät ausgegeben" : "Rückgabe verbucht");
    await queryClient.invalidateQueries({ queryKey: ["equipment", profile?.tenant_id] });
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div><h2 className="font-display text-lg font-bold">Geräte & Werkzeuge</h2><p className="text-sm text-muted-foreground">Inventar kennzeichnen, ausgeben und Rückgaben dokumentieren.</p></div>
        {canWrite && <Button type="button" onClick={() => setOpen(true)} className="bg-brand text-white hover:bg-brand/90"><Plus className="h-4 w-4" /> Gerät</Button>}
      </header>
      <div className="p-4 sm:p-5">
        {equipment?.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{equipment.map((item) => { const assigned = item.assigned_to ? employeesByAuthId.get(item.assigned_to) : null; return <article key={item.id} className="rounded-xl border border-border p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700"><Drill className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{item.name}</h3><p className="text-xs text-muted-foreground">{item.type} · {item.identifier ?? "ohne Kennung"}</p></div><Badge variant={assigned ? "default" : "secondary"}>{assigned ? "Ausgegeben" : "Verfügbar"}</Badge></div><div className="mt-4">{canWrite ? <Select value={item.assigned_to ?? "none"} onValueChange={(value) => assignEquipment(item.id, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Im Lager / zurückgegeben</SelectItem>{(employees ?? []).filter((employee) => employee.auth_user_id).map((employee) => <SelectItem key={employee.id} value={employee.auth_user_id!}>{employee.full_name}</SelectItem>)}</SelectContent></Select> : <p className="text-sm">{assigned?.full_name ?? "Nicht zugewiesen"}</p>}<p className="mt-2 text-xs text-muted-foreground">{assigned ? `Ausgegeben am ${formatDate(item.handed_out_on)}` : item.returned_on ? `Zurück am ${formatDate(item.returned_on)}` : "Noch keine Ausgabe"}</p></div></article>; })}</div> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center"><div><Drill className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium">Noch keine Geräte</p><p className="text-sm text-muted-foreground">Lege Werkzeuge mit interner Kennung an.</p></div></div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><form onSubmit={createEquipment}><DialogHeader><DialogTitle>Gerät anlegen</DialogTitle></DialogHeader><div className="space-y-4 py-5"><div><Label htmlFor="equipment-name">Bezeichnung</Label><Input id="equipment-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="z. B. Airlessgerät 3" required /></div><div><Label htmlFor="equipment-type">Kategorie</Label><Input id="equipment-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></div><div><Label htmlFor="equipment-identifier">Inventar-/Seriennummer</Label><Input id="equipment-identifier" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} /></div><div><Label>Direkt ausgeben an</Label><Select value={form.assignedTo} onValueChange={(assignedTo) => setForm({ ...form, assignedTo })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Niemanden</SelectItem>{(employees ?? []).filter((employee) => employee.auth_user_id).map((employee) => <SelectItem key={employee.id} value={employee.auth_user_id!}>{employee.full_name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" disabled={saving} className="bg-brand text-white hover:bg-brand/90">{saving ? "Speichert …" : "Gerät anlegen"}</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}

