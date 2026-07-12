import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useMyRole, ROLE_LABELS } from "@/lib/handwerk";
import {
  Briefcase,
  Clock,
  Calendar,
  UserX,
  UsersRound,
  Settings,
  MessageSquare,
  ArrowRight,
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
  highlight?: boolean;
};

type Group = { title: string; color: string; tiles: Tile[] };

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
            badgeTone === "warn" ? "bg-destructive text-destructive-foreground" : "bg-brand text-brand-foreground"
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
      const [sites, absences, assignments, messages] = await Promise.all([
        supabase.from("sites").select("id, archived_at"),
        supabase.from("absences").select("id, status"),
        supabase.from("weekly_assignments").select("id, day"),
        supabase.from("project_messages").select("id", { count: "exact", head: true }),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      return {
        activeSites: (sites.data ?? []).filter((s) => !s.archived_at).length,
        openAbsences: (absences.data ?? []).filter((a) => a.status === "eingereicht").length,
        planToday: (assignments.data ?? []).filter((a) => a.day === today).length,
        messages: messages.count ?? 0,
      };
    },
  });

  const { data: activeSites } = useQuery({
    queryKey: ["dashboard-sites"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sites")
        .select("id, name, status, color")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const groups: Group[] = [
    {
      title: "Baustelle",
      color: "bg-brand",
      tiles: [
        { to: "/app/baustellen", label: "Baustellen", icon: Briefcase, desc: "Aktive Projekte & Chat", badge: stats?.activeSites },
        { to: "/app/plan", label: "Wochenplanung", icon: Calendar, desc: "Wer arbeitet wann wo?", badge: stats?.planToday },
      ],
    },
    {
      title: "Zeit & Abwesenheit",
      color: "bg-emerald-500",
      tiles: [
        { to: "/app/zeiten", label: "Zeiterfassung", icon: Clock, desc: "Stempeln, Pausen, Bericht", highlight: true },
        { to: "/app/abwesenheiten", label: "Abwesenheiten", icon: UserX, desc: "Urlaub, Krank, Anträge", badge: stats?.openAbsences, badgeTone: "warn" },
      ],
    },
    {
      title: "Betrieb",
      color: "bg-slate-500",
      tiles: [
        { to: "/app/mitarbeiter", label: "Mitarbeiter", icon: UsersRound, desc: "Stammdaten, Qualifikationen" },
        { to: "/app/team", label: "Rollen & Zugänge", icon: Settings, desc: "Berechtigungen verwalten" },
        { to: "/app/einstellungen", label: "Einstellungen", icon: Settings, desc: "Betrieb & Profil" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-primary to-navy p-5 text-white shadow-lift sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">Willkommen zurück</div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{profile?.full_name ?? "Meister"}</h1>
          <div className="text-sm text-white/70">
            {profile?.tenants?.name}
            {role ? ` · ${ROLE_LABELS[role] ?? role}` : ""}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:text-right">
          <MiniStat label="Aktive Baustellen" value={stats?.activeSites ?? 0} />
          <MiniStat label="Heute geplant" value={stats?.planToday ?? 0} />
          <MiniStat label="Abwesenheits-Anträge" value={stats?.openAbsences ?? 0} tone={stats?.openAbsences ? "warn" : undefined} />
        </div>
      </div>

      {/* Module tiles */}
      {groups.map((group) => (
        <section key={group.title}>
          <div className="mb-3 flex items-center gap-3">
            <div className={`h-6 w-1.5 rounded-full ${group.color}`} />
            <h2 className="font-display text-lg font-bold">{group.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.tiles.map((t) => (
              <ModuleTile key={t.to} tile={t} />
            ))}
          </div>
        </section>
      ))}

      {/* Live board */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Briefcase className="h-4 w-4 text-brand" /> Aktive Baustellen
            </h2>
            <Link to="/app/baustellen" className="text-xs text-brand hover:underline">Alle ansehen</Link>
          </div>
          {activeSites && activeSites.length > 0 ? (
            <ul className="divide-y divide-border">
              {activeSites.map((s) => (
                <li key={s.id}>
                  <Link to="/app/baustellen" className="flex items-center gap-3 py-3 hover:text-brand">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color ?? "#F26A21" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.status ?? "—"}</div>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">Noch keine Baustellen.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MessageSquare className="h-4 w-4 text-brand" /> Baustellen-Chat
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Jede Baustelle hat einen WhatsApp-ähnlichen Chat. Nachrichten, Fotos und Sprachnotizen bleiben zusammen mit dem Projekt.
          </p>
          <div className="mt-4 text-xs text-muted-foreground">Gesamt-Nachrichten: {stats?.messages ?? 0}</div>
        </div>
      </div>

      {/* Tipp */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-semibold">Neu in MeisterMe</div>
          <div className="text-muted-foreground">
            Rollen sind jetzt frei konfigurierbar (Aktion × Ressource). Standard-Rollen sind Unternehmensinhaber, Administrator,
            Personalverwaltung, Buchhaltung, Bauleiter, Vorarbeiter, Mitarbeiter.
          </div>
        </div>
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
