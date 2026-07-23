import { Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BrainCircuit, Plus, Search, UsersRound } from "lucide-react";
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
import { addressFromJson, customerName, documentNumber } from "@/lib/commercial";

type CustomersPanelProps = {
  data: CommercialData;
  tenantId: string;
  userId: string;
  canWrite: boolean;
  onChanged: () => Promise<void>;
};

const initialForm = {
  kind: "business",
  companyName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  postalCode: "",
  city: "",
  notes: "",
};

export function CustomersPanel({
  data,
  tenantId,
  userId,
  canWrite,
  onChanged,
}: CustomersPanelProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de");
    if (!term) return data.customers;
    return data.customers.filter((customer) =>
      [customerName(customer), customer.customer_number, customer.email, customer.phone]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("de")
        .includes(term),
    );
  }, [data.customers, search]);

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      tenant_id: tenantId,
      created_by: userId,
      customer_number: documentNumber("KD"),
      kind: form.kind,
      company_name: form.companyName.trim() || null,
      first_name: form.firstName.trim() || null,
      last_name: form.lastName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      billing_address: {
        street: form.street.trim(),
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        country: "DE",
      },
      site_address: {},
      source: "MeisterMe",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Kunde angelegt");
    setForm(initialForm);
    setOpen(false);
    await onChanged();
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Kunden & Kontakte</h2>
          <p className="text-sm text-muted-foreground">
            Zentrale Adressen für Baustellen, Angebote und Rechnungen.
          </p>
        </div>
        {canWrite && (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" /> Kunde
          </Button>
        )}
      </header>

      <div className="p-4 sm:p-5">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, Nummer, E-Mail …"
            className="pl-9"
          />
        </div>

        {filtered.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((customer) => {
              const address = addressFromJson(customer.billing_address);
              return (
                <article key={customer.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{customerName(customer)}</h3>
                      <p className="text-xs text-muted-foreground">
                        {customer.customer_number ?? "Ohne Kundennummer"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {customer.kind === "business"
                        ? "Betrieb"
                        : customer.kind === "public"
                          ? "Öffentlich"
                          : "Privat"}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-slate-600">
                    {customer.email && <p className="truncate">{customer.email}</p>}
                    {customer.phone && <p>{customer.phone}</p>}
                    {(address.street || address.city) && (
                      <p>
                        {[
                          address.street,
                          [address.postalCode, address.city].filter(Boolean).join(" "),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <Link
                    to="/app/kunden/$customerId"
                    params={{ customerId: customer.id }}
                    className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm font-semibold text-brand hover:underline"
                  >
                    <BrainCircuit className="h-4 w-4" /> Work-Segment öffnen{" "}
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center">
            <div>
              <UsersRound className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium">Noch keine passenden Kunden</p>
              <p className="text-sm text-muted-foreground">
                Lege den ersten Kunden als Grundlage für den Auftrag an.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={saveCustomer}>
            <DialogHeader>
              <DialogTitle>Neuen Kunden anlegen</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Kundentyp</Label>
                <Select value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Geschäftskunde</SelectItem>
                    <SelectItem value="private">Privatkunde</SelectItem>
                    <SelectItem value="public">Öffentlicher Auftraggeber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="customer-company">Firma</Label>
                <Input
                  id="customer-company"
                  value={form.companyName}
                  onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                  required={form.kind !== "private"}
                />
              </div>
              <div>
                <Label htmlFor="customer-first-name">Vorname</Label>
                <Input
                  id="customer-first-name"
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer-last-name">Nachname</Label>
                <Input
                  id="customer-last-name"
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  required={form.kind === "private"}
                />
              </div>
              <div>
                <Label htmlFor="customer-email">E-Mail</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Telefon</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="customer-street">Straße und Hausnummer</Label>
                <Input
                  id="customer-street"
                  value={form.street}
                  onChange={(event) => setForm({ ...form, street: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer-postal">PLZ</Label>
                <Input
                  id="customer-postal"
                  inputMode="numeric"
                  value={form.postalCode}
                  onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customer-city">Ort</Label>
                <Input
                  id="customer-city"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="customer-notes">Notizen</Label>
                <Textarea
                  id="customer-notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
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
                {saving ? "Speichert …" : "Kunde anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
