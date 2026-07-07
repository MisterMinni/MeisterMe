import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Ruler,
  ClipboardList,
  Clock,
  Package,
  Camera,
  Mic,
  Receipt,
  Calendar,
  Mail,
  FolderOpen,
  Building2,
  Plug,
  Settings,
  Calculator,
  LogOut,
  Plus,
  UsersRound,
  ChevronDown,
  Home,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useProfile, useMyRole, useSession, ROLE_LABELS, type AppRole } from "@/lib/handwerk";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean; roles?: AppRole[] };

const ALL_ROLES: AppRole[] = ["admin", "buero", "bauleiter", "monteur", "azubi"];

// Full module list (used in menu + breadcrumb lookup)
const modules: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, roles: ALL_ROLES },
  { to: "/app/kunden", label: "Kunden", icon: Users, roles: ["admin", "buero", "bauleiter"] },
  { to: "/app/projekte", label: "Projekte", icon: Briefcase, roles: ALL_ROLES },
  { to: "/app/angebote", label: "Angebote", icon: FileText, roles: ["admin", "buero", "bauleiter"] },
  { to: "/app/aufmass", label: "Aufmaß", icon: Ruler, roles: ["admin", "buero", "bauleiter", "monteur"] },
  { to: "/app/berichte", label: "Einsatzberichte", icon: ClipboardList, roles: ALL_ROLES },
  { to: "/app/ki-sprachbericht", label: "KI-Sprachbericht", icon: Mic, roles: ALL_ROLES },
  { to: "/app/zeiten", label: "Zeiterfassung", icon: Clock, roles: ALL_ROLES },
  { to: "/app/material", label: "Material", icon: Package, roles: ALL_ROLES },
  { to: "/app/fotos", label: "Fotos", icon: Camera, roles: ALL_ROLES },
  { to: "/app/aufgaben", label: "Aufgaben", icon: Calendar, roles: ALL_ROLES },
  { to: "/app/rechnungsgrundlagen", label: "Rechnungen", icon: Receipt, roles: ["admin", "buero"] },
  { to: "/app/kalkulation", label: "Kalkulation", icon: Calculator, roles: ["admin", "buero", "bauleiter"] },
  { to: "/app/kommunikation", label: "Kommunikation", icon: Mail, roles: ["admin", "buero", "bauleiter"] },
  { to: "/app/dokumente", label: "Dokumente", icon: FolderOpen, roles: ALL_ROLES },
  { to: "/app/buero", label: "Büro", icon: Building2, roles: ["admin", "buero"] },
  { to: "/app/team", label: "Team", icon: UsersRound, roles: ["admin"] },
  { to: "/app/integrationen/outlook", label: "Outlook", icon: Plug, roles: ["admin", "buero"] },
  { to: "/app/einstellungen", label: "Einstellungen", icon: Settings, roles: ["admin"] },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const { data: session } = useSession();
  const role = useMyRole();
  const navigate = useNavigate();

  const email = session?.user?.email ?? "";
  const displayName = profile?.full_name?.trim() || email || "Konto";
  const initials =
    (profile?.full_name?.trim()
      ? profile.full_name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("")
      : email.slice(0, 2)
    ).toUpperCase() || "?";
  const roleLabel = role ? ROLE_LABELS[role] : "Kein Zugriff";

  const visibleModules = modules.filter((n) => !role || !n.roles || n.roles.includes(role));
  const isHome = pathname === "/app" || pathname === "/app/";
  const currentModule =
    !isHome
      ? visibleModules
          .filter((m) => !m.exact)
          .sort((a, b) => b.to.length - a.to.length)
          .find((m) => pathname === m.to || pathname.startsWith(m.to + "/"))
      : undefined;

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
          <GlobalSearch modules={visibleModules} onNavigate={(to) => navigate({ to: to as never })} />

          <div className="flex-1" />

          {/* Module menu */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-1.5 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Module</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Alle Module</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {visibleModules.map((m) => (
                <DropdownMenuItem key={m.to} asChild>
                  <Link to={m.to as never} className="flex items-center gap-2">
                    <m.icon className="h-4 w-4 text-brand" />
                    {m.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild size="sm" className="hidden bg-brand text-brand-foreground hover:bg-brand/90 md:inline-flex">
            <Link to={"/app/projekte/neu" as never}><Plus className="mr-1 h-4 w-4" /> Projekt</Link>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full border border-sidebar-border/50 py-1 pl-1 pr-2 text-left transition hover:bg-sidebar-accent md:pr-3"
                aria-label="Profilmenü öffnen"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                  {initials}
                </span>
                <span className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="truncate text-sm font-semibold text-white">{displayName}</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/70">
                    {roleLabel}{profile?.tenants?.name ? ` · ${profile.tenants.name}` : ""}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-sidebar-foreground/70 md:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{displayName}</div>
                    {email && <div className="truncate text-xs font-normal text-muted-foreground">{email}</div>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-secondary/60 px-2 py-1.5 text-xs font-normal">
                  <span className="text-muted-foreground">{profile?.tenants?.name ?? "Betrieb"}</span>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand">
                    {roleLabel}
                  </span>
                </div>
              </DropdownMenuLabel>
              {role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/einstellungen"><Settings className="mr-2 h-4 w-4" /> Einstellungen</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/app/team"><UsersRound className="mr-2 h-4 w-4" /> Team</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Back-to-dashboard bar on non-home pages (mobile) */}
      {!isHome && (
        <div className="border-b border-border bg-background md:hidden">
          <Link
            to="/app"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-brand"
          >
            <Home className="h-4 w-4" />
            Zurück zum Dashboard
            {currentModule && (
              <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                <currentModule.icon className="h-3.5 w-3.5" />
                {currentModule.label}
              </span>
            )}
          </Link>
        </div>
      )}

      <main className="mx-auto max-w-[1600px] p-4 pb-8 lg:p-8">{children ?? <Outlet />}</main>
    </div>
  );
}

// Synonyms/keywords for smart search matches
const SEARCH_ALIASES: Record<string, string[]> = {
  "/app": ["start", "home", "übersicht"],
  "/app/kunden": ["kunde", "adressen", "kontakte", "auftraggeber"],
  "/app/projekte": ["projekt", "baustelle", "auftrag", "job"],
  "/app/angebote": ["angebot", "kostenvoranschlag", "kv", "offerte"],
  "/app/aufmass": ["aufmaß", "messung", "mengen"],
  "/app/berichte": ["bericht", "einsatz", "tagesbericht", "regie"],
  "/app/ki-sprachbericht": ["sprache", "diktat", "voice", "ai", "ki"],
  "/app/zeiten": ["zeit", "stunden", "stempel", "arbeitszeit"],
  "/app/material": ["material", "artikel", "lager", "bestellung"],
  "/app/fotos": ["foto", "bild", "dokumentation"],
  "/app/aufgaben": ["aufgabe", "todo", "kalender", "termin"],
  "/app/rechnungsgrundlagen": ["rechnung", "faktura", "abrechnung"],
  "/app/kalkulation": ["kalkulation", "preis", "kosten"],
  "/app/kommunikation": ["mail", "nachricht", "chat", "kommunikation"],
  "/app/dokumente": ["dokument", "datei", "pdf", "ablage"],
  "/app/buero": ["büro", "office", "verwaltung"],
  "/app/team": ["team", "mitarbeiter", "personal", "user"],
  "/app/integrationen/outlook": ["outlook", "email", "kalender", "microsoft"],
  "/app/einstellungen": ["einstellung", "settings", "betrieb", "profil"],
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
        const score = hay.includes(term)
          ? m.label.toLowerCase().startsWith(term)
            ? 0
            : 1
          : 99;
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
          placeholder="Suchen: Kunde, Projekt, Angebot …"
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
