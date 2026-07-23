import { useState, type FormEvent } from "react";
import { Plus, Ruler } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { CommercialData } from "@/lib/commercial";
import { customerName, MEASUREMENT_STATUS } from "@/lib/commercial";
import { formatDate } from "@/lib/handwerk";

type MeasurementsPanelProps = {
  data: CommercialData;
  tenantId: string;
  userId: string;
  canWrite: boolean;
  onChanged: () => Promise<void>;
};

const initialForm = {
  customerId: "",
  title: "",
  area: "",
  description: "",
  length: "",
  width: "",
  height: "",
  quantity: "",
  deduction: "0",
  unit: "m²",
  notes: "",
};

export function MeasurementsPanel({ data, tenantId, userId, canWrite, onChanged }: MeasurementsPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const customersById = new Map(data.customers.map((customer) => [customer.id, customer]));

  const calculatedQuantity = (() => {
    const explicit = Number(form.quantity);
    if (explicit > 0) return explicit;
    const length = Number(form.length);
    const height = Number(form.height);
    const width = Number(form.width);
    const deduction = Number(form.deduction) || 0;
    if (length > 0 && height > 0) return Math.max(0, length * height - deduction);
    if (length > 0 && width > 0) return Math.max(0, length * width - deduction);
    return 0;
  })();

  async function saveMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { data: measurement, error } = await supabase
      .from("measurements")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        customer_id: form.customerId || null,
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        totals: { quantity: calculatedQuantity, unit: form.unit },
      })
      .select("id")
      .single();

    if (error || !measurement) {
      setSaving(false);
      return toast.error(error?.message ?? "Aufmaß konnte nicht angelegt werden");
    }

    const { error: itemError } = await supabase.from("measurement_items").insert({
      tenant_id: tenantId,
      measurement_id: measurement.id,
      position: 1,
      area: form.area.trim() || null,
      description: form.description.trim(),
      quantity: calculatedQuantity,
      unit: form.unit,
      length: form.length ? Number(form.length) : null,
      width: form.width ? Number(form.width) : null,
      height: form.height ? Number(form.height) : null,
      deduction: Number(form.deduction) || 0,
      source: "manual",
    });

    if (itemError) {
      await supabase.from("measurements").delete().eq("id", measurement.id);
      setSaving(false);
      return toast.error(itemError.message);
    }

    setSaving(false);
    toast.success("Aufmaß angelegt");
    setForm(initialForm);
    setOpen(false);
    await onChanged();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("measurements").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status aktualisiert");
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div><h2 className="font-display text-lg font-bold">Aufmaße</h2><p className="text-sm text-muted-foreground">Mengen nachvollziehbar erfassen und für Angebote vorbereiten.</p></div>
        {canWrite && <Button type="button" onClick={() => setOpen(true)} disabled={!data.customers.length} className="bg-brand text-white hover:bg-brand/90"><Plus className="h-4 w-4" /> Aufmaß</Button>}
      </header>
      <div className="p-4 sm:p-5">
        {data.measurements.length ? (
          <div className="space-y-3">
            {data.measurements.map((measurement) => {
              const totals = measurement.totals && typeof measurement.totals === "object" && !Array.isArray(measurement.totals)
                ? measurement.totals as Record<string, unknown>
                : {};
              return (
                <article key={measurement.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Ruler className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{measurement.title}</h3><p className="text-xs text-muted-foreground">{customerName(customersById.get(measurement.customer_id ?? ""))} · {formatDate(measurement.captured_at)}</p></div>
                  <div className="text-sm font-semibold">{Number(totals.quantity ?? 0).toLocaleString("de-DE", { maximumFractionDigits: 3 })} {String(totals.unit ?? "")}</div>
                  {canWrite ? (
                    <Select value={measurement.status} onValueChange={(status) => updateStatus(measurement.id, status)}><SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MEASUREMENT_STATUS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
                  ) : <Badge variant="secondary">{MEASUREMENT_STATUS[measurement.status] ?? measurement.status}</Badge>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center"><div><Ruler className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium">Noch kein Aufmaß</p><p className="text-sm text-muted-foreground">{data.customers.length ? "Erfasse die erste Fläche direkt auf der Baustelle." : "Lege zuerst einen Kunden an."}</p></div></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={saveMeasurement}>
            <DialogHeader><DialogTitle>Aufmaß erfassen</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Kunde</Label><Select value={form.customerId} onValueChange={(customerId) => setForm({ ...form, customerId })} required><SelectTrigger><SelectValue placeholder="Kunde auswählen" /></SelectTrigger><SelectContent>{data.customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customerName(customer)}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><Label htmlFor="measurement-title">Bezeichnung</Label><Input id="measurement-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="z. B. Erdgeschoss – Wände" required /></div>
              <div><Label htmlFor="measurement-area">Raum / Bereich</Label><Input id="measurement-area" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Wohnzimmer" /></div>
              <div><Label htmlFor="measurement-description">Leistung / Bauteil</Label><Input id="measurement-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Wandfläche streichen" required /></div>
              <div><Label htmlFor="measurement-length">Länge (m)</Label><Input id="measurement-length" type="number" min="0" step="0.001" value={form.length} onChange={(event) => setForm({ ...form, length: event.target.value })} /></div>
              <div><Label htmlFor="measurement-height">Höhe (m)</Label><Input id="measurement-height" type="number" min="0" step="0.001" value={form.height} onChange={(event) => setForm({ ...form, height: event.target.value })} /></div>
              <div><Label htmlFor="measurement-width">Breite (m)</Label><Input id="measurement-width" type="number" min="0" step="0.001" value={form.width} onChange={(event) => setForm({ ...form, width: event.target.value })} /></div>
              <div><Label htmlFor="measurement-deduction">Abzug (m²)</Label><Input id="measurement-deduction" type="number" min="0" step="0.001" value={form.deduction} onChange={(event) => setForm({ ...form, deduction: event.target.value })} /></div>
              <div><Label htmlFor="measurement-quantity">Menge manuell</Label><Input id="measurement-quantity" type="number" min="0" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder={calculatedQuantity ? calculatedQuantity.toFixed(3) : "automatisch"} /></div>
              <div><Label>Einheit</Label><Select value={form.unit} onValueChange={(unit) => setForm({ ...form, unit })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["m²", "lfm", "m³", "Stk", "Std"].map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2"><p className="rounded-lg bg-brand/5 px-3 py-2 text-sm font-medium text-brand">Ermittelte Menge: {calculatedQuantity.toLocaleString("de-DE", { maximumFractionDigits: 3 })} {form.unit}</p></div>
              <div className="sm:col-span-2"><Label htmlFor="measurement-notes">Notizen</Label><Textarea id="measurement-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" disabled={saving || !form.customerId} className="bg-brand text-white hover:bg-brand/90">{saving ? "Speichert …" : "Aufmaß speichern"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
