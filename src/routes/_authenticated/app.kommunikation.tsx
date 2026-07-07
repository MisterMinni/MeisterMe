import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Mail } from "lucide-react";
import { formatDate } from "@/lib/handwerk";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/kommunikation")({
  head: () => ({ meta: [{ title: "Kommunikation – HandwerkPilot" }] }),
  component: () => {
    const { data } = useQuery({
      queryKey: ["communications"],
      queryFn: async () => (await supabase.from("communications").select("*, customers(firma)").order("created_at", { ascending: false })).data ?? [],
    });
    return (
      <div>
        <PageHeader title="Kundenkommunikation" subtitle="Alle Mails und Notizen pro Kunde. Outlook-Sync bald verfügbar." />
        {!data || data.length === 0 ? (
          <EmptyState icon={Mail} title="Noch keine Kommunikation" desc="Aus jedem Bericht kannst du direkt eine Kundenmail mit KI erstellen. Sie erscheint dann hier." />
        ) : (
          <ul className="space-y-2">
            {data.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{c.betreff ?? "(kein Betreff)"}</div>
                  <Badge variant="secondary">{c.kanal} · {c.richtung}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{(c.customers as any)?.firma ?? "—"} · {formatDate(c.created_at)}</div>
                <p className="mt-2 text-sm whitespace-pre-wrap line-clamp-3">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
});
