import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerContact = Database["public"]["Tables"]["customer_contacts"]["Row"];
type CustomerWorkspace = Database["public"]["Tables"]["customer_workspaces"]["Row"];
type Site = Database["public"]["Tables"]["sites"]["Row"];
type Communication = Database["public"]["Tables"]["communications"]["Row"];
type Measurement = Database["public"]["Tables"]["measurements"]["Row"];
type Offer = Database["public"]["Tables"]["offers"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];
type ProjectMessage = Database["public"]["Tables"]["project_messages"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export type CustomerWorkspaceData = {
  customer: Customer;
  contacts: CustomerContact[];
  workspace: CustomerWorkspace | null;
  sites: Site[];
  communications: Communication[];
  measurements: Measurement[];
  offers: Offer[];
  invoices: Invoice[];
  timeEntries: TimeEntry[];
  projectMessages: ProjectMessage[];
  tasks: Task[];
};

export function useCustomerWorkspace(customerId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["customer-workspace", customerId],
    enabled: Boolean(customerId),
    queryFn: async (): Promise<CustomerWorkspaceData> => {
      const [customer, contacts, workspace, sites, communications, measurements, offers, invoices] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase.from("customer_contacts").select("*").eq("customer_id", customerId).order("is_primary", { ascending: false }),
        supabase.from("customer_workspaces").select("*").eq("customer_id", customerId).maybeSingle(),
        supabase.from("sites").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        supabase.from("communications").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
        supabase.from("measurements").select("*").eq("customer_id", customerId).order("captured_at", { ascending: false }),
        supabase.from("offers").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").eq("customer_id", customerId).order("invoice_date", { ascending: false }),
      ]);

      const primaryError = [customer, contacts, workspace, sites, communications, measurements, offers, invoices]
        .find((result) => result.error)?.error;
      if (primaryError || !customer.data) throw primaryError ?? new Error("Kunde nicht gefunden.");

      const siteIds = (sites.data ?? []).map((site) => site.id);
      let timeEntries: TimeEntry[] = [];
      let projectMessages: ProjectMessage[] = [];
      let tasks: Task[] = [];
      if (siteIds.length) {
        const [times, messages, siteTasks] = await Promise.all([
          supabase.from("time_entries").select("*").in("project_id", siteIds).order("created_at", { ascending: false }).limit(200),
          supabase.from("project_messages").select("*").in("project_id", siteIds).order("created_at", { ascending: false }).limit(100),
          supabase.from("tasks").select("*").in("project_id", siteIds).order("created_at", { ascending: false }).limit(100),
        ]);
        const siteError = [times, messages, siteTasks].find((result) => result.error)?.error;
        if (siteError) throw siteError;
        timeEntries = times.data ?? [];
        projectMessages = messages.data ?? [];
        tasks = siteTasks.data ?? [];
      }

      return {
        customer: customer.data,
        contacts: contacts.data ?? [],
        workspace: workspace.data,
        sites: sites.data ?? [],
        communications: communications.data ?? [],
        measurements: measurements.data ?? [],
        offers: offers.data ?? [],
        invoices: invoices.data ?? [],
        timeEntries,
        projectMessages,
        tasks,
      };
    },
  });

  async function refreshCustomerWorkspace() {
    await queryClient.invalidateQueries({ queryKey: ["customer-workspace", customerId] });
    await queryClient.invalidateQueries({ queryKey: ["commercial-office"] });
  }

  return { ...query, refreshCustomerWorkspace };
}
