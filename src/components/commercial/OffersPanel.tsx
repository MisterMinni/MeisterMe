import { useState, type FormEvent } from "react";
import { FileText, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { CommercialData } from "@/lib/commercial";
import {
  calculateDocumentTotals,
  customerName,
  documentNumber,
  OFFER_STATUS,
} from "@/lib/commercial";
import { formatDate, formatEur } from "@/lib/handwerk";

type OffersPanelProps = {
  data: CommercialData;
  tenantId: string;
  userId: string;
  canWrite: boolean;
  onChanged: () => Promise<void>;
  customerId?: string;
  siteId?: string;
};

const initialForm = {
  customerId: "",
  siteId: "none",
  measurementId: "none",
  subject: "",
  description: "",
  quantity: "1",
  unit: "Stk",
  unitPrice: "0",
  discount: "0",
  taxRate: "19",
  validDays: "30",
  introduction: "Vielen Dank für Ihre Anfrage. Gerne bieten wir Ihnen folgende Leistungen an:",
  closingText: "Wir freuen uns auf Ihren Auftrag.",
};

export function OffersPanel({
  data,
  tenantId,
  userId,
  canWrite,
  onChanged,
  customerId: fixedCustomerId,
  siteId: fixedSiteId,
}: OffersPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ...initialForm,
    customerId: fixedCustomerId ?? "",
    siteId: fixedSiteId ?? "none",
  });
  const customersById = new Map(data.customers.map((customer) => [customer.id, customer]));
  const visibleOffers = fixedSiteId
    ? data.offers.filter((offer) => offer.site_id === fixedSiteId)
    : fixedCustomerId
      ? data.offers.filter((offer) => offer.customer_id === fixedCustomerId)
      : data.offers;
  const availableSites = data.sites.filter(
    (site) => !form.customerId || site.customer_id === form.customerId,
  );
  const totals = calculateDocumentTotals(
    Number(form.quantity) || 0,
    Number(form.unitPrice) || 0,
    Number(form.discount) || 0,
    Number(form.taxRate) || 0,
  );

  async function saveOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (Number(form.validDays) || 30));

    const { data: offer, error } = await supabase
      .from("offers")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        customer_id: form.customerId,
        site_id: form.siteId === "none" ? null : form.siteId,
        measurement_id: form.measurementId === "none" ? null : form.measurementId,
        offer_number: documentNumber("AN"),
        subject: form.subject.trim(),
        introduction: form.introduction.trim() || null,
        closing_text: form.closingText.trim() || null,
        valid_until: validUntil.toISOString().slice(0, 10),
        net_amount: totals.net,
        tax_rate: Number(form.taxRate) || 0,
        tax_amount: totals.tax,
        gross_amount: totals.gross,
      })
      .select("id")
      .single();

    if (error || !offer) {
      setSaving(false);
      return toast.error(error?.message ?? "Angebot konnte nicht angelegt werden");
    }

    const { error: itemError } = await supabase.from("offer_items").insert({
      tenant_id: tenantId,
      offer_id: offer.id,
      position: 1,
      description: form.description.trim(),
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      unit_price: Number(form.unitPrice) || 0,
      discount_percent: Number(form.discount) || 0,
      source: form.measurementId === "none" ? "manual" : "measurement",
    });

    if (itemError) {
      await supabase.from("offers").delete().eq("id", offer.id);
      setSaving(false);
      return toast.error(itemError.message);
    }

    setSaving(false);
    toast.success("Angebot angelegt");
    setForm({ ...initialForm, customerId: fixedCustomerId ?? "", siteId: fixedSiteId ?? "none" });
    setOpen(false);
    await onChanged();
  }

  async function updateStatus(id: string, status: string) {
    const patch = {
      status,
      sent_at: status === "sent" ? new Date().toISOString() : undefined,
      accepted_at: status === "accepted" ? new Date().toISOString() : undefined,
    };
    const { error } = await supabase.from("offers").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Angebotsstatus aktualisiert");
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Angebote</h2>
          <p className="text-sm text-muted-foreground">
            Kalkulation, Gültigkeit und Status in einem Ablauf.
          </p>
        </div>
        {canWrite && (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!data.customers.length}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" /> Angebot
          </Button>
        )}
      </header>
      <div className="p-4 sm:p-5">
        {visibleOffers.length ? (
          <div className="space-y-3">
            {visibleOffers.map((offer) => (
              <article
                key={offer.id}
                className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{offer.subject}</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {offer.offer_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {customerName(customersById.get(offer.customer_id))} · gültig bis{" "}
                    {formatDate(offer.valid_until)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatEur(offer.gross_amount)}</p>
                  <p className="text-xs text-muted-foreground">brutto</p>
                </div>
                {canWrite ? (
                  <Select
                    value={offer.status}
                    onValueChange={(status) => updateStatus(offer.id, status)}
                  >
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_STATUS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{OFFER_STATUS[offer.status] ?? offer.status}</Badge>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center">
            <div>
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium">Noch kein Angebot</p>
              <p className="text-sm text-muted-foreground">
                {data.customers.length
                  ? "Kalkuliere die erste Leistung mit Netto- und Bruttosumme."
                  : "Lege zuerst einen Kunden an."}
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={saveOffer}>
            <DialogHeader>
              <DialogTitle>Angebot kalkulieren</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              {!fixedCustomerId && (
                <div>
                  <Label>Kunde</Label>
                  <Select
                    value={form.customerId}
                    onValueChange={(customerId) =>
                      setForm({ ...form, customerId, siteId: "none", measurementId: "none" })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customerName(customer)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!fixedSiteId && (
                <div>
                  <Label>Baustelle</Label>
                  <Select
                    value={form.siteId}
                    onValueChange={(siteId) => setForm({ ...form, siteId, measurementId: "none" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ohne Baustellenzuordnung</SelectItem>
                      {availableSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={fixedCustomerId && fixedSiteId ? "sm:col-span-2" : undefined}>
                <Label>Aufmaß (optional)</Label>
                <Select
                  value={form.measurementId}
                  onValueChange={(measurementId) => setForm({ ...form, measurementId })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ohne Aufmaß</SelectItem>
                    {data.measurements
                      .filter(
                        (measurement) =>
                          (!form.customerId || measurement.customer_id === form.customerId) &&
                          (form.siteId === "none" || measurement.site_id === form.siteId),
                      )
                      .map((measurement) => (
                        <SelectItem key={measurement.id} value={measurement.id}>
                          {measurement.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="offer-subject">Betreff</Label>
                <Input
                  id="offer-subject"
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  placeholder="z. B. Malerarbeiten Erdgeschoss"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="offer-introduction">Einleitung</Label>
                <Textarea
                  id="offer-introduction"
                  value={form.introduction}
                  onChange={(event) => setForm({ ...form, introduction: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="offer-description">Position / Leistungstext</Label>
                <Textarea
                  id="offer-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Untergrund vorbereiten, grundieren und zweimal deckend beschichten"
                  required
                />
              </div>
              <div>
                <Label htmlFor="offer-quantity">Menge</Label>
                <Input
                  id="offer-quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Einheit</Label>
                <Select value={form.unit} onValueChange={(unit) => setForm({ ...form, unit })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Stk", "m²", "lfm", "m³", "Std", "pauschal"].map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="offer-price">Einzelpreis netto</Label>
                <Input
                  id="offer-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="offer-discount">Nachlass %</Label>
                <Input
                  id="offer-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.discount}
                  onChange={(event) => setForm({ ...form, discount: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="offer-tax">Umsatzsteuer %</Label>
                <Input
                  id="offer-tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.001"
                  value={form.taxRate}
                  onChange={(event) => setForm({ ...form, taxRate: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="offer-valid">Gültigkeit in Tagen</Label>
                <Input
                  id="offer-valid"
                  type="number"
                  min="1"
                  value={form.validDays}
                  onChange={(event) => setForm({ ...form, validDays: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <span className="block text-xs text-muted-foreground">Netto</span>
                  <strong>{formatEur(totals.net)}</strong>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">USt.</span>
                  <strong>{formatEur(totals.tax)}</strong>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Brutto</span>
                  <strong>{formatEur(totals.gross)}</strong>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="offer-closing">Schlusstext</Label>
                <Textarea
                  id="offer-closing"
                  value={form.closingText}
                  onChange={(event) => setForm({ ...form, closingText: event.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.customerId}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {saving ? "Speichert …" : "Angebot anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
