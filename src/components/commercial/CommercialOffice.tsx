import { useState } from "react";
import {
  Boxes,
  Ruler,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Mail,
  UsersRound,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/lib/handwerk";
import { useCommercialOffice } from "@/lib/use-commercial-office";
import { CommercialOverview } from "@/components/commercial/CommercialOverview";
import { CustomersPanel } from "@/components/commercial/CustomersPanel";
import { MeasurementsPanel } from "@/components/commercial/MeasurementsPanel";
import { OffersPanel } from "@/components/commercial/OffersPanel";
import { InvoicesPanel } from "@/components/commercial/InvoicesPanel";
import { MaterialsPanel } from "@/components/commercial/MaterialsPanel";
import { CommunicationsPanel } from "@/components/commercial/CommunicationsPanel";

const tabs = [
  { value: "overview", label: "Übersicht", icon: LayoutDashboard },
  { value: "customers", label: "Kunden", icon: UsersRound },
  { value: "measurements", label: "Aufmaß", icon: Ruler },
  { value: "offers", label: "Angebote", icon: FileText },
  { value: "invoices", label: "Rechnungen", icon: FileCheck2 },
  { value: "materials", label: "Material", icon: Boxes },
  { value: "communications", label: "Kommunikation", icon: Mail },
] as const;

export function CommercialOffice() {
  const [activeTab, setActiveTab] = useState("overview");
  const office = useCommercialOffice();
  const canWriteCustomers = useHasPermission("customers:write");
  const canWriteMeasurements = useHasPermission("measurements:write");
  const canWriteOffers = useHasPermission("offers:write");
  const canWriteInvoices = useHasPermission("invoices:write");
  const canWriteMaterials = useHasPermission("materials:write");
  const canWriteCommunications = useHasPermission("communications:write");

  if (office.isLoading || !office.data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Büro wird geladen">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (office.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Bürodaten konnten nicht geladen werden</AlertTitle>
        <AlertDescription>
          {office.error instanceof Error ? office.error.message : "Bitte versuche es erneut oder prüfe deine Berechtigungen."}
        </AlertDescription>
      </Alert>
    );
  }

  const shared = {
    data: office.data,
    tenantId: office.tenantId!,
    userId: office.profile!.id,
    onChanged: office.refreshCommercialOffice,
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <TabsList className="h-auto min-w-max justify-start gap-1 p-1.5">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2 px-3 py-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview">
        <CommercialOverview data={office.data} customers={office.data.customers} onOpen={setActiveTab} />
      </TabsContent>
      <TabsContent value="customers">
        <CustomersPanel {...shared} canWrite={canWriteCustomers} />
      </TabsContent>
      <TabsContent value="measurements">
        <MeasurementsPanel {...shared} canWrite={canWriteMeasurements} />
      </TabsContent>
      <TabsContent value="offers">
        <OffersPanel {...shared} canWrite={canWriteOffers} />
      </TabsContent>
      <TabsContent value="invoices">
        <InvoicesPanel {...shared} canWrite={canWriteInvoices} />
      </TabsContent>
      <TabsContent value="materials">
        <MaterialsPanel {...shared} canWrite={canWriteMaterials} />
      </TabsContent>
      <TabsContent value="communications">
        <CommunicationsPanel {...shared} canWrite={canWriteCommunications} />
      </TabsContent>
    </Tabs>
  );
}
