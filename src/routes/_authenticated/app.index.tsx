import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  Briefcase,
  Clock,
  Calendar,
  UserX,
  UsersRound,
  Settings,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";


export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard – MeisterMe" }] }),
  component: Dashboard,
});

type Tone = "blue" | "green" | "slate";

type Tile = {
  to: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  badge?: number;
  badgeTone?: "brand" | "warn";
  highlight?: boolean;
};

type Group = { title: string; tone: Tone; tiles: Tile[] };

const TONES: Record<
  Tone,
  { bar: string; iconBg: string; iconFg: string; chevron: string; highlightBorder: string; highlightBg: string }
> = {
  blue: {
    bar: "bg-[#005aab]",
    iconBg: "bg-[#005aab]/10",
    iconFg: "text-[#005aab]",
    chevron: "text-[#005aab]",
    highlightBorder: "border-[#005aab]/40",
    highlightBg: "bg-[#005aab]/5",
  },
  green: {
    bar: "bg-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconFg: "text-emerald-600",
    chevron: "text-emerald-600",
    highlightBorder: "border-emerald-500/40",
    highlightBg: "bg-emerald-500/5",
  },
  slate: {
    bar: "bg-slate-400",
    iconBg: "bg-slate-200",
    iconFg: "text-slate-600",
    chevron: "text-slate-500",
    highlightBorder: "border-slate-300",
    highlightBg: "bg-slate-100",
  },
};

function ModuleTile({ tile, tone }: { tile: Tile; tone: Tone }) {
  const { icon: Icon, badge, badgeTone } = tile;
  const t = TONES[tone];
  return (
    <Link
      to={tile.to as never}
      className={`group relative flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift ${
        tile.highlight ? `${t.highlightBorder} ${t.highlightBg}` : "border-border"
      }`}
    >
      {badge !== undefined && badge > 0 && (
        <span
          className={`absolute right-3 top-3 min-w-[24px] rounded-full px-2 py-0.5 text-center text-xs font-bold ${
            badgeTone === "warn" ? "bg-destructive text-destructive-foreground" : "bg-[#005aab] text-white"
          }`}
        >
          {badge}
        </span>
      )}
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${t.iconBg} ${t.iconFg} transition group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-display text-base font-semibold leading-tight text-foreground">{tile.label}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{tile.desc}</div>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 ${t.chevron}`} />
      </div>
    </Link>
  );
}


function Dashboard() {


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


  const groups: Group[] = [
    {
      title: "Baustelle",
      tone: "blue",
      tiles: [
        { to: "/app/baustellen", label: "Baustellen", icon: Briefcase, desc: "Aktive Projekte & Chat", badge: stats?.activeSites },
        { to: "/app/plan", label: "Wochenplanung", icon: Calendar, desc: "Wer arbeitet wann wo?", badge: stats?.planToday },
      ],
    },
    {
      title: "Zeit & Abwesenheit",
      tone: "green",
      tiles: [
        { to: "/app/zeiten", label: "Zeiterfassung", icon: Clock, desc: "Stempeln, Pausen, Bericht", highlight: true },
        { to: "/app/abwesenheiten", label: "Abwesenheiten", icon: UserX, desc: "Urlaub, Krank, Anträge", badge: stats?.openAbsences, badgeTone: "warn" },
      ],
    },
    {
      title: "Betrieb",
      tone: "slate",
      tiles: [
        { to: "/app/mitarbeiter", label: "Mitarbeiter", icon: UsersRound, desc: "Stammdaten, Qualifikationen" },
        { to: "/app/team", label: "Rollen & Zugänge", icon: Settings, desc: "Berechtigungen verwalten" },
        { to: "/app/einstellungen", label: "Einstellungen", icon: Settings, desc: "Betrieb & Profil" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.title}>
          <div className="mb-3 flex items-center gap-3">
            <div className={`h-6 w-1.5 rounded-full ${TONES[group.tone].bar}`} />
            <h2 className="font-display text-lg font-bold text-foreground">{group.title}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.tiles.map((t) => (
              <ModuleTile key={t.to} tile={t} tone={group.tone} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}



