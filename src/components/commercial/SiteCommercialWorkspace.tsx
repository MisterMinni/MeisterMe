import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  CalendarCheck2,
  CircleAlert,
  CircleCheckBig,
  ClipboardCheck,
  Clock3,
  Euro,
  FileCheck2,
  FileText,
  HardHat,
  ReceiptText,
  Ruler,
  UsersRound,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoicesPanel } from "@/components/commercial/InvoicesPanel";
import { CommunicationsPanel } from "@/components/commercial/CommunicationsPanel";
import { MeasurementsPanel } from "@/components/commercial/MeasurementsPanel";
import { OffersPanel } from "@/components/commercial/OffersPanel";
import { useSetPageHeader } from "@/components/page-header-context";
import { customerName, SITE_STATUS_LABELS } from "@/lib/commercial";
import { formatDate, formatEur, useHasPermission } from "@/lib/handwerk";
import { useCommercialOffice } from "@/lib/use-commercial-office";

const processSteps = [
  { id: "auftrag", label: "Auftrag", detail: "Kunde & Baustelle", icon: BriefcaseBusiness },
  { id: "aufmass", label: "Aufmaß", detail: "Mengen & Bereiche", icon: Ruler },
  { id: "angebot", label: "Kalkulation & Angebot", detail: "Leistung & Preis", icon: FileText },
  {
    id: "ausfuehrung",
    label: "Ausführung & Abnahme",
    detail: "Zeit, Material, Nachträge",
    icon: HardHat,
  },
  {
    id: "rechnung",
    label: "Rechnung & Zahlung",
    detail: "Fälligkeit & Mahnung",
    icon: ReceiptText,
  },
  {
    id: "nachkalkulation",
    label: "Nachkalkulation",
    detail: "Soll/Ist & Abschluss",
    icon: ClipboardCheck,
  },
] as const;

