import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useProfile, useMyRole, useSession, ROLE_LABELS } from "@/lib/handwerk";
import { Mail, Building2, ShieldCheck, User, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/profil")({
  head: () => ({ meta: [{ title: "Mein Profil – MeisterMe" }] }),
  component: Profil,
});

function Profil() {
  const { data: profile } = useProfile();
  const { data: session } = useSession();
  const role = useMyRole();

  const email = session?.user?.email ?? "";
  const displayName = profile?.full_name?.trim() || email || "Konto";
  const initials =
    (profile?.full_name?.trim()
      ? profile.full_name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("")
      : email.slice(0, 2)
    ).toUpperCase() || "?";
  const roleLabel = role ? ROLE_LABELS[role] : "Kein Zugriff";

  return (
    <div>
      <PageHeader
        title="Mein Profil"
        subtitle="Deine Kontakt- und Betriebsinformationen."
        action={
          <Button asChild variant="outline">
            <Link to="/app"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
          </Button>
        }
      />

      <div className="mx-auto grid max-w-3xl gap-6">
        <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-brand-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold">{displayName}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                {roleLabel}
              </span>
              {profile?.tenants?.name && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {profile.tenants.name}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 font-display font-semibold">
              <User className="h-4 w-4 text-brand" /> Kontakt
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">E-Mail</div>
                  <div className="font-medium">{email || "–"}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium">{profile?.full_name?.trim() || "–"}</div>
                </div>
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 font-display font-semibold">
              <Building2 className="h-4 w-4 text-brand" /> Betrieb
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Firmenname</div>
                  <div className="font-medium">{profile?.tenants?.name || "–"}</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Rolle</div>
                  <div className="font-medium">{roleLabel}</div>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
