import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { FolderOpen } from "lucide-react";
import { formatDate } from "@/lib/handwerk";

export const Route = createFileRoute("/_authenticated/app/dokumente")({
  head: () => ({ meta: [{ title: "Dokumente – HandwerkPilot" }] }),
  component: () => {
    const { data } = useQuery({
      queryKey: ["documents"],
      queryFn: async () => (await supabase.from("documents").select("*, projects(name), customers(firma)").order("created_at", { ascending: false })).data ?? [],
    });
    return (
      <div>
        <PageHeader title="Dokumente" subtitle="Angebote, Rechnungen, Prüfprotokolle, Verträge. Automatische PDF-Ablage bald verfügbar." />
        {!data || data.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Noch keine Dokumente" desc="Angebote, Rechnungen und Berichte werden hier automatisch abgelegt, sobald du sie erzeugst." />
        ) : (
          <ul className="space-y-2">
            {data.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <a href={d.url} target="_blank" rel="noopener" className="font-medium hover:text-brand">{d.name}</a>
                  <div className="text-xs text-muted-foreground">{d.kind} · {(d.projects as any)?.name ?? (d.customers as any)?.firma} · {formatDate(d.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
});
