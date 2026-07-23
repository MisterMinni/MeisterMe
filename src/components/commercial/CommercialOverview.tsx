import { ArrowRight, CircleAlert, CircleCheckBig, Euro, FileText, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CommercialData, Customer } from "@/lib/commercial";
import { formatEur } from "@/lib/handwerk";

type CommercialOverviewProps = {
  data: CommercialData;
  customers: Customer[];
  onOpen: (tab: string) => void;
};

export function CommercialOverview({ data, customers, onOpen }: CommercialOverviewProps) {
  const openOffers = data.offers.filter((offer) => !["accepted", "rejected", "expired"].includes(offer.status));
  const openInvoices = data.invoices.filter((invoice) => !["paid", "cancelled"].includes(invoice.status));
  const overdue = openInvoices.filter((invoice) => invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10));
  const outstanding = openInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.gross_amount) - Number(invoice.paid_amount)),
    0,
  );
  const projectRows = data.sites
    .map((site) => {
      const minutes = data.timeEntries.filter((entry) => entry.project_id === site.id).reduce((sum, entry) => sum + Number(entry.minuten ?? 0), 0);
      const revenue = data.invoices.filter((invoice) => invoice.site_id === site.id && invoice.status !== "cancelled").reduce((sum, invoice) => sum + Number(invoice.net_amount), 0);
      const orderValue = data.offers.filter((offer) => offer.site_id === site.id && offer.status === "accepted").reduce((sum, offer) => sum + Number(offer.net_amount), 0);
      return { site, minutes, revenue, orderValue };
    })
    .filter((row) => row.minutes || row.revenue || row.orderValue)
    .sort((a, b) => b.revenue + b.orderValue - (a.revenue + a.orderValue))
    .slice(0, 6);

  const cards = [
    { label: "Kunden", value: customers.length.toString(), hint: "im Kundenstamm", icon: UsersRound, tab: "customers" },
    { label: "Offene Angebote", value: openOffers.length.toString(), hint: formatEur(openOffers.reduce((sum, offer) => sum + Number(offer.gross_amount), 0)), icon: FileText, tab: "offers" },
    { label: "Offene Forderungen", value: formatEur(outstanding), hint: `${openInvoices.length} Rechnungen`, icon: Euro, tab: "invoices" },
    { label: "Überfällig", value: overdue.length.toString(), hint: overdue.length ? "bitte nachfassen" : "alles im Plan", icon: overdue.length ? CircleAlert : CircleCheckBig, tab: "invoices" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, tab }) => (
          <button
            key={label}
            type="button"
            onClick={() => onOpen(tab)}
            className="rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="h-5 w-5" /></span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-5 text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Auftrag ohne doppelte Eingabe</h2>
            <p className="mt-1 text-sm text-muted-foreground">Die Daten wandern von links nach rechts durch den kaufmännischen Ablauf.</p>
          </div>
          <Button type="button" onClick={() => onOpen(customers.length ? "offers" : "customers")} className="bg-brand text-white hover:bg-brand/90">
            {customers.length ? "Angebot anlegen" : "Ersten Kunden anlegen"}
          </Button>
        </div>
        <ol className="mt-6 grid gap-3 md:grid-cols-4">
          {["Kunde erfassen", "Aufmaß dokumentieren", "Angebot kalkulieren", "Rechnung stellen"].map((step, index) => (
            <li key={step} className="flex items-center gap-3 rounded-xl bg-secondary/70 p-3 text-sm font-medium">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Projektüberblick & Nachkalkulation</h2>
          <p className="mt-1 text-sm text-muted-foreground">Erfasste Arbeitszeit und fakturierter Nettoumsatz pro Baustelle.</p>
        </div>
        {projectRows.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Baustelle</th><th className="px-3 py-2 text-right font-medium">Stunden</th><th className="px-3 py-2 text-right font-medium">Auftragswert netto</th><th className="px-3 py-2 text-right font-medium">Fakturiert netto</th><th className="px-3 py-2 text-right font-medium">Umsatz / Std.</th></tr></thead>
              <tbody>{projectRows.map(({ site, minutes, orderValue, revenue }) => <tr key={site.id} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{site.name}</td><td className="px-3 py-3 text-right">{(minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 2 })}</td><td className="px-3 py-3 text-right">{formatEur(orderValue)}</td><td className="px-3 py-3 text-right font-semibold">{formatEur(revenue)}</td><td className="px-3 py-3 text-right">{minutes ? formatEur(revenue / (minutes / 60)) : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Sobald Zeiten und Rechnungen einer Baustelle zugeordnet sind, erscheint hier die erste Nachkalkulation.</p>}
      </section>
    </div>
  );
}
