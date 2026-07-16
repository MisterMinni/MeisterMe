import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  Calendar,
  UsersRound,
  Settings,
  UserX,
  Search,
  Users,
  ArrowLeft,
} from "lucide-react";

import { useProfile, useMyRole, useSession, useIsAdmin, ROLE_LABELS } from "@/lib/handwerk";
import { PageHeaderProvider, usePageHeader } from "@/components/page-header-context";

import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean; adminOnly?: boolean };

const modules: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/baustellen", label: "Baustellen", icon: Briefcase },
  { to: "/app/plan", label: "Wochenplanung", icon: Calendar },
  { to: "/app/zeiten", label: "Zeiterfassung", icon: Clock },
  { to: "/app/abwesenheiten", label: "Abwesenheiten", icon: UserX },
  { to: "/app/mitarbeiter", label: "Mitarbeiter", icon: Users, adminOnly: true },
  { to: "/app/team", label: "Rollen & Zugänge", icon: UsersRound, adminOnly: true },
  { to: "/app/einstellungen", label: "Einstellungen", icon: Settings, adminOnly: true },
];

const EXTRA_TITLES: Record<string, string> = {
  "/app/profil": "Profil",
};

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <PageHeaderProvider>
      <AppShellInner>{children}</AppShellInner>
    </PageHeaderProvider>
  );
}

function AppShellInner({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const { data: session } = useSession();
  const role = useMyRole();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const override = usePageHeader();

  const email = session?.user?.email ?? "";
  const displayName = profile?.full_name?.trim() || email || "Konto";
  const initials =
    (profile?.full_name?.trim()
      ? profile.full_name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("")
      : email.slice(0, 2)
    ).toUpperCase() || "?";
  const roleLabel = role ? ROLE_LABELS[role] ?? role : "Kein Zugriff";

  const visibleModules = modules.filter((n) => !n.adminOnly || isAdmin);
  const isHome = pathname === "/app" || pathname === "/app/";

  const currentModule = visibleModules
    .filter((m) => !m.exact)
    .sort((a, b) => b.to.length - a.to.length)
    .find((m) => pathname === m.to || pathname.startsWith(m.to + "/"));

  const isModuleRoot = currentModule ? pathname === currentModule.to : false;
  const defaultTitle =
    override.title ??
    EXTRA_TITLES[pathname] ??
    (currentModule ? currentModule.label : "");
  const defaultBackTo =
    override.backTo ??
    (currentModule && !isModuleRoot ? currentModule.to : "/app");

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground shadow-sm">
        {isHome ? (
          <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
            <GlobalSearch modules={visibleModules} onNavigate={(to) => navigate({ to: to as never })} />

            <div className="flex-1" />

            <Link
              to="/app/profil"
              className="group flex items-center gap-2 rounded-full py-1 pl-1 text-left transition md:pr-3 md:hover:bg-white/10"
              aria-label="Mein Profil"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-[#005aab] shadow-[0_0_0_3px_rgba(255,255,255,0.35),0_6px_20px_-4px_rgba(0,0,0,0.35)] ring-2 ring-white transition group-hover:scale-105">
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#005aab] bg-emerald-400" />
              </span>
              <span className="hidden min-w-0 flex-col leading-tight md:flex">
                <span className="truncate text-sm font-semibold text-white">{displayName}</span>
                <span className="truncate text-[11px] text-white/70">
                  {roleLabel}{profile?.tenants?.name ? ` · ${profile.tenants.name}` : ""}
                </span>
              </span>
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid h-14 max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-2 px-2 lg:px-4">
            <Link
              to={defaultBackTo as never}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
              aria-label="Zurück"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="truncate text-center text-base font-semibold text-white">
              {defaultTitle}
            </h1>
            <span className="h-10 w-10" />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1600px] p-4 pb-8 lg:p-8">{children ?? <Outlet />}</main>
    </div>
  );
}

const SEARCH_ALIASES: Record<string, string[]> = {
  "/app": ["start", "home", "übersicht"],
  "/app/baustellen": ["baustelle", "projekt", "auftrag", "job", "chat"],
  "/app/plan": ["plan", "wochenplanung", "einsatz", "kalender"],
  "/app/zeiten": ["zeit", "stunden", "stempel", "arbeitszeit"],
  "/app/abwesenheiten": ["urlaub", "krank", "abwesenheit", "antrag"],
  "/app/mitarbeiter": ["mitarbeiter", "personal", "stammdaten"],
  "/app/team": ["team", "rollen", "zugang", "berechtigungen"],
  "/app/einstellungen": ["einstellung", "settings", "betrieb"],
};

function GlobalSearch({
  modules,
  onNavigate,
}: {
  modules: NavItem[];
  onNavigate: (to: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = modules.filter((m) => m.to !== "/app");
    if (!term) return base.slice(0, 8);
    return base
      .map((m) => {
        const hay = [m.label.toLowerCase(), ...(SEARCH_ALIASES[m.to] ?? [])].join(" ");
        const score = hay.includes(term) ? (m.label.toLowerCase().startsWith(term) ? 0 : 1) : 99;
        return { m, score };
      })
      .filter((x) => x.score < 99)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((x) => x.m);
  }, [q, modules]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function pick(to: string) {
    onNavigate(to);
    setQ("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/30 px-3 py-1.5 focus-within:border-brand/60 focus-within:bg-sidebar-accent/60">
        <Search className="h-4 w-4 text-sidebar-foreground/70" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) setOpen(true);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && suggestions[active]) {
              e.preventDefault();
              pick(suggestions[active].to);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Suchen …"
          className="w-full bg-transparent text-sm text-white placeholder:text-sidebar-foreground/60 focus:outline-none"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <ul className="max-h-80 overflow-auto py-1">
            {suggestions.map((m, i) => (
              <li key={m.to}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(m.to);
                  }}
                  className={
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm " +
                    (i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60")
                  }
                >
                  <m.icon className="h-4 w-4 text-brand" />
                  <span className="flex-1 truncate">{m.label}</span>
                  <span className="text-[11px] text-muted-foreground">{m.to.replace("/app/", "")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