export function SiteCommercialWorkspace({ siteId }: { siteId: string }) {
  useSetPageHeader({ title: "Auftrag bearbeiten", backTo: "/app/buero" });
  const office = useCommercialOffice();
  const canWriteMeasurements = useHasPermission("measurements:write");
  const canWriteOffers = useHasPermission("offers:write");
  const canWriteInvoices = useHasPermission("invoices:write");
  const canWriteCommunications = useHasPermission("communications:write");

  if (office.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Auftrag konnte nicht geladen werden</AlertTitle>
        <AlertDescription>
          {office.error instanceof Error ? office.error.message : "Bitte versuche es erneut."}
        </AlertDescription>
      </Alert>
    );
  }

  if (office.isLoading || !office.data || !office.profile || !office.tenantId) {
    return (
      <div
        className="h-96 animate-pulse rounded-2xl bg-slate-100"
        aria-label="Auftrag wird geladen"
      />
    );
  }

  const data = office.data;
  const site = data.sites.find((item) => item.id === siteId);
  if (!site) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Baustelle nicht gefunden</AlertTitle>
        <AlertDescription>
          Die Baustelle wurde möglicherweise archiviert oder du hast keinen Zugriff mehr.
        </AlertDescription>
      </Alert>
    );
  }

  const customer = data.customers.find((item) => item.id === site.customer_id);
  const measurements = data.measurements.filter((measurement) => measurement.site_id === site.id);
  const offers = data.offers.filter((offer) => offer.site_id === site.id);
  const invoices = data.invoices.filter((invoice) => invoice.site_id === site.id);
  const timeEntries = data.timeEntries.filter((entry) => entry.project_id === site.id);
  const minutes = timeEntries.reduce((sum, entry) => sum + Number(entry.minuten ?? 0), 0);
  const acceptedNet = offers
    .filter((offer) => offer.status === "accepted")
    .reduce((sum, offer) => sum + Number(offer.net_amount), 0);
  const invoicedNet = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Number(invoice.net_amount), 0);
  const invoiceGross = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Number(invoice.gross_amount), 0);
  const paidGross = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Number(invoice.paid_amount), 0);
  const outstanding = Math.max(0, invoiceGross - paidGross);
  const executionStarted =
    minutes > 0 || ["in_arbeit", "abgeschlossen", "abgerechnet"].includes(site.status ?? "");
  const completion = [
    Boolean(customer),
    measurements.length > 0,
    offers.length > 0,
    executionStarted,
    invoices.length > 0,
    invoices.some((invoice) => invoice.status === "paid") || site.status === "abgerechnet",
  ];
  const shared = {
    data,
    tenantId: office.tenantId,
    userId: office.profile.id,
    onChanged: office.refreshCommercialOffice,
    customerId: customer?.id,
    siteId: site.id,
  };

  return (
    <div className="space-y-6">
      <section
        id="auftrag"
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-card scroll-mt-24"
      >
        <div className="bg-gradient-to-r from-[#eaf5ff] via-white to-emerald-50 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-brand text-white">Auftragsakte</Badge>
                <Badge variant="secondary">
                  {SITE_STATUS_LABELS[site.status ?? ""] ?? site.status ?? "Offen"}
                </Badge>
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{site.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {site.adresse || site.beschreibung || "Noch keine Auftragsbeschreibung"}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-brand" />
                  {customer ? customerName(customer) : "Noch kein Kunde zugeordnet"}
                </span>
                {(site.start_date || site.start_datum) && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarCheck2 className="h-4 w-4 text-brand" />
                    Start {formatDate(site.start_date || site.start_datum || "")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {customer && (
                <Button asChild variant="outline">
                  <Link to="/app/kunden/$customerId" params={{ customerId: customer.id }}>
                    Kundenakte
                  </Link>
                </Button>
              )}
              <Button asChild className="bg-brand text-white hover:bg-brand/90">
                <Link to="/app/baustellen/$id" params={{ id: site.id }}>
                  Baustellenakte <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <OrderMetric
              icon={FileCheck2}
              label="Auftragswert netto"
              value={formatEur(acceptedNet)}
            />
            <OrderMetric
              icon={Clock3}
              label="Erfasste Zeit"
              value={`${(minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`}
            />
            <OrderMetric icon={Euro} label="Fakturiert netto" value={formatEur(invoicedNet)} />
            <OrderMetric
              icon={CircleAlert}
              label="Offener Betrag"
              value={formatEur(outstanding)}
              warning={outstanding > 0}
            />
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Auftragsablauf</CardTitle>
          <CardDescription>
            Arbeite von links nach rechts. Bestehende Daten werden automatisch als erledigt
            markiert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {processSteps.map(({ id, label, detail, icon: Icon }, index) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`group flex h-full items-start gap-3 rounded-xl border p-3 transition hover:border-brand/40 hover:bg-brand/[0.03] ${
                    completion[index] ? "border-emerald-200 bg-emerald-50/50" : "border-border"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${completion[index] ? "bg-emerald-500 text-white" : "bg-secondary text-brand"}`}
                  >
                    {completion[index] ? (
                      <CircleCheckBig className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">
                      {index + 1}. {label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                      {detail}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {!customer && (
        <Alert>
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Vor Angebot und Rechnung zuerst einen Kunden zuordnen</AlertTitle>
          <AlertDescription>
            Ein Aufmaß kann bereits zur Baustelle erfasst werden. Für rechtsgültige Belege benötigt
            der Auftrag jedoch einen Rechnungsempfänger.
          </AlertDescription>
        </Alert>
      )}

      <WorkflowSection
        id="aufmass"
        number={2}
        icon={Ruler}
        title="Aufmaß"
        description="Flächen, Längen, Stückzahlen und Abzüge direkt diesem Auftrag zuordnen."
      >
        <MeasurementsPanel {...shared} canWrite={canWriteMeasurements} />
      </WorkflowSection>

      <WorkflowSection
        id="angebot"
        number={3}
        icon={FileText}
        title="Vorkalkulation & Angebot"
        description="Aufmaß und Leistungspositionen werden gemeinsam kalkuliert; das Angebot ist das Ergebnis der Vorkalkulation."
      >
        {customer ? (
          <OffersPanel {...shared} canWrite={canWriteOffers} />
        ) : (
          <BlockedStep text="Ordne der Baustelle zuerst einen Kunden zu, bevor du ein Angebot erstellst." />
        )}
      </WorkflowSection>

      <WorkflowSection
        id="ausfuehrung"
        number={4}
        icon={HardHat}
        title="Ausführung, Nachträge & Abnahme"
        description="Zeiten, Aufgaben, Fotos, Materialverbrauch, Zusatzleistungen und Abnahme gehören in die Baustellenakte."
      >
        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid gap-3 sm:grid-cols-3">
              <ExecutionMetric
                icon={Clock3}
                label="Arbeitszeit"
                value={`${(minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`}
              />
              <ExecutionMetric
                icon={Boxes}
                label="Material"
                value="Noch nicht erfasst"
                detail="Lager & Verbrauch folgen"
              />
              <ExecutionMetric
                icon={ClipboardCheck}
                label="Abnahme"
                value={
                  site.status === "abgeschlossen" || site.status === "abgerechnet"
                    ? "Erledigt"
                    : "Offen"
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/app/buero/stammdaten">Materialstamm</Link>
              </Button>
              <Button asChild className="bg-brand text-white hover:bg-brand/90">
                <Link to="/app/baustellen/$id" params={{ id: site.id }}>
                  Baustellenakte öffnen
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        {customer && <CommunicationsPanel {...shared} canWrite={canWriteCommunications} />}
      </WorkflowSection>

      <WorkflowSection
        id="rechnung"
        number={5}
        icon={ReceiptText}
        title="Rechnung & Zahlung"
        description="Aus dem Angebot entsteht die Rechnung; Abschläge, Teilrechnungen, Zahlung und Mahnwesen werden hier gebündelt."
      >
        {customer ? (
          <InvoicesPanel {...shared} canWrite={canWriteInvoices} />
        ) : (
          <BlockedStep text="Für die Rechnung fehlt noch der zugeordnete Kunde." />
        )}
      </WorkflowSection>

      <WorkflowSection
        id="nachkalkulation"
        number={6}
        icon={ClipboardCheck}
        title="Nachkalkulation & Abschluss"
        description="Soll und Ist werden zusammengeführt, damit du profitable Leistungen und Abweichungen erkennst."
      >
        <PostCalculation
          acceptedNet={acceptedNet}
          invoicedNet={invoicedNet}
          minutes={minutes}
          outstanding={outstanding}
          hasMeasurements={measurements.length > 0}
        />
      </WorkflowSection>
    </div>
  );
}

function OrderMetric({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white/85 p-3 ${warning ? "border-amber-300" : "border-white"}`}
    >
      <Icon className={`h-4 w-4 ${warning ? "text-amber-700" : "text-brand"}`} />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function WorkflowSection({
  id,
  number,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  number: number;
  icon: typeof Ruler;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <div className="flex items-start gap-3 px-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-brand" />
            <h2 className="font-display text-xl font-bold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ExecutionMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
        {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function BlockedStep({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
        <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" />
        {text}
      </CardContent>
    </Card>
  );
}

function PostCalculation({
  acceptedNet,
  invoicedNet,
  minutes,
  outstanding,
  hasMeasurements,
}: {
  acceptedNet: number;
  invoicedNet: number;
  minutes: number;
  outstanding: number;
  hasMeasurements: boolean;
}) {
  const hours = minutes / 60;
  const variance = invoicedNet - acceptedNet;
  const isReady = acceptedNet > 0 && invoicedNet > 0 && hours > 0;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CalculationMetric label="Soll-Umsatz netto" value={formatEur(acceptedNet)} />
          <CalculationMetric label="Ist-Umsatz netto" value={formatEur(invoicedNet)} />
          <CalculationMetric
            label="Abweichung"
            value={formatEur(variance)}
            positive={variance >= 0 && invoicedNet > 0}
            warning={variance < 0}
          />
          <CalculationMetric
            label="Ist-Stunden"
            value={hours.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
          />
          <CalculationMetric
            label="Umsatz je Stunde"
            value={hours ? formatEur(invoicedNet / hours) : "—"}
          />
        </div>
        <div
          className={`mt-5 rounded-xl border p-4 text-sm ${isReady ? "border-emerald-200 bg-emerald-50/60" : "border-border bg-secondary/40"}`}
        >
          <div className="flex items-start gap-3">
            {isReady ? (
              <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div>
              <p className="font-semibold">
                {isReady
                  ? "Umsatzbasierte Nachkalkulation verfügbar"
                  : "Für die Nachkalkulation fehlen noch Auftragsdaten"}
              </p>
              <p className="mt-1 leading-5 text-muted-foreground">
                {isReady
                  ? `Auftrag, Rechnung und Zeit sind vergleichbar. Offene Zahlung: ${formatEur(outstanding)}. Für den vollständigen Deckungsbeitrag werden im nächsten Schritt Lohnkosten, Material-Istverbrauch und Fremdleistungen ergänzt.`
                  : `Benötigt werden ${[!hasMeasurements && "Aufmaß", acceptedNet <= 0 && "angenommenes Angebot", hours <= 0 && "Ist-Zeiten", invoicedNet <= 0 && "Rechnung"].filter(Boolean).join(", ")}.`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalculationMetric({
  label,
  value,
  positive = false,
  warning = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-lg font-bold ${positive ? "text-emerald-600" : warning ? "text-amber-700" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
