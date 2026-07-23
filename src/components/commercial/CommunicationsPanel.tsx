import { useState, type FormEvent } from "react";
import { ExternalLink, Mail, Phone, Plus } from "lucide-react";
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
import { customerName } from "@/lib/commercial";
import { formatDate } from "@/lib/handwerk";

type CommunicationsPanelProps = {
  data: CommercialData;
  tenantId: string;
  userId: string;
  canWrite: boolean;
  onChanged: () => Promise<void>;
};

const initialForm = { customerId: "", subject: "", body: "" };

export function CommunicationsPanel({ data, tenantId, userId, canWrite, onChanged }: CommunicationsPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const customersById = new Map(data.customers.map((customer) => [customer.id, customer]));
  const selectedCustomer = customersById.get(form.customerId);

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomer) return;
    setSaving(true);
    const { error } = await supabase.from("communications").insert({
      tenant_id: tenantId,
      created_by: userId,
      customer_id: selectedCustomer.id,
      channel: "email",
      direction: "outbound",
      status: "draft",
      subject: form.subject.trim(),
      body: form.body.trim(),
      recipients: selectedCustomer.email ? [selectedCustomer.email] : [],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("E-Mail-Entwurf im Kundenverlauf gespeichert");
    setForm(initialForm);
    setOpen(false);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div><h2 className="font-display text-lg font-bold">Kundenkommunikation</h2><p className="text-sm text-muted-foreground">E-Mail-Entwürfe und Kontakte nachvollziehbar beim Kunden ablegen.</p></div>
        {canWrite && <Button type="button" onClick={() => setOpen(true)} disabled={!data.customers.length} className="bg-brand text-white hover:bg-brand/90"><Plus className="h-4 w-4" /> E-Mail-Entwurf</Button>}
      </header>
      <div className="p-4 sm:p-5">
        {data.communications.length ? (
          <div className="space-y-3">
            {data.communications.map((communication) => {
              const customer = customersById.get(communication.customer_id);
              const recipient = Array.isArray(communication.recipients) && typeof communication.recipients[0] === "string" ? communication.recipients[0] : customer?.email;
              const mailto = recipient ? `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(communication.subject ?? "")}&body=${encodeURIComponent(communication.body ?? "")}` : null;
              return (
                <article key={communication.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600">{communication.channel === "phone" ? <Phone className="h-5 w-5" /> : <Mail className="h-5 w-5" />}</span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{communication.subject || "Ohne Betreff"}</h3><Badge variant="secondary">{communication.status === "draft" ? "Entwurf" : communication.status}</Badge></div><p className="text-xs text-muted-foreground">{customerName(customer)} · {formatDate(communication.created_at)}</p>{communication.body && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{communication.body}</p>}</div>
                  {mailto && <Button asChild variant="outline" size="sm"><a href={mailto}>E-Mail öffnen <ExternalLink className="h-3.5 w-3.5" /></a></Button>}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center"><div><Mail className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium">Noch keine Kommunikation</p><p className="text-sm text-muted-foreground">Speichere Kundenmails als Entwurf im Verlauf.</p></div></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={saveDraft}>
            <DialogHeader><DialogTitle>E-Mail-Entwurf speichern</DialogTitle></DialogHeader>
            <div className="space-y-4 py-5">
              <div><Label>Kunde</Label><Select value={form.customerId} onValueChange={(customerId) => setForm({ ...form, customerId })} required><SelectTrigger><SelectValue placeholder="Kunde auswählen" /></SelectTrigger><SelectContent>{data.customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customerName(customer)}{customer.email ? ` · ${customer.email}` : " · ohne E-Mail"}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="communication-subject">Betreff</Label><Input id="communication-subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></div>
              <div><Label htmlFor="communication-body">Nachricht</Label><Textarea id="communication-body" rows={8} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required /></div>
              {!selectedCustomer?.email && form.customerId && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Für diesen Kunden ist noch keine E-Mail-Adresse hinterlegt. Der Entwurf kann trotzdem gespeichert werden.</p>}
              <p className="text-xs text-muted-foreground">Der Entwurf wird im Kundenverlauf gespeichert. Der tatsächliche Versand erfolgt derzeit über dein E-Mail-Programm.</p>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" disabled={saving || !selectedCustomer} className="bg-brand text-white hover:bg-brand/90">{saving ? "Speichert …" : "Entwurf speichern"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
