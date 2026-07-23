import { useMemo, useState, type FormEvent } from "react";
import { Boxes, Plus, Search } from "lucide-react";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/supabase/client";
import type { CommercialData } from "@/lib/commercial";
import { formatEur, GEWERKE } from "@/lib/handwerk";

type MaterialsPanelProps = {
  data: CommercialData;
  tenantId: string;
  userId: string;
  canWrite: boolean;
  onChanged: () => Promise<void>;
};

const initialForm = {
  sku: "",
  name: "",
  category: "",
  trade: "ausbau",
  unit: "Stk",
  purchasePrice: "0",
  salesPrice: "0",
  wastePercent: "0",
  supplier: "",
};

export function MaterialsPanel({ data, tenantId, canWrite, onChanged }: MaterialsPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de");
    if (!term) return data.materials;
    return data.materials.filter((material) =>
      [material.name, material.sku, material.category, material.supplier]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(term),
    );
  }, [data.materials, search]);

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("materials").insert({
      tenant_id: tenantId,
      sku: form.sku.trim() || null,
      name: form.name.trim(),
      category: form.category.trim() || null,
      trade: form.trade as never,
      unit: form.unit,
      purchase_price: Number(form.purchasePrice) || 0,
      sales_price: Number(form.salesPrice) || 0,
      waste_percent: Number(form.wastePercent) || 0,
      supplier: form.supplier.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Material angelegt");
    setForm(initialForm);
    setOpen(false);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Material- & Leistungskatalog</h2>
          <p className="text-sm text-muted-foreground">
            Einkauf, Verkauf, Verschnitt und Lieferant zentral pflegen.
          </p>
        </div>
        {canWrite && (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" /> Material
          </Button>
        )}
      </header>
      <div className="p-4 sm:p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Material, Artikelnummer, Lieferant …"
            className="pl-9"
          />
        </div>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Artikel</th>
                  <th className="px-3 py-2 font-medium">Kategorie</th>
                  <th className="px-3 py-2 text-right font-medium">EK</th>
                  <th className="px-3 py-2 text-right font-medium">VK</th>
                  <th className="px-3 py-2 text-right font-medium">Aufschlag</th>
                  <th className="px-3 py-2 font-medium">Lieferant</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((material) => {
                  const markup =
                    material.purchase_price > 0
                      ? ((material.sales_price - material.purchase_price) /
                          material.purchase_price) *
                        100
                      : 0;
                  return (
                    <tr key={material.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <div className="font-medium">{material.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {material.sku ?? "ohne Nr."} · {material.unit} · {material.waste_percent}%
                          Verschnitt
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary">{material.category ?? "Allgemein"}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right">{formatEur(material.purchase_price)}</td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {formatEur(material.sales_price)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {markup.toLocaleString("de-DE", { maximumFractionDigits: 1 })}%
                      </td>
                      <td className="px-3 py-3">{material.supplier ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center">
            <div>
              <Boxes className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium">Noch kein Material</p>
              <p className="text-sm text-muted-foreground">
                Pflege häufig verwendete Produkte für belastbare Kalkulationen.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={saveMaterial}>
            <DialogHeader>
              <DialogTitle>Material anlegen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="material-sku">Artikelnummer</Label>
                <Input
                  id="material-sku"
                  value={form.sku}
                  onChange={(event) => setForm({ ...form, sku: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="material-name">Bezeichnung</Label>
                <Input
                  id="material-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="material-category">Kategorie</Label>
                <Input
                  id="material-category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="Farbe, Putz, Platte …"
                />
              </div>
              <div>
                <Label>Gewerk</Label>
                <Select value={form.trade} onValueChange={(trade) => setForm({ ...form, trade })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEWERKE.map((trade) => (
                      <SelectItem key={trade.value} value={trade.value}>
                        {trade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Einheit</Label>
                <Select value={form.unit} onValueChange={(unit) => setForm({ ...form, unit })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Stk", "kg", "l", "m", "m²", "m³", "Gebinde", "Sack"].map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="material-waste">Verschnitt %</Label>
                <Input
                  id="material-waste"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.wastePercent}
                  onChange={(event) => setForm({ ...form, wastePercent: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="material-purchase">Einkaufspreis netto</Label>
                <Input
                  id="material-purchase"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="material-sales">Verkaufspreis netto</Label>
                <Input
                  id="material-sales"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salesPrice}
                  onChange={(event) => setForm({ ...form, salesPrice: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="material-supplier">Lieferant</Label>
                <Input
                  id="material-supplier"
                  value={form.supplier}
                  onChange={(event) => setForm({ ...form, supplier: event.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {saving ? "Speichert …" : "Material anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
