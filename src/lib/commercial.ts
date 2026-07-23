import type { Database, Json } from "@/integrations/supabase/types";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerWorkspace = Database["public"]["Tables"]["customer_workspaces"]["Row"];
export type Measurement = Database["public"]["Tables"]["measurements"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type Offer = Database["public"]["Tables"]["offers"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Communication = Database["public"]["Tables"]["communications"]["Row"];
export type InboundEmail = Database["public"]["Tables"]["inbound_emails"]["Row"];
export type Site = Database["public"]["Tables"]["sites"]["Row"];
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];

export type CommercialData = {
  customers: Customer[];
  measurements: Measurement[];
  materials: Material[];
  offers: Offer[];
  invoices: Invoice[];
  communications: Communication[];
  inboundEmails: InboundEmail[];
  sites: Site[];
  timeEntries: TimeEntry[];
};

export type PostalAddress = {
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

export function customerName(customer: Customer | undefined | null) {
  if (!customer) return "Unbekannter Kunde";
  return (
    customer.company_name?.trim() ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() ||
    customer.customer_number ||
    "Unbenannter Kunde"
  );
}

export function addressFromJson(value: Json): PostalAddress {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const record = value as Record<string, Json | undefined>;
  return {
    street: typeof record.street === "string" ? record.street : undefined,
    postalCode: typeof record.postalCode === "string" ? record.postalCode : undefined,
    city: typeof record.city === "string" ? record.city : undefined,
    country: typeof record.country === "string" ? record.country : undefined,
  };
}

export function documentNumber(prefix: "KD" | "AN" | "RE") {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.toTimeString().slice(0, 8).replaceAll(":", "");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  return `${prefix}-${date}-${time}${milliseconds}`;
}

export function calculateDocumentTotals(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
  taxRate: number,
) {
  const net = roundMoney(quantity * unitPrice * (1 - discountPercent / 100));
  const tax = roundMoney(net * (taxRate / 100));
  return { net, tax, gross: roundMoney(net + tax) };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const OFFER_STATUS: Record<string, string> = {
  draft: "Entwurf",
  review: "Zur Prüfung",
  sent: "Versendet",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
};

export const INVOICE_STATUS: Record<string, string> = {
  draft: "Entwurf",
  review: "Zur Prüfung",
  issued: "Gestellt",
  partially_paid: "Teilbezahlt",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

export const MEASUREMENT_STATUS: Record<string, string> = {
  draft: "Entwurf",
  review: "Zur Prüfung",
  approved: "Freigegeben",
  archived: "Archiviert",
};
