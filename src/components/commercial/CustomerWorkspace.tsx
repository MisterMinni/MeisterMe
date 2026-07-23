import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Activity,
  BrainCircuit,
  BriefcaseBusiness,
  CircleAlert,
  Clock3,
  Euro,
  FileCheck2,
  Mail,
  MessageSquareText,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CommunicationsPanel } from "@/components/commercial/CommunicationsPanel";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { generateCustomerWorkspace } from "@/lib/ai.functions";
import { addressFromJson, customerName } from "@/lib/commercial";
import { formatDate, formatEur, useHasPermission, useProfile } from "@/lib/handwerk";
import { useCustomerWorkspace, type CustomerWorkspaceData } from "@/lib/use-customer-workspace";

type CustomerWorkspaceProps = { customerId: string };

type TimelineEntry = {
  id: string;
  date: string;
  label: string;
  title: string;
  detail?: string | null;
  kind: "communication" | "site" | "offer" | "invoice" | "project";
};

export function CustomerWorkspace({ customerId }: CustomerWorkspaceProps) {
  const customerQuery = useCustomerWorkspace(customerId);
  const { data: profile } = useProfile();
  const runWorkspaceAnalysis = useServerFn(generateCustomerWorkspace);
  const canWriteCustomers = useHasPermission("customers:write");
  const canUseAi = useHasPermission("ai:use");
  const canWriteCommunications = useHasPermission("communications:write");
  const [analyzing, setAnalyzing] = useState(false);

  if (customerQuery.isLoading) {
    return (
      <div
        className="h-96 animate-pulse rounded-2xl bg-slate-100"
        aria-label="Kunden-Workspace wird geladen"
      />
    );
  }
  if (customerQuery.error || !customerQuery.data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Kunden-Workspace konnte nicht geladen werden:{" "}
        {customerQuery.error instanceof Error ? customerQuery.error.message : "Unbekannter Fehler"}
      </div>
    );
  }

  const data = customerQuery.data;
  const customer = data.customer;
  const workspace = data.workspace;
  const address = addressFromJson(customer.billing_address);
  const totalMinutes = data.timeEntries.reduce((sum, entry) => sum + Number(entry.minuten ?? 0), 0);
  const activeInvoices = data.invoices.filter((invoice) => invoice.status !== "cancelled");
  const invoiceGross = activeInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.gross_amount),
    0,
  );
  const paidGross = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount), 0);
  const openGross = Math.max(0, invoiceGross - paidGross);
  const acceptedOffers = data.offers.filter((offer) => offer.status === "accepted");
  const timeline = buildTimeline(data);
  const communicationData = {
    customers: [customer],
    communications: data.communications,
    inboundEmails: [],
    sites: data.sites,
  };

  async function analyzeCustomer() {
    setAnalyzing(true);
    try {
      await runWorkspaceAnalysis({ data: { customerId } });
      await customerQuery.refreshCustomerWorkspace();
      toast.success("Kunden-Briefing aktualisiert");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Kundenanalyse fehlgeschlagen");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="bg-gradient-to-r from-[#eaf5ff] via-white to-emerald-50 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-brand text-white">Work-Segment</Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {customer.customer_number ?? "Ohne Kundennummer"}
                </span>
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                {customerName(customer)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {[
                  customer.email,
                  customer.phone,
                  [address.postalCode, address.city].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(" · ") || "Noch keine Kontaktdaten"}
              </p>
            </div>
            {canWriteCustomers && canUseAi && (
              <Button
                type="button"
                onClick={analyzeCustomer}
                disabled={analyzing}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {analyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {workspace ? "Briefing aktualisieren" : "KI-Briefing erstellen"}
              </Button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric icon={BriefcaseBusiness} label="Baustellen" value={String(data.sites.length)} />
            <Metric
              icon={Clock3}
              label="Arbeitszeit"
              value={`${Math.round((totalMinutes / 60) * 10) / 10} Std.`}
            />
            <Metric
              icon={FileCheck2}
              label="Angenommene Angebote"
              value={String(acceptedOffers.length)}
            />
            <Metric icon={Euro} label="Fakturiert" value={formatEur(invoiceGross)} />
            <Metric
              icon={CircleAlert}
              label="Offen"
              value={formatEur(openGross)}
              emphasis={openGross > 0}
            />
          </div>
        </div>
      </section>

      <Tabs defaultValue="briefing" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max justify-start gap-1 p-1.5">
            <TabsTrigger value="briefing">
              <BrainCircuit className="h-4 w-4" /> Briefing
            </TabsTrigger>
            <TabsTrigger value="communication">
              <Mail className="h-4 w-4" /> Kommunikation
            </TabsTrigger>
            <TabsTrigger value="history">
              <Activity className="h-4 w-4" /> Verlauf
            </TabsTrigger>
            <TabsTrigger value="sites">
              <BriefcaseBusiness className="h-4 w-4" /> Baustellen
            </TabsTrigger>
            <TabsTrigger value="finance">
              <Euro className="h-4 w-4" /> Kosten & Aufträge
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="briefing" className="space-y-4">
          {workspace?.ai_summary ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
              <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-brand" />
                  <h2 className="font-display text-lg font-bold">Kunden-Briefing</h2>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {workspace.ai_summary}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Analysiert {formatDate(workspace.analyzed_at)} · KI-Erkenntnisse sind
                  Arbeitshypothesen und müssen fachlich geprüft werden.
                </p>
              </section>
              <CostProfile
                value={workspace.cost_profile}
                openGross={openGross}
                paidGross={paidGross}
              />
              <InsightList
                title="Bedürfnisse"
                icon={Target}
                items={jsonStringList(workspace.needs)}
                empty="Noch keine belastbaren Bedürfnisse erkannt."
              />
              <InsightList
                title="Präferenzen"
                icon={MessageSquareText}
                items={jsonStringList(workspace.preferences)}
                empty="Noch keine Präferenzen erkannt."
              />
              <InsightList
                title="Verhaltensmuster"
                icon={Activity}
                items={jsonStringList(workspace.behavior_patterns)}
                empty="Noch keine wiederkehrenden Muster erkannt."
              />
              <InsightList
                title="Chancen"
                icon={TrendingUp}
                items={jsonStringList(workspace.opportunities)}
                empty="Noch keine konkreten Chancen erkannt."
                positive
              />
              <InsightList
                title="Risiken & offene Punkte"
                icon={CircleAlert}
                items={jsonStringList(workspace.risks)}
                empty="Keine besonderen Risiken erkannt."
                warning
              />
              <InsightList
                title="Empfohlene nächste Schritte"
                icon={Sparkles}
                items={jsonStringList(workspace.recommended_actions)}
                empty="Noch keine Handlungsempfehlungen vorhanden."
              />
            </div>
          ) : (
            <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <BrainCircuit className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 font-display text-lg font-bold">Noch kein Kunden-Briefing</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
                Baustellen, E-Mails, Aufmaße, Angebote, Rechnungen, Arbeitsberichte und Projektchat
                werden bereits in diesem Work-Segment zusammengeführt. Starte die KI-Analyse
                bewusst, sobald genügend Daten vorhanden sind.
              </p>
            </section>
          )}
          <ManualNotes
            key={workspace?.updated_at ?? customer.id}
            customerId={customer.id}
            tenantId={customer.tenant_id}
            initialValue={workspace?.manual_notes ?? customer.notes ?? ""}
            canWrite={canWriteCustomers}
            onSaved={customerQuery.refreshCustomerWorkspace}
          />
          <SourceCoverage data={data} />
        </TabsContent>

        <TabsContent value="communication">
          {profile ? (
            <CommunicationsPanel
              data={communicationData}
              tenantId={customer.tenant_id}
              userId={profile.id}
              customerId={customer.id}
              canWrite={canWriteCommunications}
              onChanged={customerQuery.refreshCustomerWorkspace}
            />
          ) : (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Profil wird geladen …
            </p>
          )}
        </TabsContent>

        <TabsContent value="history">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Gesamter Kundenverlauf</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              E-Mails, Baustellen, Angebote, Rechnungen und Projektmeldungen in einer
              chronologischen Sicht.
            </p>
            {timeline.length ? (
              <Timeline entries={timeline} />
            ) : (
              <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Noch keine Aktivitäten vorhanden.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="sites">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.sites.length ? (
              data.sites.map((site) => {
                const minutes = data.timeEntries
                  .filter((entry) => entry.project_id === site.id)
                  .reduce((sum, entry) => sum + Number(entry.minuten ?? 0), 0);
                const openTasks = data.tasks.filter(
                  (task) => task.project_id === site.id && task.status !== "erledigt",
                ).length;
                return (
                  <Link
                    key={site.id}
                    to="/app/baustellen/$id"
                    params={{ id: site.id }}
                    className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate font-semibold">{site.name}</h3>
                      <Badge variant="secondary">{site.status ?? "ohne Status"}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {site.beschreibung || site.adresse || "Keine Beschreibung"}
                    </p>
                    <div className="mt-4 flex gap-4 text-xs text-slate-600">
                      <span>{Math.round((minutes / 60) * 10) / 10} Std.</span>
                      <span>{openTasks} offene Aufgaben</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Diesem Kunden ist noch keine Baustelle zugeordnet.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="finance">
          <div className="grid gap-4 lg:grid-cols-2">
            <DocumentList
              title="Angebote"
              rows={data.offers.map((offer) => ({
                id: offer.id,
                title: offer.subject,
                number: offer.offer_number,
                status: offer.status,
                amount: offer.gross_amount,
                date: offer.created_at,
              }))}
            />
            <DocumentList
              title="Rechnungen"
              rows={data.invoices.map((invoice) => ({
                id: invoice.id,
                title: invoice.subject,
                number: invoice.invoice_number,
                status: invoice.status,
                amount: invoice.gross_amount,
                date: invoice.invoice_date,
              }))}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  emphasis = false,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white/85 p-3 ${emphasis ? "border-amber-300" : "border-white"}`}
    >
      <Icon className={`h-4 w-4 ${emphasis ? "text-amber-600" : "text-brand"}`} />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function InsightList({
  title,
  icon: Icon,
  items,
  empty,
  positive = false,
  warning = false,
}: {
  title: string;
  icon: typeof Target;
  items: string[];
  empty: string;
  positive?: boolean;
  warning?: boolean;
}) {
  const tone = positive ? "text-emerald-600" : warning ? "text-amber-600" : "text-brand";
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tone}`} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {items.length ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${positive ? "bg-emerald-500" : warning ? "bg-amber-500" : "bg-brand"}`}
              />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function CostProfile({
  value,
  openGross,
  paidGross,
}: {
  value: Json;
  openGross: number;
  paidGross: number;
}) {
  const record = jsonRecord(value);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Euro className="h-5 w-5 text-brand" />
        <h3 className="font-semibold">Kostenprofil</h3>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Preissensibilität</dt>
          <dd className="mt-1 font-semibold capitalize">
            {stringValue(record.priceSensitivity) || "unklar"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Bezahlt</dt>
          <dd className="mt-1 font-semibold">{formatEur(paidGross)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Offen</dt>
          <dd className="mt-1 font-semibold">{formatEur(openGross)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ø Rechnung</dt>
          <dd className="mt-1 font-semibold">
            {formatEur(numberValue(record.averageInvoiceGross))}
          </dd>
        </div>
      </dl>
      {stringValue(record.notes) && (
        <p className="mt-4 text-sm leading-6 text-slate-600">{stringValue(record.notes)}</p>
      )}
    </section>
  );
}

function ManualNotes({
  customerId,
  tenantId,
  initialValue,
  canWrite,
  onSaved,
}: {
  customerId: string;
  tenantId: string;
  initialValue: string;
  canWrite: boolean;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("customer_workspaces")
      .upsert(
        { customer_id: customerId, tenant_id: tenantId, manual_notes: value.trim() || null },
        { onConflict: "customer_id" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Interne Kundennotizen gespeichert");
    await onSaved();
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Interne Arbeitsnotizen</h2>
          <p className="text-xs text-muted-foreground">
            Erwartungen, Absprachen und bevorzugte Vorgehensweisen – nicht für Kunden sichtbar.
          </p>
        </div>
        {canWrite && (
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Speichert …" : "Speichern"}
          </Button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        readOnly={!canWrite}
        className="mt-4 min-h-28"
        placeholder="Beispiel: möchte Angebote in zwei Varianten, bevorzugt Rückruf am Nachmittag …"
      />
    </section>
  );
}

function SourceCoverage({ data }: { data: CustomerWorkspaceData }) {
  const sources = [
    ["Baustellen", data.sites.length],
    ["E-Mails/Kontakte", data.communications.length],
    ["Aufmaße", data.measurements.length],
    ["Angebote", data.offers.length],
    ["Rechnungen", data.invoices.length],
    ["Arbeitsberichte", data.timeEntries.length],
    ["Projektchat", data.projectMessages.length],
  ] as const;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-semibold">Datengrundlage</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {sources.map(([label, count]) => (
          <Badge key={label} variant={count ? "default" : "secondary"}>
            {label}: {count}
          </Badge>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Die Analyse wird nur auf ausdrücklichen Klick aktualisiert. Inhalte werden dabei an den
        konfigurierten KI-Anbieter übertragen.
      </p>
    </section>
  );
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const iconMap = {
    communication: Mail,
    site: BriefcaseBusiness,
    offer: FileCheck2,
    invoice: Euro,
    project: MessageSquareText,
  } as const;
  return (
    <ol className="mt-6 space-y-1">
      {entries.map((entry) => {
        const Icon = iconMap[entry.kind];
        return (
          <li key={entry.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 border-b border-border pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{entry.title}</p>
                <time className="text-xs text-muted-foreground">{formatDate(entry.date)}</time>
              </div>
              <p className="text-xs font-medium text-brand">{entry.label}</p>
              {entry.detail && (
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">
                  {entry.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DocumentList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    number: string;
    status: string;
    amount: number;
    date: string;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {rows.length ? (
        <div className="mt-4 divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {row.number} · {formatDate(row.date)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatEur(row.amount)}</p>
                <p className="text-xs text-muted-foreground">{row.status}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Noch keine Einträge.</p>
      )}
    </section>
  );
}

function buildTimeline(data: CustomerWorkspaceData): TimelineEntry[] {
  const sitesById = new Map(data.sites.map((site) => [site.id, site.name]));
  return [
    ...data.communications.map((item) => ({
      id: `communication-${item.id}`,
      date: item.sent_at ?? item.created_at,
      label: `${item.direction === "inbound" ? "Eingehend" : "Ausgehend"} · ${item.channel}`,
      title: item.subject || "Kommunikation",
      detail: item.body,
      kind: "communication" as const,
    })),
    ...data.sites.map((site) => ({
      id: `site-${site.id}`,
      date: site.created_at,
      label: `Baustelle · ${site.status ?? "ohne Status"}`,
      title: site.name,
      detail: site.beschreibung || site.adresse,
      kind: "site" as const,
    })),
    ...data.offers.map((offer) => ({
      id: `offer-${offer.id}`,
      date: offer.accepted_at ?? offer.sent_at ?? offer.created_at,
      label: `Angebot · ${offer.status}`,
      title: `${offer.offer_number} · ${formatEur(offer.gross_amount)}`,
      detail: offer.subject,
      kind: "offer" as const,
    })),
    ...data.invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      date: invoice.paid_at ?? invoice.invoice_date,
      label: `Rechnung · ${invoice.status}`,
      title: `${invoice.invoice_number} · ${formatEur(invoice.gross_amount)}`,
      detail: invoice.subject,
      kind: "invoice" as const,
    })),
    ...data.projectMessages
      .filter((message) => message.body)
      .map((message) => ({
        id: `project-${message.id}`,
        date: message.created_at,
        label: `Projektchat · ${sitesById.get(message.project_id) ?? "Baustelle"}`,
        title: "Baustellenmeldung",
        detail: message.body,
        kind: "project" as const,
      })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);
}

function jsonStringList(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function jsonRecord(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === "object" ? value : {};
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: Json | undefined) {
  return typeof value === "number" ? value : 0;
}
