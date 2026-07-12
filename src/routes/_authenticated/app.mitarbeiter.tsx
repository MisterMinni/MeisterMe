import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useProfile, useIsAdmin, formatDate } from "@/lib/handwerk";
import { Badge } from "@/components/ui/badge";
import { Users, Lock, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/mitarbeiter")({
  head: () => ({ meta: [{ title: "Mitarbeiter – MeisterMe" }] }),
  component: Mitarbeiter,
});

function Mitarbeiter() {
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();

  const { data: rows } = useQuery({
    queryKey: ["employees", profile?.tenant_id],
    enabled: !!profile?.tenant_id && isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, employee_number, entry_date, exit_date, weekly_hours, disabled_at")
        .eq("tenant_id", profile!.tenant_id!)
        .order("full_name", { ascending: true });
      return data ?? [];
    },
  });

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-lg font-semibold">Nur Personalverwaltung & Admin</h2>
        <p className="mt-2 text-sm text-muted-foreground">Mitarbeiter-Stammdaten sind für berechtigte Rollen sichtbar.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mitarbeiter"
        subtitle="Stammdaten, Ein-/Austritt, Wochenstunden. Zugänge & Rollen unter Team."
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Personalnr.</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Eintritt</th>
              <th className="px-4 py-3">Austritt</th>
              <th className="px-4 py-3">Std/Woche</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((m) => (
              <tr key={m.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{m.full_name ?? "—"}</td>
                <td className="px-4 py-3">{m.employee_number ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.phone ?? "—"}</td>
                <td className="px-4 py-3">{m.entry_date ? formatDate(m.entry_date) : "—"}</td>
                <td className="px-4 py-3">{m.exit_date ? formatDate(m.exit_date) : "—"}</td>
                <td className="px-4 py-3">{m.weekly_hours ?? "—"}</td>
                <td className="px-4 py-3">
                  {m.disabled_at ? (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive">Deaktiviert</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">Aktiv</Badge>
                  )}
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-6 w-6" />
                  Noch keine Mitarbeiter angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        <LinkIcon className="inline h-3 w-3" /> Zugänge und Rollen unter{" "}
        <Link to="/app/team" className="text-brand hover:underline">Rollen &amp; Zugänge</Link> anlegen und ändern.
      </p>
    </div>
  );
}
