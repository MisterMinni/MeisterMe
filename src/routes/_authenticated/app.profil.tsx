import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  useProfile,
  useMyRole,
  useSession,
  useIsAdmin,
  ROLE_LABELS,
} from "@/lib/handwerk";
import {
  ChevronRight,
  UserRound,
  FileText,
  Palmtree,
  Settings,
  LogOut,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/profil")({
  head: () => ({ meta: [{ title: "Mein Profil – MeisterMe" }] }),
  component: Profil,
});

function Profil() {
  const { data: profile, refetch } = useProfile();
  const { data: session } = useSession();
  const role = useMyRole();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);

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
  const roleLabel = role ? ROLE_LABELS[role] ?? role : "Kein Zugriff";

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Abgemeldet");
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Profil"
        action={
          <Button variant="ghost" onClick={() => setEditOpen(true)} className="text-brand">
            <Pencil className="mr-1 h-4 w-4" /> Bearbeiten
          </Button>
        }
      />

      <section className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-brand-foreground shadow-md ring-4 ring-brand/10">
          {initials}
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">{displayName}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
            {roleLabel}
          </span>
          {profile?.tenants?.name && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {profile.tenants.name}
            </span>
          )}
        </div>
      </section>

      <div className="mt-4 space-y-2">
        <ProfileTile
          icon={UserRound}
          label="Persönliche Daten"
          onClick={() => setEditOpen(true)}
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

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
        }}
        onSaved={() => {
          setEditOpen(false);
          refetch();
        }}
        profileId={profile?.id ?? null}
      />
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

function EditDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
  profileId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: { full_name: string; phone: string };
  onSaved: () => void;
  profileId: string | null;
}) {
  const [full_name, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profileId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name, phone })
      .eq("id", profileId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Persönliche Daten</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={full_name} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
