import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
import { useProfile, useMyRole, type AppRole } from "@/lib/handwerk";
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
  { to: "/app/einstellungen", label: "Einstellungen", icon: Settings, roles: ALL_ROLES },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const role = useMyRole();
  const navigate = useNavigate();

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
          <Link to="/app" className="flex items-center gap-2 pr-2">
            <Logo variant="light" />
          </Link>

          {!isHome && (
            <>
              <span className="hidden text-sidebar-foreground/40 md:inline">/</span>
              <Link
                to="/app"
                className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white md:inline-flex"
              >
                <Home className="h-4 w-4" /> Dashboard
              </Link>
              {currentModule && (
                <>
                  <span className="hidden text-sidebar-foreground/40 md:inline">/</span>
                  <span className="hidden items-center gap-1.5 text-sm font-semibold text-white md:inline-flex">
                    <currentModule.icon className="h-4 w-4 text-brand" />
                    {currentModule.label}
                  </span>
                </>
              )}
            </>
          )}

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
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                {(profile?.full_name ?? "?").slice(0, 2).toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-semibold">{profile?.full_name}</div>
                <div className="text-xs font-normal text-muted-foreground">{profile?.tenants?.name}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/einstellungen"><Settings className="mr-2 h-4 w-4" /> Einstellungen</Link>
              </DropdownMenuItem>
              {role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/app/team"><UsersRound className="mr-2 h-4 w-4" /> Team</Link>
                </DropdownMenuItem>
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
