import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase,
  Clock,
  Calendar,
  UserX,
  Package,
  FileText,
  ListChecks,
  Camera,
  MessageSquare,
  ChevronRight,
  MapPin,
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
};

type Group = { title: string; tiles: Tile[] };

function ModuleTile({ tile }: { tile: Tile }) {
  const { icon: Icon, badge } = tile;
  return (
    <Link
      to={tile.to as never}
      className="group relative flex min-h-[124px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-card transition active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lift"
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 min-w-[22px] rounded-full bg-brand px-1.5 py-0.5 text-center text-[11px] font-bold text-brand-foreground">
          {badge}
        </span>
      )}
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-brand shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-[15px] font-semibold leading-tight text-foreground">
          {tile.label}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{tile.desc}</div>
      </div>
    </Link>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="h-5 w-1 rounded-full bg-brand" />
      <h2 className="font-display text-[15px] font-bold uppercase tracking-wide text-foreground">
        {title}
      </h2>
    </div>
  );
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [sites, absences, assignments] = await Promise.all([
        supabase.from("sites").select("id, archived_at"),
        supabase.from("absences").select("id, status"),
        supabase.from("weekly_assignments").select("id, day"),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      return {
        activeSites: (sites.data ?? []).filter((s) => !s.archived_at).length,
        openAbsences: (absences.data ?? []).filter((a) => a.status === "eingereicht").length,
        planToday: (assignments.data ?? []).filter((a) => a.day === today).length,
      };
    },
  });

  const { data: myTodaySite } = useQuery({
    queryKey: ["dashboard-my-today"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("weekly_assignments")
        .select("site_id, sites(name, adresse, color)")
        .eq("user_id", u.user.id)
        .eq("day", today)
        .limit(1)
        .maybeSingle();
      return data as unknown as {
        site_id: string;
        sites: { name: string; adresse: string | null; color: string | null } | null;
      } | null;
    },
  });

  const groups: Group[] = [
    {
      title: "Baustelle",
      tiles: [
        {
          to: "/app/baustellen",
          label: "Baustellen",
          icon: Briefcase,
          desc: "Übersicht & Chat",
          badge: stats?.activeSites,
        },
        {
          to: "/app/zeiten",
          label: "Zeiterfassung",
          icon: Clock,
          desc: "Starten, Pausen, Ende",
        },
        {
          to: "/app/plan",
          label: "Wochenplanung",
          icon: Calendar,
          desc: "Meine Einsätze",
          badge: stats?.planToday,
        },
        {
          to: "/app/abwesenheiten",
          label: "Abwesenheiten",
          icon: UserX,
          desc: "Anträge & Übersicht",
          badge: stats?.openAbsences,
        },
        {
          to: "/app/materialien",
          label: "Materialien",
          icon: Package,
          desc: "Bestände & Anfragen",
        },
        {
          to: "/app/dokumente",
          label: "Dokumente",
          icon: FileText,
          desc: "Pläne, Dateien, Infos",
        },
        {
          to: "/app/aufgaben",
          label: "Aufgaben",
          icon: ListChecks,
          desc: "To-dos & Termine",
        },
        {
          to: "/app/fotos",
          label: "Fotos",
          icon: Camera,
          desc: "Bautagebuch",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {groups.map((group) => (
        <section key={group.title}>
          <SectionHeader title={group.title} />
          <div className="grid grid-cols-2 gap-3">
            {group.tiles.map((t) => (
              <ModuleTile key={t.to} tile={t} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <SectionHeader title="Schnellzugriff" />
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <Link
            to="/app/baustellen"
            className="flex items-center gap-3 border-b border-border px-4 py-3.5 transition hover:bg-secondary/50"
          >
            <MessageSquare className="h-4 w-4 text-brand" />
            <span className="flex-1 text-sm font-medium">Chat</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            to={myTodaySite ? "/app/baustellen/$id" : "/app/baustellen"}
            params={myTodaySite ? { id: myTodaySite.site_id } : undefined}
            className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-secondary/50"
          >
            <MapPin className="h-4 w-4 text-brand" />
            <span className="flex-1 text-sm font-medium">
              {myTodaySite?.sites?.name ? `Heute: ${myTodaySite.sites.name}` : "Meine Baustelle heute"}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    </div>
  );
}
