import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyRole, type AppRole, formatDate } from "@/lib/handwerk";
import {
  Users,
  Briefcase,
  FileText,
  ClipboardList,
  Receipt,
  AlertTriangle,
  Camera,
  Mic,
  Ruler,
  ArrowRight,
  Clock,
  Package,
  Calendar,
  Mail,
  FolderOpen,
  Building2,
  Calculator,
  UsersRound,
  Settings,
  Plug,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard – MeisterMe" }] }),
  component: Dashboard,
});

type Tile = {
  to: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  badge?: number;
  badgeTone?: "brand" | "warn";
  roles?: AppRole[];
  highlight?: boolean;
};

type Group = {
  title: string;
  color: string; // tailwind text-color for accent bar
  tiles: Tile[];
};

const ALL: AppRole[] = ["admin", "buero", "bauleiter", "monteur", "azubi"];

function ModuleTile({ tile }: { tile: Tile }) {
  const { icon: Icon, badge, badgeTone } = tile;
  return (
    <Link
      to={tile.to as never}
      className={`group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${
        tile.highlight ? "border-brand/40 bg-gradient-to-br from-card to-brand/5" : "border-border"
      }`}
    >
      {badge !== undefined && badge > 0 && (
        <span
          className={`absolute right-3 top-3 min-w-[24px] rounded-full px-2 py-0.5 text-center text-xs font-bold ${
            badgeTone === "warn"
              ? "bg-destructive text-destructive-foreground"
              : "bg-brand text-brand-foreground"
          }`}
        >
          {badge}
        </span>
      )}
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          tile.highlight ? "bg-brand text-brand-foreground" : "bg-navy text-brand"
        } transition group-hover:scale-110`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="font-display text-base font-semibold leading-tight">{tile.label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{tile.desc}</div>
      </div>
    </Link>
  );
}

function Dashboard() {
  const { data: profile } = useProfile();
  const role = useMyRole();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [customers, projects, offers, reports, invoices, tasks, materials, photos, docs, msgs] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id, status"),
        supabase.from("offers").select("id, status"),
        supabase.from("field_reports").select("id, status"),
        supabase.from("invoice_drafts").select("id, status"),
        supabase.from("tasks").select("id, status, faellig_am"),
        supabase.from("materials").select("id", { count: "exact", head: true }),
        supabase.from("photos").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("project_messages").select("id", { count: "exact", head: true }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      return {
        customers: customers.count ?? 0,
        projects: (projects.data ?? []).length,
        activeProjects: (projects.data ?? []).filter((p) => ["beauftragt", "geplant", "in_arbeit"].includes(p.status as string)).length,
        openOffers: (offers.data ?? []).filter((o) => ["entwurf", "gesendet"].includes(o.status as string)).length,
        openReports: (reports.data ?? []).filter((r) => r.status === "entwurf").length,
        openInvoices: (invoices.data ?? []).filter((i) => i.status === "entwurf").length,
        openTasks: (tasks.data ?? []).filter((t) => t.status !== "erledigt").length,
        overdueTasks: (tasks.data ?? []).filter((t) => t.status !== "erledigt" && t.faellig_am && t.faellig_am < today).length,
        materials: materials.count ?? 0,
        photos: photos.count ?? 0,
        documents: docs.count ?? 0,
        messages: msgs.count ?? 0,
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
        .limit(4);
      return data ?? [];
    },
  });

  const { data: activeProjects } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, gewerk, customers(firma)")
        .in("status", ["beauftragt", "geplant", "in_arbeit"])
        .order("updated_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const groups: Group[] = [
    {
      title: "Baustelle",
      color: "bg-brand",
      tiles: [
        { to: "/app/projekte", label: "Projekte", icon: Briefcase, desc: "Aktive Baustellen", badge: stats?.activeProjects, roles: ALL },
        { to: "/app/aufmass", label: "Aufmaß", icon: Ruler, desc: "Räume, Flächen, Mengen", roles: ["admin", "buero", "bauleiter", "monteur"] },
        { to: "/app/berichte", label: "Einsatzberichte", icon: ClipboardList, desc: "Tages- & Baustellenberichte", badge: stats?.openReports, roles: ALL },
        { to: "/app/ki-sprachbericht", label: "KI-Sprachbericht", icon: Mic, desc: "Bericht diktieren, KI schreibt", highlight: true, roles: ALL },
        { to: "/app/fotos", label: "Fotos", icon: Camera, desc: "Bautagesbuch mit Bild", badge: stats?.photos, roles: ALL },
        { to: "/app/aufgaben", label: "Aufgaben", icon: Calendar, desc: "To-dos & Termine", badge: stats?.overdueTasks, badgeTone: "warn", roles: ALL },
      ],
    },
    {
      title: "Kaufmännisch",
      color: "bg-primary",
      tiles: [
        { to: "/app/kunden", label: "Kunden", icon: Users, desc: "Auftraggeber & Adressen", badge: stats?.customers, roles: ["admin", "buero", "bauleiter"] },
        { to: "/app/angebote", label: "Angebote", icon: FileText, desc: "Erstellen, versenden, tracken", badge: stats?.openOffers, roles: ["admin", "buero", "bauleiter"] },
        { to: "/app/rechnungsgrundlagen", label: "Rechnungen", icon: Receipt, desc: "Rechnungsgrundlagen aus Projekten", badge: stats?.openInvoices, roles: ["admin", "buero"] },
        { to: "/app/kalkulation", label: "Kalkulation", icon: Calculator, desc: "Stundensatz, Zuschläge, VK", roles: ["admin", "buero", "bauleiter"] },
        { to: "/app/kommunikation", label: "Kommunikation", icon: Mail, desc: "Kunden-Mails, Vorlagen", roles: ["admin", "buero", "bauleiter"] },
      ],
    },
    {
      title: "Zeit & Material",
      color: "bg-emerald-500",
      tiles: [
        { to: "/app/zeiten", label: "Zeiterfassung", icon: Clock, desc: "Stempeln & Wochenübersicht", roles: ALL },
        { to: "/app/material", label: "Material", icon: Package, desc: "Stammdaten & Verbrauch", badge: stats?.materials, roles: ALL },
        { to: "/app/dokumente", label: "Dokumente", icon: FolderOpen, desc: "Pläne, PDFs, Lieferscheine", badge: stats?.documents, roles: ALL },
      ],
    },
    {
      title: "Betrieb",
      color: "bg-slate-500",
      tiles: [
        { to: "/app/buero", label: "Büro", icon: Building2, desc: "Übersicht Backoffice", roles: ["admin", "buero"] },
        { to: "/app/team", label: "Team", icon: UsersRound, desc: "Mitarbeiter & Rollen", roles: ["admin"] },
        { to: "/app/integrationen/outlook", label: "Outlook", icon: Plug, desc: "Kalender & Mails", roles: ["admin", "buero"] },
        { to: "/app/einstellungen", label: "Einstellungen", icon: Settings, desc: "Betrieb & Profil", roles: ALL },
      ],
    },
  ];

  const visibleGroups = groups
    .map((g) => ({ ...g, tiles: g.tiles.filter((t) => !role || !t.roles || t.roles.includes(role)) }))
    .filter((g) => g.tiles.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-primary to-navy p-5 text-white shadow-lift sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">Willkommen zurück</div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{profile?.full_name ?? "Meister"}</h1>
          <div className="text-sm text-white/70">{profile?.tenants?.name}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:text-right">
          <MiniStat label="Aktive Baustellen" value={stats?.activeProjects ?? 0} />
          <MiniStat label="Offene Angebote" value={stats?.openOffers ?? 0} />
          <MiniStat label="Überfällig" value={stats?.overdueTasks ?? 0} tone={stats?.overdueTasks ? "warn" : undefined} />
        </div>
      </div>

      {/* Module groups (WinWorker-Kachel-Navigation) */}
      {visibleGroups.map((group) => (
        <section key={group.title}>
          <div className="mb-3 flex items-center gap-3">
            <div className={`h-6 w-1.5 rounded-full ${group.color}`} />
            <h2 className="font-display text-lg font-bold">{group.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {group.tiles.map((t) => (
              <ModuleTile key={t.to} tile={t} />
            ))}
          </div>
        </section>
      ))}

      {/* Live boards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BoardCard
          title="Aktive Baustellen"
          icon={Briefcase}
          to="/app/projekte"
          empty="Noch keine aktiven Baustellen."
        >
          {activeProjects && activeProjects.length > 0 ? (
            <ul className="divide-y divide-border">
              {activeProjects.map((p) => (
                <li key={p.id}>
                  <Link to={"/app/projekte/$id" as never} params={{ id: p.id } as never} className="flex items-center justify-between py-3 hover:text-brand">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(p.customers as { firma?: string } | null)?.firma ?? "—"} · {p.gewerk}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </BoardCard>

        <BoardCard
          title="Nächste Aufgaben"
          icon={AlertTriangle}
          to="/app/aufgaben"
          empty="Keine offenen Aufgaben."
        >
          {upcomingTasks && upcomingTasks.length > 0 ? (
            <ul className="divide-y divide-border">
              {upcomingTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {(t.projects as { name?: string } | null)?.name ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(t.faellig_am)}</div>
                </li>
              ))}
            </ul>
          ) : null}
        </BoardCard>
      </div>

      {/* KI-Hinweis */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-semibold">Tipp: Berichte per Sprache in 30 Sekunden</div>
          <div className="text-muted-foreground">
            Diktier deinen Einsatz frei ins Handy – die KI erstellt Bericht, Zeiten und Materialliste automatisch.
          </div>
        </div>
        <Link to="/app/ki-sprachbericht" className="hidden shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90 sm:block">
          Ausprobieren
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
      <div className={`font-display text-xl font-bold ${tone === "warn" ? "text-red-300" : "text-white"}`}>{value}</div>
      <div className="text-[10px] uppercase text-white/60">{label}</div>
    </div>
  );
}

function BoardCard({
  title,
  icon: Icon,
  to,
  empty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  to: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasContent = !!children && (Array.isArray(children) ? children.length > 0 : true);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon className="h-4 w-4 text-brand" /> {title}
        </h2>
        <Link to={to as never} className="text-xs text-brand hover:underline">Alle ansehen</Link>
      </div>
      {hasContent ? children : (
        <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}
