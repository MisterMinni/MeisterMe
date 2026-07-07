import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, formatEur, formatDate } from "@/lib/handwerk";
import {
  Users,
  Briefcase,
  FileText,
  ClipboardList,
  Receipt,
  AlertTriangle,
  Plus,
  Camera,
  Mic,
  Ruler,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard – MeisterMe" }] }),
  component: Dashboard,
});

function Kpi({ label, value, icon: Icon, href, tone = "default" }: { label: string; value: string | number; icon: any; href: string; tone?: "default" | "warn" }) {
  return (
    <Link
      to={href as never}
      className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className={`mt-1 font-display text-3xl font-bold ${tone === "warn" ? "text-destructive" : ""}`}>
            {value}
          </div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-navy text-brand"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to as never}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card p-4 text-center text-sm font-semibold shadow-card transition hover:border-brand hover:text-brand active:scale-95 min-h-[110px]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-6 w-6" />
      </span>
      {label}
    </Link>
  );
}

function Dashboard() {
  const { data: profile } = useProfile();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [customers, projects, offers, reports, invoices, tasks] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id, status", { count: "exact" }),
        supabase.from("offers").select("id, status", { count: "exact" }),
        supabase.from("field_reports").select("id, status", { count: "exact" }),
        supabase.from("invoice_drafts").select("id, status", { count: "exact" }),
        supabase.from("tasks").select("id, status, faellig_am", { count: "exact" }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      return {
        customers: customers.count ?? 0,
        activeProjects: (projects.data ?? []).filter((p) => ["beauftragt", "geplant", "in_arbeit"].includes(p.status as string)).length,
        openOffers: (offers.data ?? []).filter((o) => ["entwurf", "gesendet"].includes(o.status as string)).length,
        openReports: (reports.data ?? []).filter((r) => r.status === "entwurf").length,
        openInvoices: (invoices.data ?? []).filter((i) => i.status === "entwurf").length,
        overdueTasks: (tasks.data ?? []).filter((t) => t.status !== "erledigt" && t.faellig_am && t.faellig_am < today).length,
      };
    },
  });

  const { data: upcomingTasks } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, faellig_am, status, projects(name)")
        .neq("status", "erledigt")
        .order("faellig_am", { ascending: true, nullsFirst: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: activeProjects } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, gewerk, customers(firma, ansprechpartner)")
        .in("status", ["beauftragt", "geplant", "in_arbeit"])
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground">Willkommen zurück,</div>
        <h1 className="font-display text-3xl font-bold">{profile?.full_name ?? "Meister"}</h1>
        <div className="mt-1 text-sm text-muted-foreground">{profile?.tenants?.name}</div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Kunden" value={stats?.customers ?? 0} icon={Users} href="/app/kunden" />
        <Kpi label="Aktive Baustellen" value={stats?.activeProjects ?? 0} icon={Briefcase} href="/app/projekte" />
        <Kpi label="Offene Angebote" value={stats?.openOffers ?? 0} icon={FileText} href="/app/angebote" />
        <Kpi label="Offene Berichte" value={stats?.openReports ?? 0} icon={ClipboardList} href="/app/berichte" />
        <Kpi label="Rechnungsgrundlagen" value={stats?.openInvoices ?? 0} icon={Receipt} href="/app/rechnungsgrundlagen" />
        <Kpi label="Überfällig" value={stats?.overdueTasks ?? 0} icon={AlertTriangle} href="/app/aufgaben" tone={stats?.overdueTasks ? "warn" : "default"} />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Schnellaktionen</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <QuickAction to="/app/kunden/neu" icon={Plus} label="Neuer Kunde" />
          <QuickAction to="/app/projekte/neu" icon={Briefcase} label="Neues Projekt" />
          <QuickAction to="/app/angebote/neu" icon={FileText} label="Neues Angebot" />
          <QuickAction to="/app/berichte/neu" icon={ClipboardList} label="Einsatzbericht" />
          <QuickAction to="/app/ki-sprachbericht" icon={Mic} label="Sprachbericht" />
          <QuickAction to="/app/fotos" icon={Camera} label="Foto hochladen" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Aktive Baustellen</h2>
            <Link to="/app/projekte" className="text-xs text-brand hover:underline">Alle ansehen</Link>
          </div>
          {activeProjects && activeProjects.length > 0 ? (
            <ul className="divide-y divide-border">
              {activeProjects.map((p) => (
                <li key={p.id}>
                  <Link to={"/app/projekte/$id" as never} params={{ id: p.id } as never} className="flex items-center justify-between py-3 hover:text-brand">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(p.customers as any)?.firma ?? "—"} · {p.gewerk}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint icon={Briefcase} text="Noch keine aktiven Baustellen." to="/app/projekte/neu" cta="Projekt anlegen" />
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Nächste Aufgaben</h2>
            <Link to="/app/aufgaben" className="text-xs text-brand hover:underline">Alle ansehen</Link>
          </div>
          {upcomingTasks && upcomingTasks.length > 0 ? (
            <ul className="divide-y divide-border">
              {upcomingTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {(t.projects as any)?.name ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(t.faellig_am)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint icon={ClipboardList} text="Keine offenen Aufgaben." to="/app/aufgaben" cta="Aufgabe erstellen" />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ icon: Icon, text, to, cta }: { icon: any; text: string; to: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">{text}</div>
      <Link to={to as never} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
        {cta}
      </Link>
    </div>
  );
}
