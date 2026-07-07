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
  Menu,
  LogOut,
  Plus,
  X,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useProfile, useMyRole, type AppRole } from "@/lib/handwerk";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean; highlight?: boolean };

type NavItemFull = NavItem & { roles?: AppRole[] };

const ALL_ROLES: AppRole[] = ["admin", "buero", "bauleiter", "monteur", "azubi"];

const nav: NavItemFull[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, roles: ALL_ROLES },
  { to: "/app/kunden", label: "Kunden", icon: Users, roles: ["admin", "buero", "bauleiter"] },
  { to: "/app/projekte", label: "Projekte", icon: Briefcase, roles: ALL_ROLES },
  { to: "/app/angebote", label: "Angebote", icon: FileText, roles: ["admin", "buero", "bauleiter"] },
  { to: "/app/aufmass", label: "Aufmaß", icon: Ruler, roles: ["admin", "buero", "bauleiter", "monteur"] },
  { to: "/app/berichte", label: "Einsatzberichte", icon: ClipboardList, roles: ALL_ROLES },
  { to: "/app/ki-sprachbericht", label: "KI-Sprachbericht", icon: Mic, highlight: true, roles: ALL_ROLES },
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
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const role = useMyRole();
  const navigate = useNavigate();

  const visibleNav = nav.filter((n) => !role || !n.roles || n.roles.includes(role));
  const mobileNav = visibleNav.slice(0, 5);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    navigate({ to: "/auth" });
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");


  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Logo variant="light" />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to as never}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(n.to, n.exact)
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-white"
              }`}
            >
              <n.icon className={`h-4 w-4 ${"highlight" in n && n.highlight ? "text-brand" : ""}`} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 rounded-lg bg-sidebar-accent/60 p-3 text-xs">
            <div className="font-semibold text-white">
              {profile?.tenants?.name ?? "Mein Betrieb"}
            </div>
            <div className="text-sidebar-foreground/70">{profile?.full_name}</div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
              <Logo variant="light" />
              <button onClick={() => setOpen(false)} className="text-white"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to as never}
                  onClick={() => setOpen(false)}
                  className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive(n.to, n.exact)
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/75"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
            </nav>
            <button onClick={signOut} className="border-t border-sidebar-border px-5 py-4 text-left text-sm text-white">
              <LogOut className="mr-2 inline h-4 w-4" /> Abmelden
            </button>
          </aside>
        </div>
      )}

      {/* Topbar */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <div className="flex-1" />
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link to={"/app/berichte/neu" as never}><Plus className="mr-1 h-4 w-4" /> Bericht</Link>
          </Button>
          <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to={"/app/projekte/neu" as never}><Plus className="mr-1 h-4 w-4" /> Projekt</Link>
          </Button>
        </header>

        <main className="p-4 pb-24 lg:p-8 lg:pb-8">{children ?? <Outlet />}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background lg:hidden">
          {mobileNav.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to as never}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-5 w-5" />
                {n.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
