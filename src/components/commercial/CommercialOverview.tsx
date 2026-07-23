import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CircleAlert,
  CircleCheckBig,
  Euro,
  FileCheck2,
  FileText,
  ReceiptText,
  Search,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CommercialData, Customer, Site } from "@/lib/commercial";
import { customerName, SITE_STATUS_LABELS } from "@/lib/commercial";
import { formatEur } from "@/lib/handwerk";

type CustomerGroup = {
  customer: Customer | null;
  sites: Site[];
};

const workflowSteps = [
  "Auftrag",
  "Aufmaß",
  "Kalkulation & Angebot",
  "Ausführung & Abnahme",
  "Rechnung & Zahlung",
  "Nachkalkulation",
] as const;

export function CommercialOverview({ data }: { data: CommercialData }) {
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const openOffers = data.offers.filter(
    (offer) => !["accepted", "rejected", "expired"].includes(offer.status),
  );
  const openInvoices = data.invoices.filter(
    (invoice) => !["paid", "cancelled"].includes(invoice.status),
  );
  const overdueInvoices = openInvoices.filter(
    (invoice) => invoice.due_date && invoice.due_date < today,
  );
  const outstanding = openInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.gross_amount) - Number(invoice.paid_amount)),
    0,
  );

  const groups = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de");
    const customersById = new Map(data.customers.map((customer) => [customer.id, customer]));
    const grouped = new Map<string, CustomerGroup>();

    for (const customer of data.customers) {
      grouped.set(customer.id, { customer, sites: [] });
    }
    grouped.set("unassigned", { customer: null, sites: [] });
    for (const site of data.sites) {
      const key =
        site.customer_id && customersById.has(site.customer_id) ? site.customer_id : "unassigned";
      grouped.get(key)?.sites.push(site);
    }

    return [...grouped.values()]
      .filter(({ customer, sites }) => {
        if (!term) return customer !== null || sites.length > 0;
        const searchable = [
          customer ? customerName(customer) : "ohne kundenzuordnung",
          customer?.customer_number,
          customer?.email,
          ...sites.flatMap((site) => [site.name, site.adresse, site.beschreibung]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("de");
        return term.split(/\s+/).every((part) => searchable.includes(part));
      })
      .sort((a, b) => {
        if (!a.customer) return 1;
        if (!b.customer) return -1;
        return customerName(a.customer).localeCompare(customerName(b.customer), "de");
      });
  }, [data.customers, data.sites, search]);

  const shortcuts = [
    {
      to: "/app/buero/kunden",
      label: "Kunden",
      value: data.customers.length.toString(),
      hint: "Kontakte, Work-Segmente und Baustellen",
      icon: UsersRound,
    },
    {
      to: "/app/buero/belege",
      label: "Angebote & Rechnungen",
      value: openOffers.length.toString(),
      hint: `${formatEur(outstanding)} offene Forderungen`,
      icon: FileCheck2,
    },
    {
      to: "/app/buero/stammdaten",
      label: "Material & Leistungen",
      value: data.materials.length.toString(),
      hint: "Katalog, Einkaufspreise und Lagergrundlage",
      icon: Boxes,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Badge className="bg-brand text-white">Auftragsbüro</Badge>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              Kunden und Aufträge auf einen Blick
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Jeder Auftrag bleibt bei seiner Baustelle: vom Aufmaß über Kalkulation und Ausführung
              bis zur Zahlung und Nachkalkulation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[30rem]">
            <StatusMetric
              label="Offene Angebote"
              value={String(openOffers.length)}
              icon={FileText}
            />
            <StatusMetric
              label="Offene Rechnungen"
              value={String(openInvoices.length)}
              icon={ReceiptText}
            />
            <StatusMetric
              label="Überfällig"
              value={String(overdueInvoices.length)}
              icon={overdueInvoices.length ? CircleAlert : CircleCheckBig}
              warning={overdueInvoices.length > 0}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {shortcuts.map(({ to, label, value, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
              <CardContent className="flex h-full items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{label}</p>
                    <Badge variant="secondary">{value}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-4 border-b border-border lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="font-display text-xl">Kunden und Baustellen</CardTitle>
            <CardDescription className="mt-1">
              Öffne eine Baustelle, um den vollständigen kaufmännischen Ablauf ohne Bereichswechsel
              zu bearbeiten.
            </CardDescription>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kunde, Baustelle oder Adresse suchen …"
              className="pl-9"
              aria-label="Kunden und Baustellen suchen"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {groups.length ? (
            <div className="divide-y divide-border">
              {groups.map((group) => (
                <CustomerOrderGroup
                  key={group.customer?.id ?? "unassigned"}
                  group={group}
                  data={data}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <Building2 className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 font-medium">Keine passenden Kunden oder Baustellen</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Passe den Suchbegriff an oder lege zuerst einen Kunden an.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusMetric({
  label,
  value,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  icon: typeof Euro;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${warning ? "border-amber-300 bg-amber-50" : "border-border bg-secondary/50"}`}
    >
      <Icon className={`h-4 w-4 ${warning ? "text-amber-700" : "text-brand"}`} />
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CustomerOrderGroup({ group, data }: { group: CustomerGroup; data: CommercialData }) {
  const customer = group.customer;
  const customerOffers = customer
    ? data.offers.filter((offer) => offer.customer_id === customer.id)
    : [];
  const customerInvoices = customer
    ? data.invoices.filter((invoice) => invoice.customer_id === customer.id)
    : [];

  return (
    <section className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-brand">
            {customer ? (
              <UsersRound className="h-5 w-5" />
            ) : (
              <CircleAlert className="h-5 w-5 text-amber-600" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">
                {customer ? customerName(customer) : "Ohne Kundenzuordnung"}
              </h3>
              {customer?.customer_number && (
                <span className="font-mono text-xs text-muted-foreground">
                  {customer.customer_number}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {group.sites.length} {group.sites.length === 1 ? "Baustelle" : "Baustellen"}
              {customer
                ? ` · ${customerOffers.length} Angebote · ${customerInvoices.length} Rechnungen`
                : " · bitte Kunden zuordnen"}
            </p>
          </div>
        </div>
        {customer && (
          <Link
            to="/app/kunden/$customerId"
            params={{ customerId: customer.id }}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Kundenakte öffnen
          </Link>
        )}
      </div>

      {group.sites.length ? (
        <div className="mt-4 space-y-3">
          {group.sites.map((site) => (
            <SiteWorkflowRow key={site.id} site={site} data={data} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Für diesen Kunden ist noch keine Baustelle angelegt.
        </p>
      )}
    </section>
  );
}

function SiteWorkflowRow({ site, data }: { site: Site; data: CommercialData }) {
  const measurements = data.measurements.filter((measurement) => measurement.site_id === site.id);
  const offers = data.offers.filter((offer) => offer.site_id === site.id);
  const invoices = data.invoices.filter((invoice) => invoice.site_id === site.id);
  const minutes = data.timeEntries
    .filter((entry) => entry.project_id === site.id)
    .reduce((sum, entry) => sum + Number(entry.minuten ?? 0), 0);
  const hasAcceptedOffer = offers.some((offer) => offer.status === "accepted");
  const hasPaidInvoice = invoices.some((invoice) => invoice.status === "paid");
  const executionStarted =
    minutes > 0 || ["in_arbeit", "abgeschlossen", "abgerechnet"].includes(site.status ?? "");
  const completed = [
    Boolean(site.customer_id),
    measurements.length > 0,
    offers.length > 0,
    executionStarted,
    invoices.length > 0,
    hasPaidInvoice || site.status === "abgerechnet",
  ];
  const currentStep = Math.min(
    completed.findIndex((value) => !value),
    workflowSteps.length - 1,
  );

  return (
    <Link
      to="/app/buero/auftrag/$siteId"
      params={{ siteId: site.id }}
      className="group block rounded-xl border border-border bg-secondary/20 p-4 transition hover:border-brand/35 hover:bg-brand/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0 xl:w-72 xl:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-brand" />
            <h4 className="truncate font-semibold">{site.name}</h4>
            <Badge variant="secondary">
              {SITE_STATUS_LABELS[site.status ?? ""] ?? site.status ?? "Offen"}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {site.adresse || site.beschreibung || "Noch keine Auftragsbeschreibung"}
          </p>
        </div>

        <ol
          className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
          aria-label="Auftragsfortschritt"
        >
          {workflowSteps.map((step, index) => {
            const done = completed[index];
            const active = index === currentStep && !done;
            return (
              <li key={step} className="flex min-w-0 items-center gap-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-brand text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? <CircleCheckBig className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={`truncate text-[11px] ${active ? "font-semibold text-brand" : "text-muted-foreground"}`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand xl:block" />
      </div>
    </Link>
  );
}
