import { useState, type FormEvent } from "react";
import { FileCheck2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { CommercialData } from "@/lib/commercial";
import { customerName, documentNumber, INVOICE_STATUS } from "@/lib/commercial";
import { formatDate, formatEur } from "@/lib/handwerk";

type InvoicesPanelProps = {
  data: CommercialData;
  tenantId: string;
  userId: string;
  canWrite: boolean;
  onChanged: () => Promise<void>;
};

export function InvoicesPanel({ data, tenantId, userId, canWrite, onChanged }: InvoicesPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offerId, setOfferId] = useState("");
  const [dueDays, setDueDays] = useState("14");
  const customersById = new Map(data.customers.map((customer) => [customer.id, customer]));
  const selectedOffer = data.offers.find((offer) => offer.id === offerId);
  const invoicedOfferIds = new Set(data.invoices.map((invoice) => invoice.offer_id).filter(Boolean));
  const eligibleOffers = data.offers.filter((offer) => !invoicedOfferIds.has(offer.id) && !["rejected", "expired"].includes(offer.status));

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOffer) return;
    setSaving(true);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (Number(dueDays) || 14));

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        customer_id: selectedOffer.customer_id,
        site_id: selectedOffer.site_id,
        offer_id: selectedOffer.id,
        invoice_number: documentNumber("RE"),
        due_date: dueDate.toISOString().slice(0, 10),
        subject: selectedOffer.subject,
        net_amount: selectedOffer.net_amount,
        tax_rate: selectedOffer.tax_rate,
        tax_amount: selectedOffer.tax_amount,
        gross_amount: selectedOffer.gross_amount,
      })
      .select("id")
      .single();

    if (error || !invoice) {
      setSaving(false);
      return toast.error(error?.message ?? "Rechnung konnte nicht angelegt werden");
    }

    const { data: offerItems, error: itemsReadError } = await supabase.from("offer_items").select("*").eq("offer_id", selectedOffer.id).order("position");
    if (itemsReadError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      setSaving(false);
      return toast.error(itemsReadError.message);
    }

    if (offerItems?.length) {
      const { error: itemsWriteError } = await supabase.from("invoice_items").insert(
        offerItems.map((item) => ({
          tenant_id: tenantId,
          invoice_id: invoice.id,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
        })),
      );
      if (itemsWriteError) {
        await supabase.from("invoices").delete().eq("id", invoice.id);
        setSaving(false);
        return toast.error(itemsWriteError.message);
      }
    }

    setSaving(false);
    toast.success("Rechnungsentwurf aus Angebot erstellt");
    setOfferId("");
    setOpen(false);
    await onChanged();
  }

  async function updateStatus(id: string, status: string, grossAmount: number) {
    const now = new Date().toISOString();
    const patch = {
      status,
      issued_at: status === "issued" ? now : undefined,
      paid_at: status === "paid" ? now : undefined,
      paid_amount: status === "paid" ? grossAmount : undefined,
    };
    const { error } = await supabase.from("invoices").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rechnungsstatus aktualisiert");
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div><h2 className="font-display text-lg font-bold">Rechnungen & Zahlung</h2><p className="text-sm text-muted-foreground">Angebot übernehmen, Fälligkeit überwachen und Zahlung verbuchen.</p></div>
        {canWrite && <Button type="button" onClick={() => setOpen(true)} disabled={!eligibleOffers.length} className="bg-brand text-white hover:bg-brand/90"><Plus className="h-4 w-4" /> Rechnung aus Angebot</Button>}
      </header>
      <div className="p-4 sm:p-5">
        {data.invoices.length ? (
          <div className="space-y-3">
            {data.invoices.map((invoice) => {
              const overdue = invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10) && !["paid", "cancelled"].includes(invoice.status);
              return (
                <article key={invoice.id} className={`grid gap-3 rounded-xl border p-4 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center ${overdue ? "border-amber-300 bg-amber-50/50" : "border-border"}`}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><FileCheck2 className="h-5 w-5" /></span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{invoice.subject}</h3><span className="font-mono text-xs text-muted-foreground">{invoice.invoice_number}</span>{overdue && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Überfällig</Badge>}</div><p className="text-xs text-muted-foreground">{customerName(customersById.get(invoice.customer_id))} · fällig {formatDate(invoice.due_date)}</p></div>
                  <div className="text-right"><p className="font-semibold">{formatEur(invoice.gross_amount)}</p><p className="text-xs text-muted-foreground">offen {formatEur(Math.max(0, Number(invoice.gross_amount) - Number(invoice.paid_amount)))}</p></div>
                  {canWrite ? (
                    <Select value={invoice.status} onValueChange={(status) => updateStatus(invoice.id, status, Number(invoice.gross_amount))}><SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(INVOICE_STATUS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
                  ) : <Badge variant="secondary">{INVOICE_STATUS[invoice.status] ?? invoice.status}</Badge>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center"><div><FileCheck2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium">Noch keine Rechnung</p><p className="text-sm text-muted-foreground">{eligibleOffers.length ? "Übernimm ein Angebot ohne erneute Eingabe." : "Lege zuerst ein Angebot an."}</p></div></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={createInvoice}>
            <DialogHeader><DialogTitle>Rechnung aus Angebot erstellen</DialogTitle></DialogHeader>
            <div className="space-y-4 py-5">
              <div><Label>Angebot</Label><Select value={offerId} onValueChange={setOfferId} required><SelectTrigger><SelectValue placeholder="Angebot auswählen" /></SelectTrigger><SelectContent>{eligibleOffers.map((offer) => <SelectItem key={offer.id} value={offer.id}>{offer.offer_number} · {offer.subject} · {formatEur(offer.gross_amount)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="invoice-due-days">Zahlungsziel in Tagen</Label><Input id="invoice-due-days" type="number" min="1" value={dueDays} onChange={(event) => setDueDays(event.target.value)} /></div>
              {selectedOffer && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">{selectedOffer.subject}</p><p className="mt-1 text-muted-foreground">{customerName(customersById.get(selectedOffer.customer_id))}</p><p className="mt-3 text-lg font-bold">{formatEur(selectedOffer.gross_amount)}</p><p className="text-xs text-muted-foreground">Positionen und Beträge werden vollständig übernommen.</p></div>}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" disabled={saving || !selectedOffer} className="bg-brand text-white hover:bg-brand/90">{saving ? "Erstellt …" : "Entwurf erstellen"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
