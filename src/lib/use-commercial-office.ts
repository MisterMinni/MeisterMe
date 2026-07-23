import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { CommercialData } from "@/lib/commercial";
import { useProfile } from "@/lib/handwerk";

const COMMERCIAL_QUERY_KEY = "commercial-office";

export function useCommercialOffice() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;

  const query = useQuery({
    queryKey: [COMMERCIAL_QUERY_KEY, tenantId],
    enabled: Boolean(tenantId),
    queryFn: async (): Promise<CommercialData> => {
      const [customers, measurements, materials, offers, invoices, communications, inboundEmails, sites, timeEntries] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("measurements").select("*").order("captured_at", { ascending: false }),
        supabase.from("materials").select("*").order("name"),
        supabase.from("offers").select("*").order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").order("invoice_date", { ascending: false }),
        supabase.from("communications").select("*").order("created_at", { ascending: false }),
        supabase.from("inbound_emails").select("*").order("received_at", { ascending: false }),
        supabase.from("sites").select("*").is("archived_at", null).order("created_at", { ascending: false }),
        supabase.from("time_entries").select("*").not("project_id", "is", null),
      ]);

      const error = [customers, measurements, materials, offers, invoices, communications, inboundEmails, sites, timeEntries].find(
        (result) => result.error,
      )?.error;
      if (error) throw error;

      return {
        customers: customers.data ?? [],
        measurements: measurements.data ?? [],
        materials: materials.data ?? [],
        offers: offers.data ?? [],
        invoices: invoices.data ?? [],
        communications: communications.data ?? [],
        inboundEmails: inboundEmails.data ?? [],
        sites: sites.data ?? [],
        timeEntries: timeEntries.data ?? [],
      };
    },
  });

  async function refreshCommercialOffice() {
    await queryClient.invalidateQueries({ queryKey: [COMMERCIAL_QUERY_KEY, tenantId] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  return { ...query, profile, tenantId, refreshCommercialOffice };
}
