import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type ComponentType } from "react";
import {
  useProfile,
  useSession,
  useIsAdmin,
} from "@/lib/handwerk";

import {
  ChevronRight,
  UserRound,
  FileText,
  Palmtree,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/profil")({
  head: () => ({ meta: [{ title: "Mein Profil – MeisterMe" }] }),
  component: Profil,
});

function Profil() {
  const { data: profile } = useProfile();
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const email = session?.user?.email ?? "";
  const displayName = profile?.full_name?.trim() || email || "Konto";
  const initials =
    (profile?.full_name?.trim()
      ? profile.full_name
          .trim()
          .split(/\s+/)
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
      : email.slice(0, 2)
    ).toUpperCase() || "?";
  

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto max-w-xl">
      <section className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-brand-foreground shadow-md ring-4 ring-brand/10">
          {initials}
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        {profile?.phone && (
          <p className="text-sm text-muted-foreground">{profile.phone}</p>
        )}
        {profile?.tenants?.name && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {profile.tenants.name}
            </span>
          </div>
        )}
      </section>


      <div className="mt-4 space-y-2">
        <ProfileTile
          icon={UserRound}
          label="Persönliche Daten"
          subtitle="Nur Ansicht – Änderungen über den Betriebsadmin"
          onClick={() =>
            toast.info("Änderungen bitte über den Betriebsadmin anfragen.")
          }
        />
        <ProfileTile
          icon={FileText}
          label="Dokumente"
          subtitle="Vertrag, Lohnabrechnungen"
          onClick={() => toast.info("Dokumente sind bald verfügbar.")}
        />
        <ProfileTile
          icon={Palmtree}
          label="Urlaub & Abwesenheiten"
          subtitle="Anträge & Übersicht"
          to="/app/abwesenheiten"
        />
        {isAdmin && (
          <ProfileTile
            icon={Settings}
            label="Einstellungen"
            subtitle="Betrieb & Rollen"
            to="/app/einstellungen"
          />
        )}
      </div>

      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-semibold text-foreground shadow-card transition hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>
    </div>
  );
}

function ProfileTile({
  icon: Icon,
  label,
  subtitle,
  to,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  subtitle?: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-card transition hover:bg-secondary/60">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} className="block w-full">
      {inner}
    </button>
  );
}
